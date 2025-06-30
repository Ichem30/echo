import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../utils/supabase';
import { ThemeContext } from '../utils/theme';

const QUESTIONS = [
  { key: 'name', label: 'Ton prénom', placeholder: 'Ton prénom', required: true },
  { key: 'age', label: 'Ton âge', placeholder: 'Ton âge', keyboardType: 'numeric' },
  { key: 'sexual_orientation', label: 'Ton orientation sexuelle', placeholder: "Orientation (ex: Hétérosexuelle)" },
  { key: 'relationship_status', label: 'Ta situation amoureuse', placeholder: "Situation (ex: Célibataire)" },
  { key: 'profession', label: 'Ta profession ou tes études', placeholder: 'Profession ou études' },
  { key: 'daily_routine', label: 'Décris ta routine quotidienne idéale ✨', placeholder: 'Routine quotidienne', multiline: true },
  { key: 'self_care_habits', label: 'Tes rituels bien-être préférés 🌿', placeholder: 'Rituels bien-être', multiline: true },
  { key: 'mood_triggers', label: 'Ce qui influence ton humeur 🌈', placeholder: 'Déclencheurs d\'humeur', multiline: true },
  { key: 'goals', label: 'Tes objectifs personnels et aspirations ⭐', placeholder: 'Objectifs', multiline: true },
  { key: 'favorite_quotes', label: 'Tes citations inspirantes préférées ✍️', placeholder: 'Citations', multiline: true },
  { key: 'personality_type', label: 'Ton type de personnalité', placeholder: 'Type de personnalité (ex: MBTI)' },
  { key: 'interests', label: 'Tes passions et centres d\'intérêt 💫', placeholder: 'Passions', multiline: true },
];

const ORIENTATIONS = [
  'Hétérosexuelle',
  'Homosexuelle',
  'Bisexuelle',
  'Pansexuelle',
  'Asexuelle',
  'Je préfère ne pas préciser',
  'Autre',
];

const RELATIONSHIP_STATUS = [
  'Célibataire',
  'En couple',
  "C'est compliqué",
  'Mariée',
  'Fiancée',
  'Je préfère ne pas préciser',
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { theme } = React.useContext(ThemeContext);
  const router = useRouter();
  const [showOrientationOptions, setShowOrientationOptions] = useState(false);
  const [showRelationshipOptions, setShowRelationshipOptions] = useState(false);

  const current = QUESTIONS[step];

  const handleNext = async () => {
    if (current.required && !answers[current.key]?.trim()) {
      Alert.alert('Erreur', 'Ce champ est requis');
      return;
    }
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utilisateur non connecté');
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          ...answers,
          updated_at: new Date(),
        });
        if (error) throw error;
        router.replace('/');
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={[styles.label, { color: theme.primary }]}>{current.label}</Text>
        {current.key === 'sexual_orientation' ? (
          <>
            <TouchableOpacity
              style={[styles.input, { justifyContent: 'center' }]}
              onPress={() => setShowOrientationOptions(!showOrientationOptions)}
            >
              <Text style={{ color: answers[current.key] ? theme.text : theme.secondary }}>
                {answers[current.key] || current.placeholder}
              </Text>
            </TouchableOpacity>
            {showOrientationOptions && (
              <View style={[styles.optionsContainer, { backgroundColor: theme.inputBackground }]}> 
                {ORIENTATIONS.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionItem, answers[current.key] === option && { backgroundColor: theme.primary + '20' }]}
                    onPress={() => {
                      setAnswers({ ...answers, sexual_orientation: option, custom_orientation: '' });
                      setShowOrientationOptions(false);
                    }}
                  >
                    <Text style={{ color: theme.text }}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {answers[current.key] === 'Autre' && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                placeholder="Précise ton orientation"
                placeholderTextColor={theme.secondary}
                value={answers.custom_orientation || ''}
                onChangeText={text => setAnswers({ ...answers, custom_orientation: text })}
              />
            )}
          </>
        ) : current.key === 'relationship_status' ? (
          <>
            <TouchableOpacity
              style={[styles.input, { justifyContent: 'center' }]}
              onPress={() => setShowRelationshipOptions(!showRelationshipOptions)}
            >
              <Text style={{ color: answers[current.key] ? theme.text : theme.secondary }}>
                {answers[current.key] || current.placeholder}
              </Text>
            </TouchableOpacity>
            {showRelationshipOptions && (
              <View style={[styles.optionsContainer, { backgroundColor: theme.inputBackground }]}> 
                {RELATIONSHIP_STATUS.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionItem, answers[current.key] === option && { backgroundColor: theme.primary + '20' }]}
                    onPress={() => {
                      setAnswers({ ...answers, relationship_status: option });
                      setShowRelationshipOptions(false);
                    }}
                  >
                    <Text style={{ color: theme.text }}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : (
          <TextInput
            key={current.key}
            style={[
              styles.input,
              current.multiline && styles.textArea,
              { backgroundColor: theme.inputBackground, color: theme.text }
            ]}
            placeholder={current.placeholder}
            placeholderTextColor={theme.secondary}
            value={answers[current.key] || ''}
            onChangeText={text => setAnswers({ ...answers, [current.key]: text })}
            keyboardType={current.keyboardType as any || 'default'}
            multiline={!!current.multiline}
            numberOfLines={current.multiline ? 3 : 1}
          />
        )}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{step < QUESTIONS.length - 1 ? 'Suivant' : 'Terminer'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionsContainer: {
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
}); 