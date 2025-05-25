import { Session } from '@supabase/supabase-js'
import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
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
  const [website, setWebsite] = useState('')
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
        .select(`username, website, avatar_url, name, age, profession, interests`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setWebsite(data.website)
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
    website,
    avatar_url,
  }: {
    username: string
    website: string
    avatar_url: string
  }) {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        website,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
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
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={session?.user?.email} editable={false} />
      </View>
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username || ''}
          onChangeText={(text) => setUsername(text)}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={website || ''}
          onChangeText={(text) => setWebsite(text)}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => updateProfile({ username, website, avatar_url: avatarUrl })}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Loading ...' : 'Update'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.verticallySpaced}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#4CAF50' }]}
          onPress={() => setShowProfileModal(true)}
        >
          <Text style={styles.buttonText}>Présentation</Text>
        </TouchableOpacity>
      </View>

      <UserProfileModal
        visible={showProfileModal}
        onClose={handleProfileUpdate}
        existingProfile={userProfile}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#2089dc',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})