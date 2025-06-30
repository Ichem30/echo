import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
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
  age?: string | null;
  interests?: string | null;
  profession?: string | null;
  daily_routine?: string | null;
  self_care_habits?: string | null;
  mood_triggers?: string | null;
  goals?: string | null;
  favorite_quotes?: string | null;
  personality_type?: string | null;
  sexual_orientation: string | null;
  custom_orientation?: string | null;
  relationship_status: string | null;
  custom_personality_type?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  existingProfile?: UserProfile | null;
};

const ORIENTATIONS = [
  'Hétérosexuelle',
  'Homosexuelle',
  'Bisexuelle',
  'Pansexuelle',
  'Asexuelle',
  'Je préfère ne pas préciser',
  'Autre'
];

const RELATIONSHIP_STATUS = [
  'Célibataire',
  'En couple',
  'C\'est compliqué',
  'Mariée',
  'Fiancée',
  'Je préfère ne pas préciser'
];

const MBTI_TYPES = [
  'INTP', 'INTJ', 'INFP', 'INFJ',
  'ISTP', 'ISTJ', 'ISFP', 'ISFJ',
  'ENTP', 'ENTJ', 'ENFP', 'ENFJ',
  'ESTP', 'ESTJ', 'ESFP', 'ESFJ',
  'Autre',
];

