import { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Parameter list interface for Authentication Stack screens.
 */
export type AuthStackParamList = {
  Login: undefined;
};

/**
 * Parameter list interface for Student Navigation Stack and Tabs.
 * Routes between Login → Eligibility → Balloting → Clearance → Payment → GatePass.
 */
export type StudentTabParamList = {
  Eligibility: undefined;
  Balloting: undefined;
  BallotingCountdown: undefined;
  BedspaceLock: { roomId?: string } | undefined;
  Clearance: undefined;
  Payment: undefined;
  GatePass: undefined;
};

/**
 * Parameter list interface for Porter / Gatekeeper Navigation.
 */
export type PorterStackParamList = {
  PorterDashboard: undefined;
  GateScanner: undefined;
  RoomAudit: undefined;
};

/**
 * Parameter list interface for Hall Warden / Student Affairs Navigation.
 */
export type WardenStackParamList = {
  WardenDashboard: undefined;
  ApprovalQueue: undefined;
  DisciplinaryFlags: undefined;
  DisciplinaryManagement: undefined;
};

/**
 * Parameter list interface for Maintenance Artisan Navigation.
 */
export type MaintenanceStackParamList = {
  ArtisanQueue: undefined;
  ProofOfFixUpload: { ticketId: string } | undefined;
};

/**
 * Root Navigation Parameter List combining Auth and Role-Based stacks.
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Student: NavigatorScreenParams<StudentTabParamList>;
  Porter: NavigatorScreenParams<PorterStackParamList>;
  Warden: NavigatorScreenParams<WardenStackParamList>;
  Maintenance: NavigatorScreenParams<MaintenanceStackParamList>;
};
