import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg.secondary,
          borderTopColor: COLORS.bg.accent,
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: COLORS.brand.orange,
        tabBarInactiveTintColor: COLORS.text.tertiary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💪</Text>,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
