// MainTabs.tsx — Bottom tab navigator with 5 tabs.
// Only Home and Schedule are functional in Phase 1.0.
// The other three show "Coming Soon" placeholders.

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './HomeScreen';
import ScheduleScreen from './ScheduleScreen';
import AnalyticsPlaceholder from './AnalyticsPlaceholder';
import JournalPlaceholder from './JournalPlaceholder';
import ShopPlaceholder from './ShopPlaceholder';

const Tab = createBottomTabNavigator();

// Tab icon names from the Ionicons library (bundled with Expo)
const ICONS: Record<string, [string, string]> = {
  Home:      ['home',           'home-outline'],
  Schedule:  ['calendar',       'calendar-outline'],
  Analytics: ['bar-chart',      'bar-chart-outline'],
  Journal:   ['book',           'book-outline'],
  Shop:      ['storefront',     'storefront-outline'],
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3C3489',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          paddingBottom: 8,
          paddingTop: 4,
          height: 84,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = ICONS[route.name] ?? ['help', 'help-outline'];
          const iconName = (focused ? active : inactive) as any;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen} />
      <Tab.Screen name="Schedule"  component={ScheduleScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsPlaceholder} />
      <Tab.Screen name="Journal"   component={JournalPlaceholder} />
      <Tab.Screen name="Shop"      component={ShopPlaceholder} />
    </Tab.Navigator>
  );
}
