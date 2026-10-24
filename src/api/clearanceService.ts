import { Client } from '@libsql/client';
import CryptoJS from 'crypto-js';
import { AuthService } from './authService';
import { EligibilityService } from './eligibilityService';
import { validateDocumentFile } from '../utils/validation';
import {
  ClearanceDocument,
  DigitalClearancePackage,
  DocumentUploadParams,
  DocumentType,
  ReviewClearanceParams
} from '../types/clearance';
import { ClearanceStatus } from '../types/auth';

/**
 * Service handling student digital document clearance uploads, document deletions, and warden approvals.
 * Interacts directly with Turso libSQL edge SQLite database following zero-mock principles.
 *
 * Fully commented with simple English descriptions so non-technical stakeholders and university officials
 * can easily understand how student document data is created, validated, updated, and deleted.
 */
export class ClearanceService {
  /**
   * Initializes the database schema for clearance document management.
   * Creates the clearance_documents table if it does not already exist and safely adds metadata columns.
   */
  public static async initializeSchema(): Promise<void> {
    await AuthService.initializeSchema();
    await EligibilityService.initializeSchema();
    const client = AuthService.getDbClient();

    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS clearance_documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        document_type TEXT CHECK(document_type IN ('MEDICAL_CERTIFICATE', 'PASSPORT_PHOTO', 'CODE_OF_CONDUCT')) NOT NULL,
        file_url TEXT NOT NULL,
        file_name TEXT NOT NULL,
        verification_status TEXT CHECK(verification_status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
        rejection_reason TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_size_bytes INTEGER DEFAULT 0,
        mime_type TEXT,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      args: []
    });

    // Safely attempt adding columns if table was created in an earlier migration
    const safeAddColumn = async (colDef: string) => {
      try {
        await client.execute({ sql: `ALTER TABLE clearance_documents ADD COLUMN ${colDef}`, args: [] });
      } catch (e) {
        // Column already exists or table already updated
      }
    };

    await safeAddColumn('file_size_bytes INTEGER DEFAULT 0');
    await safeAddColumn('mime_type TEXT');
    await safeAddColumn('notes TEXT');

