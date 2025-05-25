import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import { Alert, Button, Image, StyleSheet, View } from 'react-native'
import { supabase } from '../../utils/supabase'
import { ThemeContext } from '../../utils/theme'


interface Props {
  size: number
  url: string | null
  onUpload: (filePath: string) => void
}

export default function Avatar({ url, size = 150, onUpload }: Props) {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const avatarSize = { height: size, width: size }
  const { theme } = React.useContext(ThemeContext)

  useEffect(() => {
    if (url) downloadImage(url)
  }, [url])

  async function downloadImage(path: string) {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path)
      if (error) {
        throw error
      }

      const fr = new FileReader()
      fr.readAsDataURL(data)
      fr.onload = () => {
        setAvatarUrl(fr.result as string)
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log('Erreur lors du téléchargement de l\'image: ', error.message)
      }
    }
  }

  async function uploadAvatar() {
    try {
      setUploading(true)

      // Demander la permission d'accéder à la galerie
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Désolé', 'Nous avons besoin de votre permission pour accéder à vos photos.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        allowsEditing: true,
        quality: 1,
        exif: false,
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('Sélection d\'image annulée.')
        return
      }

      const image = result.assets[0]
      if (!image.uri) {
        throw new Error('Pas d\'URI d\'image!')
      }

      const arraybuffer = await fetch(image.uri).then((res) => res.arrayBuffer())
      const fileExt = image.uri?.split('.').pop()?.toLowerCase() ?? 'jpeg'
      const path = `${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arraybuffer, {
          contentType: image.mimeType ?? 'image/jpeg',
        })

      if (uploadError) {
        throw uploadError
      }

      onUpload(data.path)
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Erreur', error.message)
      } else {
        throw error
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <View>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          accessibilityLabel="Avatar"
          style={[avatarSize, styles.avatar, styles.image, { borderColor: theme.primary }]}
        />
      ) : (
        <View style={[avatarSize, styles.avatar, styles.noImage, { borderColor: theme.primary }]} />
      )}
      <View style={styles.buttonContainer}>
        <Button
          title={uploading ? 'Envoi en cours...' : 'Changer la photo'}
          onPress={uploadAvatar}
          disabled={uploading}
          color={theme.primary}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 75, // La moitié de la taille par défaut pour un cercle parfait
    overflow: 'hidden',
    maxWidth: '100%',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  image: {
    objectFit: 'cover',
    paddingTop: 0,
  },
  noImage: {
    backgroundColor: '#E1E1E1',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#CCCCCC',
  },
  buttonContainer: {
    marginTop: 10,
  },
}) 