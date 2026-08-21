import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { ReportScreen } from '../../features/incidents/screens/ReportScreen';
import { AlertsScreen } from '../../features/alerts/screens/AlertsScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../../features/auth/screens/RegisterScreen';
import { ForgotPasswordScreen } from '../../features/auth/screens/ForgotPasswordScreen';
import { AdminScreen } from '../../features/admin/screens/AdminScreen';
import { MapScreen } from '../../features/map/screens/MapScreen';
import { IncidentDetailScreen } from '../../features/incidents/screens/IncidentDetailScreen';
import { AlertDetailScreen } from '../../features/alerts/screens/AlertDetailScreen';
import { AdminGuard } from '../../features/admin/components/AdminGuard';
import { OperatorResponseScreen } from '../../features/operator/screens/OperatorResponseScreen';

import {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from './types';
import { theme } from '../../shared/theme/theme';
import { useAppStore } from '../../shared/state/appStore';

// ============================================================================
// NAVIGATORS
// ============================================================================

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// ============================================================================
// TAB ICONS
// Inline SVG-style icons using Unicode to avoid any native module issues
// while staying professional. A deliberate, minimal icon language.
// ============================================================================

type TabIconName =
  | 'Home'
  | 'Map'
  | 'Report'
  | 'Alerts'
  | 'Profile'
  | 'Admin';

function TabIcon({
  name,
  active,
}: {
  name: TabIconName;
  active: boolean;
}) {
  const icons: Record<TabIconName, string> = {
    Home: '⌂',
    Map: '◎',
    Report: '⊕',
    Alerts: '◑',
    Profile: '◯',
    Admin: '⬡',
  };

  // Use text characters that render cleanly on Android
  const color = active ? theme.colors.accent : theme.colors.textMuted;

  return (
    <View style={[styles.iconWrapper, active && styles.iconWrapperActive]}>
      <Text style={[styles.iconText, { color }]}>
        {icons[name]}
      </Text>
    </View>
  );
}

// ============================================================================
// CUSTOM TAB BAR
// ============================================================================

function CrisisTabBar({
  state,
  descriptors,
  navigation,
}: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          height: 56 + Math.max(insets.bottom, 8),
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <TabIcon
              name={route.name as TabIconName}
              active={isFocused}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused
                    ? theme.colors.accent
                    : theme.colors.textMuted,
                  fontWeight: isFocused ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// LOADING SCREEN
// Shown while session is being restored on app start
// ============================================================================

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingBrand}>CRISIS SYNC</Text>
      <Text style={styles.loadingText}>Initializing…</Text>
    </View>
  );
}

// ============================================================================
// ADMIN SCREEN WRAPPED WITH GUARD
// ============================================================================

function AdminScreenGuarded() {
  return (
    <AdminGuard>
      <AdminScreen />
    </AdminGuard>
  );
}

// ============================================================================
// MAIN TABS
// ============================================================================

function MainTabs({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CrisisTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarLabel: 'Map' }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{ tabBarLabel: 'Report' }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ tabBarLabel: 'Alerts' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminScreenGuarded}
          options={{ tabBarLabel: 'Admin' }}
        />
      )}
    </Tab.Navigator>
  );
}

// ============================================================================
// AUTH STACK
// ============================================================================

function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
    </AuthStack.Navigator>
  );
}

// ============================================================================
// MAIN TABS WRAPPER (receives isAdmin from store at render time)
// ============================================================================

function MainTabsConnected() {
  const { isAdmin } = useAppStore();
  return <MainTabs isAdmin={isAdmin} />;
}

// ============================================================================
// ROOT NAVIGATOR
// Reactive: switches between Auth and Main stacks based on session state
// ============================================================================

function RootNavigator() {
  const { session, authLoading } = useAppStore();

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        // User is authenticated — show Main tabs
        <>
          <Stack.Screen name="Main" component={MainTabsConnected} />
          <Stack.Screen
            name="IncidentDetail"
            component={IncidentDetailScreen}
            options={{
              headerShown: true,
              title: 'Incident Detail',
              headerStyle: { backgroundColor: theme.colors.card },
              headerTintColor: theme.colors.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="AlertDetail"
            component={AlertDetailScreen}
            options={{
              headerShown: true,
              title: 'Alert Detail',
              headerStyle: { backgroundColor: theme.colors.card },
              headerTintColor: theme.colors.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="OperatorResponses"
            component={OperatorResponseScreen}
            options={{
              headerShown: true,
              title: 'My Assignments',
              headerStyle: { backgroundColor: theme.colors.card },
              headerTintColor: theme.colors.text,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
        </>
      ) : (
        // User is not authenticated — show Auth screens
        <Stack.Screen name="Auth" component={AuthStackScreen} />
      )}
    </Stack.Navigator>
  );
}

// ============================================================================
// APP NAVIGATOR (exported)
// ============================================================================

export function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ---- Tab Bar ----
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // ---- Tab Icon ----
  iconWrapper: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapperActive: {
    backgroundColor: theme.colors.softBlue,
  },
  iconText: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
  },

  // ---- Loading ----
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingBrand: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.softBlue,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loadingText: {
    fontSize: theme.typography.body,
    color: theme.colors.white,
    opacity: 0.6,
  },
});
