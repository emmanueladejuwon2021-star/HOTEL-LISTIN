/**
 * UNILAG Identity, Credentials & Payment Reference Validator.
 * Strictly validates matriculation numbers, staff IDs, passwords, and Remita transaction references.
 */

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
