import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Home, Dumbbell, BarChart3, Trophy, User } from 'lucide-react-native';

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
          tabBarIcon: ({ color, size }) => <Home color={color} size={size || 24} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size || 24} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size || 24} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="league"
        options={{
          title: 'League',
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size || 24} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size || 24} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
