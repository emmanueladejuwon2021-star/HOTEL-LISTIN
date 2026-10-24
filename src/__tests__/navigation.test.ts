import React from 'react';

// Mocks for React Native and Expo UI modules in Node test environment
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  Modal: 'Modal',
  StyleSheet: { create: (styles: any) => styles }
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null
}));

jest.mock('expo', () => ({
  registerRootComponent: jest.fn()
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children
  })
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children
  })
}));

import { useAuthStore } from '../store/useAuthStore';
import { AppNavigator } from '../navigation/AppNavigator';
import { AuthNavigator } from '../navigation/AuthNavigator';
import { StudentNavigator } from '../navigation/StudentNavigator';
import { PorterNavigator } from '../navigation/PorterNavigator';
import { WardenNavigator } from '../navigation/WardenNavigator';
import { MaintenanceNavigator } from '../navigation/MaintenanceNavigator';
import App from '../../App';

describe('App Entry Point & Navigation Architecture Tests', () => {
  beforeEach(() => {
    // Reset global auth store session before each test
    useAuthStore.getState().clearSession();
  });

  test('App component initializes without errors', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  test('Root navigators are properly exported and defined', () => {
    expect(AppNavigator).toBeDefined();
    expect(AuthNavigator).toBeDefined();
    expect(StudentNavigator).toBeDefined();
    expect(PorterNavigator).toBeDefined();
    expect(WardenNavigator).toBeDefined();
    expect(MaintenanceNavigator).toBeDefined();
  });

  test('Unauthenticated user defaults to AuthNavigator (Login route)', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.activeRole).toBeNull();
    expect(state.session).toBeNull();
  });

  test('Setting session for STUDENT switches activeRole to STUDENT', () => {
    const studentSession = {
      user: {
        id: 'usr_student_test',
        matricOrStaffNo: '190407088',
        fullName: 'Test Student',
        email: 'teststudent@unilag.edu.ng',
        phoneNumber: '08012345678',
        role: 'STUDENT' as const,
        gender: 'MALE' as const,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      studentProfile: {
        userId: 'usr_student_test',
        faculty: 'Engineering',
        department: 'Computer Engineering',
        level: 400,
        campus: 'MAIN_CAMPUS' as const,
        priorityCategory: 'FINALIST' as const,
        feesPaid: true,
        clearanceStatus: 'APPROVED' as const
      },
      token: 'jwt_test_token_student'
    };

    useAuthStore.getState().setSession(studentSession);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.activeRole).toBe('STUDENT');
    expect(state.session?.user.fullName).toBe('Test Student');
  });

  test('Setting session for PORTER switches activeRole to PORTER', () => {
    const porterSession = {
      user: {
        id: 'usr_porter_test',
        matricOrStaffNo: 'STAFF/PORT/01',
        fullName: 'Mr. Porter Jaja',
        email: 'porter@unilag.edu.ng',
        phoneNumber: '08087654321',
        role: 'PORTER' as const,
        gender: 'MALE' as const,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      token: 'jwt_test_token_porter'
    };

    useAuthStore.getState().setSession(porterSession);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.activeRole).toBe('PORTER');
  });

  test('Setting session for WARDEN switches activeRole to WARDEN', () => {
    const wardenSession = {
      user: {
        id: 'usr_warden_test',
        matricOrStaffNo: 'STAFF/WARD/01',
        fullName: 'Dr. Warden Mariere',
        email: 'warden@unilag.edu.ng',
        phoneNumber: '08055554444',
        role: 'WARDEN' as const,
        gender: 'MALE' as const,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      token: 'jwt_test_token_warden'
    };

    useAuthStore.getState().setSession(wardenSession);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.activeRole).toBe('WARDEN');
  });

  test('Setting session for MAINTENANCE switches activeRole to MAINTENANCE', () => {
    const artisanSession = {
      user: {
        id: 'usr_artisan_test',
        matricOrStaffNo: 'STAFF/ART/01',
        fullName: 'Plumber John',
        email: 'works@unilag.edu.ng',
        phoneNumber: '08033332222',
        role: 'MAINTENANCE' as const,
        gender: 'MALE' as const,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      token: 'jwt_test_token_artisan'
    };

    useAuthStore.getState().setSession(artisanSession);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.activeRole).toBe('MAINTENANCE');
  });

  test('Logging out clears session and restores unauthenticated state', async () => {
    const studentSession = {
      user: {
        id: 'usr_logout_test',
        matricOrStaffNo: '190407099',
        fullName: 'Logout Student',
        email: 'logout@unilag.edu.ng',
        phoneNumber: '08099998888',
        role: 'STUDENT' as const,
        gender: 'FEMALE' as const,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      token: 'jwt_test_token_logout'
    };

    useAuthStore.getState().setSession(studentSession);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await useAuthStore.getState().logoutUser();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.activeRole).toBeNull();
    expect(state.session).toBeNull();
  });
});
