import { useColorScheme } from '@/hooks/useColorScheme'
import { Ionicons } from '@expo/vector-icons'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { Session } from '@supabase/supabase-js'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Avatar from '../app/components/Avatar'
import UserProfileModal from '../app/components/UserProfileModal'
import { supabase } from '../utils/supabase'
import { ThemeContext } from '../utils/theme'
import { ThemeSelector } from './ThemeSelector'

type Props = {
  session: Session
}

type UserProfile = {
  name: string;
  age: string | null;
  interests: string | null;
  profession: string | null;
  daily_routine: string | null;
  self_care_habits: string | null;
  mood_triggers: string | null;
  goals: string | null;
  favorite_quotes: string | null;
  personality_type: string | null;
  sexual_orientation: string | null;
  custom_orientation: string | null;
  relationship_status: string | null;
}

export default function Account({ session }: Props) {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const { theme, isDarkMode, toggleDarkMode } = React.useContext(ThemeContext)
  const colorScheme = useColorScheme()
  const switchAnim = React.useRef(new Animated.Value(isDarkMode ? 1 : 0)).current
  const tabBarHeight = useBottomTabBarHeight()
  const router = useRouter()

  useEffect(() => {
    if (session) getProfile()
  }, [session])

  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`
          username, 
          avatar_url, 
          name, 
          age, 
          profession, 
          interests,
          daily_routine,
          self_care_habits,
          mood_triggers,
          goals,
          favorite_quotes,
          personality_type,
          sexual_orientation,
          custom_orientation,
          relationship_status
        `)
        .eq('id', session?.user.id)
        .single()

      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setAvatarUrl(data.avatar_url)
        setUserProfile({
          name: data.name,
          age: data.age,
          profession: data.profession,
          interests: data.interests,
          daily_routine: data.daily_routine,
          self_care_habits: data.self_care_habits,
          mood_triggers: data.mood_triggers,
          goals: data.goals,
          favorite_quotes: data.favorite_quotes,
          personality_type: data.personality_type,
          sexual_orientation: data.sexual_orientation,
          custom_orientation: data.custom_orientation,
          relationship_status: data.relationship_status
        })
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile({
    username,
    avatar_url,
  }: {
    username: string
    avatar_url: string
  }) {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }

      Alert.alert(
        'Succès',
        'Votre profil a été mis à jour avec succès !',
        [{ text: 'OK' }]
      )

    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(
          'Erreur',
          'Impossible de mettre à jour le profil : ' + error.message,
          [{ text: 'OK' }]
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = () => {
    setShowProfileModal(false)
    getProfile()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const toggleSwitch = () => {
    const newValue = !isDarkMode
    Animated.spring(switchAnim, {
      toValue: newValue ? 1 : 0,
      useNativeDriver: true,
    }).start()
    toggleDarkMode(newValue)
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
    >
      <TouchableOpacity
        style={{ margin: 20, alignSelf: 'center', backgroundColor: theme.primary, padding: 10, borderRadius: 10 }}
        onPress={() => router.push('/onboarding')}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Tester l'onboarding</Text>
      </TouchableOpacity>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <View style={styles.themeSwitchContainer}>
          <TouchableOpacity
            style={[
              styles.themeSwitch,
              {
                backgroundColor: isDarkMode ? '#1a1a1a' : '#e0e0e0',
                borderColor: isDarkMode ? '#333' : '#ccc',
              }
            ]}
            onPress={toggleSwitch}
            activeOpacity={0.9}>
            <View style={styles.switchIconContainer}>
              <Ionicons
                name="sunny"
                size={16}
                color={isDarkMode ? '#666' : theme.primary}
                style={[styles.switchIcon, { opacity: isDarkMode ? 0.5 : 1 }]}
              />
            </View>
            <View style={styles.switchIconContainer}>
              <Ionicons
                name="moon"
                size={16}
                color={isDarkMode ? theme.primary : '#666'}
                style={[styles.switchIcon, { opacity: isDarkMode ? 1 : 0.5 }]}
              />
            </View>
            <Animated.View
              style={[
                styles.switchKnob,
                {
                  backgroundColor: isDarkMode ? '#333' : '#fff',
                  transform: [{
                    translateX: switchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [2, 32]
                    })
                  }]
                }
              ]}
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.avatarContainer}>
          <Avatar
            size={200}
            url={avatarUrl}
            onUpload={(url: string) => {
              setAvatarUrl(url)
              updateProfile({ username, avatar_url: url })
            }}
          />
        </View>

        <Text style={[styles.headerTitle, { color: theme.primary }]}>Mon Profil</Text>
        <Text style={[styles.headerSubtitle, { color: theme.secondary }]}>Gérez vos informations personnelles</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="mail-outline" size={20} color={theme.secondary} style={styles.inputIcon} />
          <TextInput 
            style={[styles.input, { color: theme.text }]} 
            value={session?.user?.email} 
            editable={false}
            placeholder="Email"
            placeholderTextColor={theme.secondary}
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="person-outline" size={20} color={theme.secondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={username || ''}
            onChangeText={(text) => setUsername(text)}
            placeholder="Nom d'utilisateur"
            placeholderTextColor={theme.secondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
          onPress={() => updateProfile({ username, avatar_url: avatarUrl })}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Mise à jour...' : 'Mettre à jour'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonOutline, { borderColor: theme.primary }]}
          onPress={() => setShowProfileModal(true)}
        >
          <Text style={[styles.buttonOutlineText, { color: theme.primary }]}>Modifier ma présentation</Text>
        </TouchableOpacity>

        <ThemeSelector />

        <TouchableOpacity 
          style={[styles.buttonDanger, { backgroundColor: theme.danger }]} 
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      <UserProfileModal
        visible={showProfileModal}
        onClose={handleProfileUpdate}
        existingProfile={userProfile}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 10,
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonOutlineText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  themeSwitchContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    borderRadius: 20,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  themeSwitch: {
    width: 64,
    height: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    borderWidth: 1,
  },
  switchIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  switchIcon: {
    zIndex: 2,
  },
  switchKnob: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
})