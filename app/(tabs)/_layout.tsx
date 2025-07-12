import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#fff',
          borderTopWidth: 0,
          elevation: 0,
          height: 85,
          paddingBottom: 20,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
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
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => (
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
