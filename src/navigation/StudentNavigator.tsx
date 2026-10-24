import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity } from 'react-native';
import { StudentTabParamList } from './types';
import { EligibilityScreen } from '../screens/EligibilityScreen';
import { BallotingSelectorScreen } from '../screens/BallotingSelectorScreen';
import { BallotingCountdownScreen } from '../screens/BallotingCountdownScreen';
import { BedspaceLockScreen } from '../screens/BedspaceLockScreen';
import { ClearanceScreen } from '../screens/ClearanceScreen';
import { PaymentHoldScreen } from '../screens/PaymentHoldScreen';
import { StudentGatePassScreen } from '../screens/StudentGatePassScreen';
import { useAuthStore } from '../store/useAuthStore';

const Tab = createBottomTabNavigator<StudentTabParamList>();
const BallotingStackNav = createNativeStackNavigator();

/**
 * Nested stack navigator for Balloting workflow (Countdown → Selector → Bedspace Lock).
 */
const BallotingStackNavigator: React.FC = () => {
  return (
    <BallotingStackNav.Navigator screenOptions={{ headerShown: false }}>
      <BallotingStackNav.Screen name="BallotingSelector" component={BallotingSelectorScreen} />
      <BallotingStackNav.Screen name="BallotingCountdown" component={BallotingCountdownScreen} />
      <BallotingStackNav.Screen name="BedspaceLock" component={BedspaceLockScreen} />
    </BallotingStackNav.Navigator>
  );
};

/**
 * StudentNavigator Component.
 * Implements isolated navigation tab/stack tree for UNILAG Student role.
 * Guides student through the sequential accommodation workflow:
 * Eligibility → Balloting → Clearance → Payment → GatePass.
 * Provides clear labels, high-contrast badges, and sign-out controls for non-technical users.
 */
export const StudentNavigator: React.FC = () => {
  const { session, logoutUser } = useAuthStore();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#7A0000'
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18
        },
        tabBarActiveTintColor: '#7A0000',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          height: 64,
          paddingBottom: 10,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600'
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={logoutUser}
            className="mr-4 bg-red-800 px-3 py-1.5 rounded-lg active:opacity-80"
          >
            <Text className="text-white text-xs font-bold">Sign Out</Text>
          </TouchableOpacity>
        )
      }}
    >
      <Tab.Screen
        name="Eligibility"
        component={EligibilityScreen}
        options={{
          title: 'Eligibility',
          tabBarLabel: '1. Eligibility',
          tabBarIcon: ({ color }: { color: string }) => <Text style={{ color, fontSize: 16 }}>📋</Text>
        }}
      />
      <Tab.Screen
        name="Balloting"
        component={BallotingStackNavigator}
        options={{
          title: 'Hostel Balloting',
          tabBarLabel: '2. Balloting',
          tabBarIcon: ({ color }: { color: string }) => <Text style={{ color, fontSize: 16 }}>🎟️</Text>
        }}
      />
      <Tab.Screen
        name="Clearance"
        component={ClearanceScreen}
        options={{
          title: 'Digital Clearance',
          tabBarLabel: '3. Clearance',
          tabBarIcon: ({ color }: { color: string }) => <Text style={{ color, fontSize: 16 }}>📄</Text>
        }}
      />
      <Tab.Screen
        name="Payment"
        component={PaymentHoldScreen}
        options={{
          title: 'Fee Payment',
          tabBarLabel: '4. Payment',
          tabBarIcon: ({ color }: { color: string }) => <Text style={{ color, fontSize: 16 }}>💳</Text>
        }}
      />
      <Tab.Screen
        name="GatePass"
        component={StudentGatePassScreen}
        options={{
          title: 'Gate Pass',
          tabBarLabel: '5. Gate Pass',
          tabBarIcon: ({ color }: { color: string }) => <Text style={{ color, fontSize: 16 }}>📲</Text>
        }}
      />
    </Tab.Navigator>
  );
};
