import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { ThemeContext } from '../../utils/theme';

type UserProfile = {
  name: string;
  age: string;
  interests: string;
  profession: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  existingProfile?: UserProfile | null;
};

export default function UserProfileModal({ visible, onClose, existingProfile }: Props) {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    age: '',
    interests: '',
    profession: '',
  });
  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    if (existingProfile) {
      setProfile(existingProfile);
    }
  }, [existingProfile]);

  const handleSubmit = async () => {
    try {
      if (!profile.name.trim()) {
        Alert.alert('Erreur', 'Le nom est requis');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: profile.name.trim(),
          age: profile.age.trim(),
          profession: profile.profession.trim(),
          interests: profile.interests.trim(),
          updated_at: new Date(),
        });

      if (error) throw error;
      
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={[styles.modalView, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.primary }]}>Votre Profil</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: theme.secondary }]}>×</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Ces informations nous aideront à personnaliser vos conversations
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Votre nom"
            placeholderTextColor={theme.secondary}
            value={profile.name}
            onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Votre âge"
            placeholderTextColor={theme.secondary}
            value={profile.age}
            keyboardType="numeric"
            onChangeText={(text) => setProfile(prev => ({ ...prev, age: text }))}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Votre profession"
            placeholderTextColor={theme.secondary}
            value={profile.profession}
            onChangeText={(text) => setProfile(prev => ({ ...prev, profession: text }))}
          />

          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Vos centres d'intérêt (séparés par des virgules)"
            placeholderTextColor={theme.secondary}
            value={profile.interests}
            multiline
            numberOfLines={3}
            onChangeText={(text) => setProfile(prev => ({ ...prev, interests: text }))}
          />

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.primary }]} 
            onPress={handleSubmit}
          >
            <Text style={styles.buttonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 30,
    color: '#666666',
    lineHeight: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#999999',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 