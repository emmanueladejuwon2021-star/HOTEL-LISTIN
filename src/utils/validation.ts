/**
 * UNILAG Identity & Credentials Validator
 * Strictly validates matriculation numbers, staff IDs, and passwords.
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

export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password || password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long.' };
  }
  return { isValid: true };
};