    // Ensure index exists for fast query performance
    await client.execute({
      sql: `CREATE INDEX IF NOT EXISTS idx_clearance_docs_user ON clearance_documents(user_id)`,
      args: []
    });
  }

  /**
   * Uploads or replaces a student's clearance document in the database after validating format and URL.
   *
   * @param params Document upload details including file URL, name, optional file size, and notes
   * @returns Newly stored ClearanceDocument record
   */
  public static async uploadDocument(params: DocumentUploadParams): Promise<ClearanceDocument> {
    await ClearanceService.initializeSchema();
    const client = AuthService.getDbClient();

    // Perform validation check on document format and URL path
    const valResult = validateDocumentFile(params.fileUrl, params.documentType);
    if (!valResult.isValid) {
      throw new Error(valResult.errorMessage || 'Invalid clearance document file provided.');
    }

    if (!params.fileName.trim()) {
      throw new Error('Valid document file name is required.');
    }

    const detectedMime = params.mimeType || valResult.detectedMimeType || 'application/octet-stream';
    const estimatedSize = params.fileSizeBytes || 256000; // default estimated 250KB if size not supplied
    const notesContent = params.notes ? params.notes.trim() : null;

    // Check if document of this type already exists for student
    const existingResult = await client.execute({
      sql: `SELECT id FROM clearance_documents WHERE user_id = ? AND document_type = ?`,
      args: [params.userId, params.documentType]
    });

    const docId = existingResult.rows.length > 0
      ? String(existingResult.rows[0].id)
      : `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const nowIso = new Date().toISOString();

    if (existingResult.rows.length > 0) {
      // Replace existing record with new upload information
      await client.execute({
        sql: `UPDATE clearance_documents
              SET file_url = ?,
                  file_name = ?,
                  verification_status = 'PENDING',
                  rejection_reason = NULL,
                  file_size_bytes = ?,
                  mime_type = ?,
                  notes = ?,
                  uploaded_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [params.fileUrl, params.fileName, estimatedSize, detectedMime, notesContent, docId]
      });
    } else {
      // Insert brand new document record into database
      await client.execute({
        sql: `INSERT INTO clearance_documents (id, user_id, document_type, file_url, file_name, verification_status, rejection_reason, file_size_bytes, mime_type, notes, uploaded_at)
              VALUES (?, ?, ?, ?, ?, 'PENDING', NULL, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [docId, params.userId, params.documentType, params.fileUrl, params.fileName, estimatedSize, detectedMime, notesContent]
      });
    }

    // Reset student overall clearance status back to NOT_STARTED if previously REJECTED
    const profileRes = await client.execute({
      sql: `SELECT clearance_status FROM student_profiles WHERE user_id = ?`,
      args: [params.userId]
    });

    if (profileRes.rows.length > 0 && String(profileRes.rows[0].clearance_status) === 'REJECTED') {
      await client.execute({
        sql: `UPDATE student_profiles SET clearance_status = 'NOT_STARTED', clearance_rejection_reason = NULL WHERE user_id = ?`,
        args: [params.userId]
      });
    }

    return {
      id: docId,
      userId: params.userId,
      documentType: params.documentType,
      fileUrl: params.fileUrl,
      fileName: params.fileName,
      uploadedAt: nowIso,
      verificationStatus: 'PENDING',
      fileSizeBytes: estimatedSize,
      mimeType: detectedMime,
      notes: notesContent || undefined
    };
  }

  /**
   * Removes/deletes an uploaded clearance document from the database.
   * Resets overall clearance status to NOT_STARTED if package was PENDING or REJECTED.
   *
   * @param userId Student ID
   * @param documentId Document ID to delete
   * @returns Updated DigitalClearancePackage
   */
  public static async deleteDocument(userId: string, documentId: string): Promise<DigitalClearancePackage> {
    await ClearanceService.initializeSchema();
    const client = AuthService.getDbClient();

    // Check if document exists for student
    const checkResult = await client.execute({
      sql: `SELECT id, document_type FROM clearance_documents WHERE id = ? AND user_id = ?`,
      args: [documentId, userId]
    });

    if (checkResult.rows.length === 0) {
      throw new Error('Document not found or does not belong to student.');
    }

    // Delete record from database
    await client.execute({
      sql: `DELETE FROM clearance_documents WHERE id = ? AND user_id = ?`,
      args: [documentId, userId]
    });

    // Reset clearance status to NOT_STARTED if package was submitted or rejected
    await client.execute({
      sql: `UPDATE student_profiles
            SET clearance_status = 'NOT_STARTED',
                clearance_rejection_reason = NULL,
                clearance_certificate_hash = NULL
            WHERE user_id = ? AND clearance_status IN ('PENDING', 'REJECTED')`,
      args: [userId]
    });

    return await ClearanceService.getClearancePackage(userId);
  }

  /**
   * Retrieves all clearance documents uploaded by a student along with overall clearance status.
   *
   * @param userId Student ID
   * @returns Complete DigitalClearancePackage
   */
  public static async getClearancePackage(userId: string): Promise<DigitalClearancePackage> {
    await ClearanceService.initializeSchema();
    const client = AuthService.getDbClient();

    // Query student clearance status from student_profiles
    const profileResult = await client.execute({
      sql: `SELECT clearance_status, clearance_rejection_reason, clearance_certificate_hash
            FROM student_profiles WHERE user_id = ?`,
      args: [userId]
    });

    if (profileResult.rows.length === 0) {
      throw new Error('Student profile not found.');
    }

    const overallStatus = String(profileResult.rows[0].clearance_status || 'NOT_STARTED') as ClearanceStatus;
    const rejectionReason = profileResult.rows[0].clearance_rejection_reason ? String(profileResult.rows[0].clearance_rejection_reason) : undefined;
    const clearanceCertificateHash = profileResult.rows[0].clearance_certificate_hash ? String(profileResult.rows[0].clearance_certificate_hash) : undefined;

    // Fetch documents
    const docResult = await client.execute({
      sql: `SELECT id, user_id, document_type, file_url, file_name, verification_status, rejection_reason, uploaded_at, file_size_bytes, mime_type, notes
            FROM clearance_documents WHERE user_id = ?
            ORDER BY uploaded_at DESC`,
      args: [userId]
    });

    const documents: ClearanceDocument[] = docResult.rows.map(row => ({
      id: String(row.id),
      userId: String(row.user_id),
      documentType: String(row.document_type) as DocumentType,
      fileUrl: String(row.file_url),
      fileName: String(row.file_name),
      uploadedAt: String(row.uploaded_at || new Date().toISOString()),
      verificationStatus: String(row.verification_status || 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED',
      rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
      fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : undefined,
      mimeType: row.mime_type ? String(row.mime_type) : undefined,
      notes: row.notes ? String(row.notes) : undefined
    }));

    return {
      userId,
      overallStatus,
      documents,
      rejectionReason,
      clearanceCertificateHash
    };
  }

  /**
   * Submits the clearance package for warden review after checking all 3 required documents exist.
   * Updates student_profiles clearance_status to 'PENDING'.
   *
   * @param userId Student ID
   * @returns Updated DigitalClearancePackage
   */
  public static async submitClearancePackage(userId: string): Promise<DigitalClearancePackage> {
    await ClearanceService.initializeSchema();
    const client = AuthService.getDbClient();

    const pkg = await ClearanceService.getClearancePackage(userId);

    const docTypesUploaded = new Set(pkg.documents.map(d => d.documentType));
    const requiredTypes: DocumentType[] = ['MEDICAL_CERTIFICATE', 'PASSPORT_PHOTO', 'CODE_OF_CONDUCT'];

    const missingTypes = requiredTypes.filter(t => !docTypesUploaded.has(t));
    if (missingTypes.length > 0) {
      throw new Error(`Cannot submit clearance package. Missing required document(s): ${missingTypes.join(', ')}`);
    }

    // Update overall status to PENDING
    await client.execute({
      sql: `UPDATE student_profiles SET clearance_status = 'PENDING', clearance_rejection_reason = NULL WHERE user_id = ?`,
      args: [userId]
    });

    return await ClearanceService.getClearancePackage(userId);
  }

  /**
   * Warden or Admin clearance package review method.
   * Updates overall student clearance status and generates certificate hash on approval.
   *
   * @param params Review status and feedback parameters
   * @returns Updated DigitalClearancePackage
   */
  public static async reviewClearancePackage(params: ReviewClearanceParams): Promise<DigitalClearancePackage> {
    await ClearanceService.initializeSchema();
    const client = AuthService.getDbClient();

    let certHash: string | null = null;
    if (params.status === 'APPROVED') {
      const rawCertPayload = `UNILAG_DOC_CLEARANCE:${params.userId}:${Date.now()}`;
      certHash = `CERT-${CryptoJS.SHA256(rawCertPayload).toString().substring(0, 16).toUpperCase()}`;
    }

    const rejectionReason = params.status === 'REJECTED' ? (params.rejectionReason || 'Submitted clearance documents failed verification.') : null;

    await client.execute({
      sql: `UPDATE student_profiles
            SET clearance_status = ?,
                clearance_rejection_reason = ?,
                clearance_certificate_hash = ?
            WHERE user_id = ?`,
      args: [params.status, rejectionReason, certHash, params.userId]
    });

    // Update individual document statuses as well
    await client.execute({
      sql: `UPDATE clearance_documents SET verification_status = ?, rejection_reason = ? WHERE user_id = ?`,
      args: [params.status, rejectionReason, params.userId]
    });

    return await ClearanceService.getClearancePackage(params.userId);
  }
}
