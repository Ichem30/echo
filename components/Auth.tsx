import { router } from 'expo-router'
import React, { useState } from 'react'
import { Alert, AppState, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../utils/supabase'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError('L\'email est requis')
      return false
    }
    if (!emailRegex.test(email)) {
      setEmailError('Format d\'email invalide')
      return false
    }
    setEmailError('')
    return true
  }

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Le mot de passe est requis')
      return false
    }
    if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères')
      return false
    }
    setPasswordError('')
    return true
  }

  async function signInWithEmail() {
    if (!validateEmail(email) || !validatePassword(password)) {
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      Alert.alert('Erreur de connexion', error.message)
    } else {
      router.replace('/(tabs)')
    }
    setLoading(false)
  }

  async function signUpWithEmail() {
    if (!validateEmail(email) || !validatePassword(password)) {
      return
    }

    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) Alert.alert('Erreur d\'inscription', error.message)
    if (!session) Alert.alert('Vérification requise', 'Veuillez vérifier votre boîte mail pour confirmer votre inscription !')
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          onChangeText={(text: string) => {
            setEmail(text)
            validateEmail(text)
          }}
          value={email}
          placeholder="email@address.com"
          autoCapitalize="none"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      </View>
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={[styles.input, passwordError ? styles.inputError : null]}
          onChangeText={(text: string) => {
            setPassword(text)
            validatePassword(text)
          }}
          value={password}
          secureTextEntry={true}
          placeholder="Mot de passe"
          autoCapitalize="none"
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          disabled={loading} 
          onPress={() => signInWithEmail()}
        >
          <Text style={styles.buttonText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.verticallySpaced}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          disabled={loading} 
          onPress={() => signUpWithEmail()}
        >
          <Text style={styles.buttonText}>S'inscrire</Text>
        </TouchableOpacity>
      </View>
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
  inputError: {
    borderColor: '#ff0000',
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
  errorText: {
    color: '#ff0000',
    fontSize: 12,
    marginTop: 5,
  }
})