/**
 * UNILAG Identity, Credentials, Payment & Clearance Document Validator.
 * Strictly validates matriculation numbers, staff IDs, passwords, Remita transaction references,
 * and clearance document formats to protect application security and data integrity.
 *
 * Written with clear plain-language English comments so developers and non-technical stakeholders
 * can verify validation rules without needing deep technical jargon.
 */

import { DocumentType, DocumentValidationResult } from '../types/clearance';

/**
 * Validates UNILAG matriculation number, UTME registration number, or staff ID.
 *
 * @param identifier - Matric number, UTME reg number, or staff ID string
 * @returns Object with isValid boolean and optional error message
 */
export const validateMatricOrStaffNo = (identifier: string): { isValid: boolean; error?: string } => {
  const cleanId = identifier.trim().toUpperCase();

  if (!cleanId) {
    return { isValid: false, error: 'Matriculation or Staff Number is required.' };
  }

  // UNILAG Matriculation Number format: 9 digits (e.g., 190407088) or UTME temp reg (10 chars, e.g. 2024109882)
  const is9DigitMatric = /^\d{9}$/.test(cleanId);
  const is10DigitUTME = /^\d{10}$/.test(cleanId);
  // UNILAG Staff Number format: P/S/ or Staff prefix (e.g., STAFF/1042 or P1024)
  const isStaffNo = /^(STAFF\/|P\/|S\/|ST\/)?[A-Z0-9]{4,10}$/.test(cleanId);

  if (is9DigitMatric || is10DigitUTME || isStaffNo) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'Enter a valid 9-digit UNILAG Matric Number (e.g., 190407088), 10-digit UTME Reg Number, or Staff ID.'
  };
};

/**
 * Validates password length and structure.
 *
 * @param password - Account password string
 * @returns Object with isValid boolean and optional error message
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password || password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long.' };
  }
  return { isValid: true };
};

/**
 * Validates Remita RRR or payment transaction reference code format.
 * Standard Remita Retrieval Reference (RRR) is typically a 12-digit numeric code or 8-20 alphanumeric string.
 *
 * @param ref - Remita reference or RRR string
 * @returns Object with isValid boolean and optional error message
 */
export const validateRemitaRef = (ref: string): { isValid: boolean; error?: string } => {
  const cleanRef = ref.trim().toUpperCase();

  if (!cleanRef) {
    return { isValid: false, error: 'Remita payment reference or RRR is required.' };
  }

  // Check if reference matches 12-digit numeric RRR format or alphanumeric transaction reference (8 to 20 characters)
  const is12DigitRRR = /^\d{12}$/.test(cleanRef);
  const isAlphaNumRef = /^[A-Z0-9_-]{8,20}$/.test(cleanRef);

  if (is12DigitRRR || isAlphaNumRef) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'Enter a valid 12-digit Remita RRR (e.g., 123456789012) or valid payment reference.'
  };
};

/**
 * Validates clearance document file URLs, file extensions, and allowed document formats.
 * Ensures students submit supported file formats (PDF, JPG, PNG) and valid URL paths.
 *
 * @param fileUrl - The web URL or local file path provided by the student
 * @param documentType - Specific clearance document category (Medical Certificate, Passport Photo, Code of Conduct)
 * @returns DocumentValidationResult containing validity boolean, error message, and detected MIME type
 */
export const validateDocumentFile = (fileUrl: string, documentType: DocumentType): DocumentValidationResult => {
  const cleanUrl = fileUrl.trim();

  if (!cleanUrl) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid document file URL or path.'
    };
  }

  // Basic check for URL structure (http://, https://, file://, or relative/absolute path)
  const isUrlOrPath = /^(https?:\/\/|file:\/\/|\/|\.\/|[a-zA-Z0-9_-]+\.)/i.test(cleanUrl);
  if (!isUrlOrPath) {
    return {
      isValid: false,
      errorMessage: 'Document link must be a valid URL starting with http://, https://, or a valid file path.'
    };
  }

  // Extract file extension from URL
  const urlWithoutQuery = cleanUrl.split('?')[0].split('#')[0];
  const extensionMatch = urlWithoutQuery.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';

  // Enforce document type specific format rules
  if (documentType === 'PASSPORT_PHOTO') {
    // Passport photo must be an image format (JPG, JPEG, PNG)
    const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (extension && !allowedImageExtensions.includes(extension)) {
      return {
        isValid: false,
        errorMessage: 'Passport photograph must be an image file (.jpg, .jpeg, or .png).'
      };
    }
    const detectedMimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    return { isValid: true, detectedMimeType };
  } else if (documentType === 'MEDICAL_CERTIFICATE' || documentType === 'CODE_OF_CONDUCT') {
    // Medical certificate and code of conduct should be PDF or standard document images
    const allowedDocExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    if (extension && !allowedDocExtensions.includes(extension)) {
      return {
        isValid: false,
        errorMessage: `${documentType === 'MEDICAL_CERTIFICATE' ? 'Medical Certificate' : 'Code of Conduct Form'} must be a PDF document (.pdf) or clear image (.jpg, .png).`
      };
    }
    const detectedMimeType = extension === 'pdf' ? 'application/pdf' : (extension === 'png' ? 'image/png' : 'image/jpeg');
    return { isValid: true, detectedMimeType };
  }

  return { isValid: true, detectedMimeType: 'application/octet-stream' };
};