export default function UserProfileModal({ visible, onClose, existingProfile }: Props) {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    age: null,
    interests: null,
    profession: null,
    daily_routine: null,
    self_care_habits: null,
    mood_triggers: null,
    goals: null,
    favorite_quotes: null,
    personality_type: null,
    sexual_orientation: null,
    custom_orientation: null,
    relationship_status: null,
    custom_personality_type: null,
  });
  const [showOrientationOptions, setShowOrientationOptions] = useState(false);
  const [showRelationshipOptions, setShowRelationshipOptions] = useState(false);
  const [showMbtiOptions, setShowMbtiOptions] = useState(false);
  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    if (existingProfile) {
      setProfile(existingProfile);
    }
  }, [existingProfile]);

  const handleSubmit = async () => {
    try {
      if (!profile.name?.trim()) {
        Alert.alert('Erreur', 'Le prénom est requis');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      const finalOrientation = profile.sexual_orientation === 'Autre' 
        ? profile.custom_orientation?.trim() || 'Autre'
        : profile.sexual_orientation;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: profile.name.trim(),
          age: profile.age?.trim() || null,
          profession: profile.profession?.trim() || null,
          interests: profile.interests?.trim() || null,
          daily_routine: profile.daily_routine?.trim() || null,
          self_care_habits: profile.self_care_habits?.trim() || null,
          mood_triggers: profile.mood_triggers?.trim() || null,
          goals: profile.goals?.trim() || null,
          favorite_quotes: profile.favorite_quotes?.trim() || null,
          personality_type: profile.personality_type?.trim() || null,
          sexual_orientation: finalOrientation,
          custom_orientation: profile.sexual_orientation === 'Autre' ? profile.custom_orientation?.trim() || null : null,
          relationship_status: profile.relationship_status,
          custom_personality_type: profile.custom_personality_type?.trim() || null,
          updated_at: new Date(),
        });

      if (error) throw error;
      
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    }
  };

  const renderOptions = (
    options: string[],
    visible: boolean,
    setVisible: (visible: boolean) => void,
    currentValue: string | null,
    onSelect: (value: string) => void
  ) => {
    if (!visible) return null;

    return (
      <View style={[styles.optionsContainer, { backgroundColor: theme.inputBackground }]}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionItem,
              currentValue === option && { backgroundColor: theme.primary + '20' }
            ]}
            onPress={() => {
              onSelect(option);
              setVisible(false);
            }}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
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
        <ScrollView style={[styles.modalView, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.primary }]}>Ton Espace Personnel</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: theme.secondary }]}>×</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Aide-moi à mieux te connaître pour personnaliser nos conversations 🌸
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Ton prénom"
            placeholderTextColor={theme.secondary}
            value={profile.name}
            onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Ton âge"
            placeholderTextColor={theme.secondary}
            value={profile.age?.toString() || ''}
            keyboardType="numeric"
            onChangeText={(text) => setProfile(prev => ({ ...prev, age: text }))}
          />

          <TouchableOpacity
            style={[styles.input, { backgroundColor: theme.inputBackground }]}
            onPress={() => setShowOrientationOptions(!showOrientationOptions)}
          >
            <Text style={[styles.selectText, { color: profile.sexual_orientation ? theme.text : theme.secondary }]}>
              {profile.sexual_orientation || 'Ton orientation sexuelle'}
            </Text>
          </TouchableOpacity>
          {renderOptions(
            ORIENTATIONS,
            showOrientationOptions,
            setShowOrientationOptions,
            profile.sexual_orientation || null,
            (value) => setProfile(prev => ({ ...prev, sexual_orientation: value }))
          )}

          {profile.sexual_orientation === 'Autre' && (
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
              placeholder="Précise ton orientation"
              placeholderTextColor={theme.secondary}
              value={profile.custom_orientation || ''}
              onChangeText={(text) => setProfile(prev => ({ ...prev, custom_orientation: text }))}
            />
          )}

          <TouchableOpacity
            style={[styles.input, { backgroundColor: theme.inputBackground }]}
            onPress={() => setShowRelationshipOptions(!showRelationshipOptions)}
          >
            <Text style={[styles.selectText, { color: profile.relationship_status ? theme.text : theme.secondary }]}>
              {profile.relationship_status || 'Ta situation amoureuse'}
            </Text>
          </TouchableOpacity>
          {renderOptions(
            RELATIONSHIP_STATUS,
            showRelationshipOptions,
            setShowRelationshipOptions,
            profile.relationship_status || null,
            (value) => setProfile(prev => ({ ...prev, relationship_status: value }))
          )}

          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Ta profession ou tes études"
            placeholderTextColor={theme.secondary}
            value={profile.profession?.toString() || ''}
            onChangeText={(text) => setProfile(prev => ({ ...prev, profession: text }))}
          />

          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Décris ta routine quotidienne idéale ✨"
            placeholderTextColor={theme.secondary}
            value={profile.daily_routine?.toString() || ''}
            multiline
            numberOfLines={3}
            onChangeText={(text) => setProfile(prev => ({ ...prev, daily_routine: text }))}
          />

          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Tes rituels bien-être préférés 🌿 (méditation, yoga, skincare...)"
            placeholderTextColor={theme.secondary}
            value={profile.self_care_habits?.toString() || ''}
            multiline
            numberOfLines={3}
            onChangeText={(text) => setProfile(prev => ({ ...prev, self_care_habits: text }))}
          />

          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Ce qui influence ton humeur (positif et négatif) 🌈"
            placeholderTextColor={theme.secondary}
            value={profile.mood_triggers?.toString() || ''}
            multiline
            numberOfLines={3}
            onChangeText={(text) => setProfile(prev => ({ ...prev, mood_triggers: text }))}
          />

          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Tes objectifs personnels et aspirations ⭐"
            placeholderTextColor={theme.secondary}
            value={profile.goals?.toString() || ''}
            multiline
            numberOfLines={3}
            onChangeText={(text) => setProfile(prev => ({ ...prev, goals: text }))}
          />

          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Tes citations inspirantes préférées ✍️"
            placeholderTextColor={theme.secondary}
            value={profile.favorite_quotes?.toString() || ''}
            multiline
            numberOfLines={3}
            onChangeText={(text) => setProfile(prev => ({ ...prev, favorite_quotes: text }))}
          />

          <TouchableOpacity
            style={[styles.input, { backgroundColor: theme.inputBackground }]}
            onPress={() => setShowMbtiOptions(!showMbtiOptions)}
          >
            <Text style={[styles.selectText, { color: profile.personality_type ? theme.text : theme.secondary }]}> 
              {profile.personality_type || 'Ton type de personnalité (ex: MBTI, Ennéagramme...)'}
            </Text>
          </TouchableOpacity>
          {showMbtiOptions && (
            <View style={[styles.optionsContainer, { backgroundColor: theme.inputBackground }]}> 
              {MBTI_TYPES.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionItem, profile.personality_type === option && { backgroundColor: theme.primary + '20' }]}
                  onPress={() => {
                    setProfile(prev => ({ ...prev, personality_type: option, custom_personality_type: '' }));
                    setShowMbtiOptions(false);
                  }}
                >
                  <Text style={{ color: theme.text }}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {profile.personality_type === 'Autre' && (
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
              placeholder="Précise ton type de personnalité"
              placeholderTextColor={theme.secondary}
              value={profile.custom_personality_type || ''}
              onChangeText={text => setProfile(prev => ({ ...prev, custom_personality_type: text }))}
            />
          )}

          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Tes passions et centres d'intérêt 💫"
            placeholderTextColor={theme.secondary}
            value={profile.interests?.toString() || ''}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '90%',
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
    borderColor: '#E8E8E8',
    borderRadius: 15,
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
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionsContainer: {
    marginTop: -10,
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  optionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  optionText: {
    fontSize: 16,
  },
  selectText: {
    fontSize: 16,
  },
}); 