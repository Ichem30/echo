import { Ionicons } from '@expo/vector-icons'
import { Session } from '@supabase/supabase-js'
import React, { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Avatar from '../app/components/Avatar'
import UserProfileModal from '../app/components/UserProfileModal'
import { supabase } from '../utils/supabase'

type Props = {
  session: Session
}

type UserProfile = {
  name: string
  age: string
  interests: string
  profession: string
}

export default function Account({ session }: Props) {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (session) getProfile()
  }, [session])

  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, avatar_url, name, age, profession, interests`)
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
          interests: data.interests
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <Text style={styles.headerSubtitle}>Gérez vos informations personnelles</Text>
      </View>

      <View style={styles.avatarContainer}>
        <Avatar
          size={150}
          url={avatarUrl}
          onUpload={(url: string) => {
            setAvatarUrl(url)
            updateProfile({ username, avatar_url: url })
          }}
        />
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            value={session?.user?.email} 
            editable={false}
            placeholder="Email"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={username || ''}
            onChangeText={(text) => setUsername(text)}
            placeholder="Nom d'utilisateur"
            placeholderTextColor="#666"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => updateProfile({ username, avatar_url: avatarUrl })}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Mise à jour...' : 'Mettre à jour'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonOutline]}
          onPress={() => setShowProfileModal(true)}
        >
          <Text style={styles.buttonOutlineText}>Modifier ma présentation</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.buttonDanger]} 
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
  }
})