// MainTabs.tsx — Bottom tab navigator.
// Sprint 2: Analytics and Journal tabs now point to real screens.

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen       from './HomeScreen';
import ScheduleScreen   from './ScheduleScreen';
import AnalyticsScreen  from './AnalyticsScreen';
import JournalScreen    from './JournalScreen';
import ShopScreen       from './ShopScreen';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, [string, string]> = {
  Home:      ['home',       'home-outline'],
  Schedule:  ['calendar',   'calendar-outline'],
  Analytics: ['bar-chart',  'bar-chart-outline'],
  Journal:   ['book',       'book-outline'],
  Shop:      ['storefront', 'storefront-outline'],
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   '#3C3489',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor:  '#F3F4F6',
          paddingBottom:    8,
          paddingTop:       4,
          height:          84,
        },
        tabBarLabelStyle: {
          fontSize:   11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = ICONS[route.name] ?? ['help', 'help-outline'];
          return (
            <Ionicons
              name={(focused ? active : inactive) as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}      />
      <Tab.Screen name="Schedule"  component={ScheduleScreen}  />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Journal"   component={JournalScreen}   />
      <Tab.Screen name="Shop"      component={ShopScreen}      />
    </Tab.Navigator>
  );
}
