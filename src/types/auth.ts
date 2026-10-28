export type UserRole = 'STUDENT' | 'PORTER' | 'WARDEN' | 'MAINTENANCE' | 'ADMIN';
export type Gender = 'MALE' | 'FEMALE';
export type Campus = 'MAIN_CAMPUS' | 'CMUL_IDI_ARABA';
export type PriorityCategory = 'FRESHER' | 'FINALIST' | 'SCHOLAR' | 'SPECIAL_NEEDS' | 'STALLITE';
export type ClearanceStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  matricOrStaffNo: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  gender: Gender;
  profilePhotoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface StudentProfile {
  userId: string;
  faculty: string;
  department: string;
  level: number;
  campus: Campus;
  priorityCategory: PriorityCategory;
  feesPaid: boolean;
  clearanceStatus: ClearanceStatus;
  residencyStatus?: string;
}

export interface AuthSession {
  user: User;
  studentProfile?: StudentProfile;
  token: string;
}
