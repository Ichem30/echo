import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import OpenAI from 'openai';
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from '../../utils/supabase';
import { ThemeContext } from '../../utils/theme';
import UserProfileModal from '../components/UserProfileModal';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Vérification de la clé API
if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
  Alert.alert('Erreur', 'Clé API OpenAI manquante');
}

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

const SYSTEM_MESSAGE = { role: "system" as const, content: "You are a helpful assistant" };

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
};

export default function ChatMobile() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?', timestamp: new Date() }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const [firstPromptSent, setFirstPromptSent] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [lastSavedMessageCount, setLastSavedMessageCount] = useState(0);
  const [checkins, setCheckins] = useState<any[]>([]);

  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    fetchUserProfile();
    fetchUserDoc();
    fetchCheckins();
  }, []);

  useEffect(() => {
    let showSub, hideSub;
    if (Platform.OS === 'ios') {
      showSub = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardVisible(true));
      hideSub = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardVisible(false));
    } else {
      showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
      hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    }
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && profile && profile.name) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
    }
  };

  const fetchUserDoc = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_doc')
        .eq('id', user.id)
        .single();
      if (!error && profile && profile.user_doc) {
        setUserDoc(profile.user_doc);
      } else {
        setUserDoc({ messages: [] });
      }
    } catch (error) {
      setUserDoc({ messages: [] });
    }
  };

  const fetchCheckins = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('checkins')
        .eq('id', user.id)
        .single();
      if (!error && profile && Array.isArray(profile.checkins)) {
        setCheckins(profile.checkins);
      } else {
        setCheckins([]);
      }
    } catch (error) {
      setCheckins([]);
    }
  };

  const handleProfileSubmit = () => {
    setShowProfileModal(false);
    fetchUserProfile();
  };

  // Fonction pour générer un résumé structuré de la session (enrichi)
  const generateConversationSummary = async (messages: Message[]): Promise<any> => {
    try {
      const historique = messages.map((m: any) => {
        const auteur = m.role === 'user' ? 'Utilisatrice' : m.role === 'assistant' ? 'Assistante' : 'Système';
        return `${auteur} : ${m.content}`;
      }).join('\n');
      const prompt = `Voici l'historique d'une conversation entre une utilisatrice et son assistante IA. Résume la session en 4 points :\n1. Humeur générale de l'utilisatrice\n2. Sujets principaux abordés\n3. Informations clés à retenir sur l'utilisatrice (objectifs, préoccupations, événements importants, changements, etc.)\n4. Résumé synthétique de la discussion (2-3 phrases max)\nRéponds uniquement au format JSON : { "humeur": "...", "sujets": ["..."], "infos_cles": ["..."], "resume": "..." }\nHistorique :\n${historique}`;
      console.log('[OpenAI][Résumé][Prompt]', prompt);
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: 'system', content: "Tu es une IA qui résume des conversations pour un journal utilisateur. Réponds toujours en JSON strict." },
          { role: 'user', content: prompt }
        ],
        stream: false,
        temperature: 0.3
      });
      console.log('[OpenAI][Résumé][Réponse]', response);
      const content = response.choices[0]?.message?.content || '';
      let aiSummary;
      try {
        aiSummary = JSON.parse(content);
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          aiSummary = JSON.parse(match[0]);
        } else {
          aiSummary = {
            humeur: '',
            sujets: [],
            infos_cles: [],
            resume: content.slice(0, 300)
          };
        }
      }
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      const heure = now.toTimeString().slice(0, 5);
      return {
        date,
        heure,
        humeur: aiSummary.humeur,
        sujets: aiSummary.sujets,
        infos_cles: aiSummary.infos_cles,
        resume: aiSummary.resume
      };
    } catch (error) {
      return {
        date: new Date().toISOString().slice(0, 10),
        heure: new Date().toISOString().slice(11, 19),
        humeur: '',
        sujets: [],
        infos_cles: [],
        resume: 'Résumé non disponible (erreur OpenAI)'
      };
    }
  };

  // Ajoute ou met à jour le résumé dans user_doc.resumes
  const updateUserDocWithSummary = async (summary: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let newUserDoc = userDoc && userDoc.resumes ? { ...userDoc } : { resumes: [] };
      // Supprime tous les résumés du jour (date ISO)
      newUserDoc.resumes = newUserDoc.resumes.filter((r: any) => r.date !== summary.date);
      newUserDoc.resumes.unshift(summary);
      // Nettoyage du champ messages hérité de l'ancienne logique
      if ('messages' in newUserDoc) {
        delete newUserDoc.messages;
      }
      setUserDoc(newUserDoc);
      await supabase
        .from('profiles')
        .update({ user_doc: newUserDoc })
        .eq('id', user.id);
    } catch (error) {
      // gestion d'erreur
    }
  };

  // Sauvegarde à la sortie du chat et périodiquement
  const saveSessionSummary = async () => {
    if (messages.length < 2) return;
    const summary = await generateConversationSummary(messages);
    await updateUserDocWithSummary(summary);
  };

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        saveSessionSummary();
      };
    }, [messages, userDoc])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      saveSessionSummary();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [messages, userDoc]);

  // Le prompt système lit les résumés
  const getSystemMessage = () => {
    if (!userProfile) return SYSTEM_MESSAGE;
    let resumesBloc = [];
    if (userDoc && userDoc.resumes && userDoc.resumes.length > 0) {
      resumesBloc = userDoc.resumes.slice(0, 10);
    }
    // Bloc check-in mental (3 derniers)
    let checkinBloc = '';
    if (checkins && checkins.length > 0) {
      const lastCheckins = checkins.slice(0, 3);
      checkinBloc = '\nCheck-in mental des 3 derniers jours :\n' +
        lastCheckins.map((c: any) => `- [${c.date}] Couleur : ${c.mot_cle}`).join('\n');
    } else {
      checkinBloc = '\nAucun check-in mental récent.';
    }
    return {
      role: "system" as const,
      content: `Tu es une confidente attentionnée et bienveillante. Voici le contexte sur la personne avec qui tu parles :
      - Prénom: ${userProfile.name}
      - Âge: ${userProfile.age}
      - Pronons: ${userProfile.pronouns}
      - Profession/Études: ${userProfile.profession}
      - Routine quotidienne: ${userProfile.daily_routine}
      - Rituels bien-être: ${userProfile.self_care_habits}
      - Influences sur l'humeur: ${userProfile.mood_triggers}
      - Objectifs personnels: ${userProfile.goals}
      - Citations inspirantes: ${userProfile.favorite_quotes}
      - Type de personnalité: ${userProfile.personality_type}
      - Passions: ${userProfile.interests}

      ${checkinBloc}

      Historique des discussions récentes :
      ${resumesBloc.length > 0 ? resumesBloc.map((r: any) => `- [${r.date} ${r.heure}] Humeur : ${r.humeur} | Sujets : ${(r.sujets || []).join(', ')} | Infos clés : ${(r.infos_cles || []).join(', ')} | Résumé : ${r.resume}`).join('\n') : 'Aucun historique.'}

      Adapte ton style de communication pour être :
      1. Personnelle et empathique, en utilisant les informations de son profil
      2. Encourageante et positive, en ligne avec ses objectifs
      3. Respectueuse de ses rituels et habitudes
      4. Attentive à ses déclencheurs d'humeur
      5. Inspirante, en faisant écho à ses citations préférées
      Utilise un ton amical et intime, comme une amie proche qui la connaît bien. Tutoie-la et utilise des emojis de façon modérée pour garder un style élégant et "clean girl".`
    };
  };

  const handleError = async (error: any) => {
    console.error("Error:", error);
    const errorMessage = error?.message || "Une erreur s'est produite";
    setMessages(prev => [...prev, { 
      role: "assistant", 
      content: `Désolé, ${errorMessage}. Veuillez réessayer.`,
      timestamp: new Date()
    }]);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleWebStream = async (response: any, assistantMessage: Message) => {
    try {
      for await (const chunk of response) {
        if (!chunk.choices[0]?.delta?.content) continue;
        const content = chunk.choices[0].delta.content;
        assistantMessage.content += content;
        setMessages(prev => [
          ...prev.slice(0, -1),
          { ...assistantMessage }
        ]);
      }
    } catch (streamError) {
      handleError(streamError);
    }
  };

  const handleMobileResponse = async (messages: any[]) => {
    try {
      console.log('[OpenAI][Prompt complet]', messages);
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        stream: false,
      });
      console.log('[OpenAI][Réponse]', response);
      const content = response.choices[0]?.message?.content || "";
      return {
        role: "assistant" as const,
        content,
        timestamp: new Date()
      } as Message;
    } catch (error) {
      throw error;
    }
  };

  const onSend = async () => {
    if (!inputMessage.trim()) return;
    
    if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
      Alert.alert('Erreur', 'Clé API OpenAI manquante');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userMessage: Message = { 
      role: "user", 
      content: inputMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    Keyboard.dismiss();

    const apiMessages = [
      await getSystemMessage(),
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: userMessage.role,
        content: userMessage.content
      }
    ];

    try {
      if (isWeb) {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: apiMessages,
          stream: true,
        });

        let assistantMessage: Message = { 
          role: "assistant", 
          content: "",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        await handleWebStream(response, assistantMessage);
      } else {
        const assistantMessage = await handleMobileResponse(apiMessages);
        setMessages(prev => [...prev, assistantMessage]);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!firstPromptSent) setFirstPromptSent(true);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.customHeader, { backgroundColor: theme.background, shadowColor: '#000' }]}> 
        <Text style={[styles.customHeaderTitle, { color: theme.text }]}>Chat IA</Text>
      </View>
      <UserProfileModal
        visible={showProfileModal}
        onClose={handleProfileSubmit}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>
          <FlatList
            ref={flatListRef}
            data={messages}
            contentContainerStyle={[
              styles.messageList,
              { paddingBottom: isKeyboardVisible ? 10 : tabBarHeight }
            ]}
            renderItem={({ item }) => (
              <View style={[
                styles.message,
                {
                  marginLeft: item.role === "user" ? 'auto' : 0,
                  backgroundColor: item.role === "user" ? theme.primary : theme.inputBackground
                }
              ]}>
                <Text style={[
                  styles.messageText,
                  { color: item.role === "user" ? 'white' : theme.text }
                ]}>
                  {item.content}
                </Text>
                <Text style={[
                  styles.timestamp,
                  { color: item.role === "user" ? 'rgba(255,255,255,0.7)' : theme.secondary }
                ]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            )}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </View>
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: theme.background,
              borderTopWidth: 0.5,
              borderTopColor: '#E5E5E5',
              paddingBottom: isKeyboardVisible ? 0 : tabBarHeight
            }
          ]}
        >
          <View style={[styles.inputContainer, { backgroundColor: theme.background }]}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.inputBackground,
                }
              ]}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder="Message"
              placeholderTextColor={theme.secondary}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: theme.primary },
                (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={onSend}
              disabled={!inputMessage.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="send" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  messageList: {
    padding: 15,
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  inputWrapper: {
    // plus de position absolute, layout classique
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: Platform.OS === 'ios' ? 12 : 10,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    borderRadius: 20,
    maxHeight: 100,
    minHeight: 44,
    fontSize: 16,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  customHeader: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    zIndex: 10,
  },
  customHeaderTitle: {
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
});
