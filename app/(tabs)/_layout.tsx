import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useContext } from 'react';
import { Platform } from 'react-native';
import { ThemeContext } from '../../utils/theme';

export default function TabLayout() {
  const { theme, isDarkMode } = useContext(ThemeContext);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.1,
          shadowRadius: 1,
          elevation: 1,
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          color: theme.text,
        },
        headerTitleAlign: 'center',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? (isDarkMode ? '#000000' : 'transparent') : theme.background,
          borderTopWidth: 0,
          elevation: 0,
          height: 85,
          paddingBottom: 20,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' && !isDarkMode ? (
            <BlurView
              tint="light"
              intensity={95}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          ) : null,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.secondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons 
              name="home" 
              size={24} 
              color={color}
              style={{ marginTop: 5 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chatMobile"
        options={{
          title: 'Chat IA',
          tabBarIcon: ({ color }) => (
            <Ionicons 
              name="chatbubbles" 
              size={24} 
              color={color}
              style={{ marginTop: 5 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Compte',
          tabBarIcon: ({ color }) => (
            <Ionicons 
              name="person" 
              size={24} 
              color={color}
              style={{ marginTop: 5 }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
