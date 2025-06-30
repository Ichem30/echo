import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const tabBarHeight = useBottomTabBarHeight();

  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    fetchUserProfile();
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

      if (error || !profile || !profile.name) {
        setShowProfileModal(true);
      } else {
        setUserProfile(profile);
        setShowProfileModal(false);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
    }
  };

  const handleProfileSubmit = () => {
    setShowProfileModal(false);
    fetchUserProfile();
  };

  // Modifier le SYSTEM_MESSAGE pour inclure les informations du profil
  const getSystemMessage = () => {
    if (!userProfile) return SYSTEM_MESSAGE;

    return {
      role: "system" as const,
      content: `Tu es une confidente attentionnée et bienveillante. Voici le contexte sur la personne avec qui tu parles :
      - Prénom: ${userProfile.name}
      - Âge: ${userProfile.age}
      - Profession/Études: ${userProfile.profession}
      - Routine quotidienne: ${userProfile.daily_routine}
      - Rituels bien-être: ${userProfile.self_care_habits}
      - Influences sur l'humeur: ${userProfile.mood_triggers}
      - Objectifs personnels: ${userProfile.goals}
      - Citations inspirantes: ${userProfile.favorite_quotes}
      - Type de personnalité: ${userProfile.personality_type}
      - Passions: ${userProfile.interests}

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
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        stream: false,
      });

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
      getSystemMessage(),
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
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          contentContainerStyle={[
            styles.messageList,
            { paddingBottom: tabBarHeight + 60 }
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={[
          styles.inputWrapper,
          {
            bottom: tabBarHeight,
            backgroundColor: theme.background
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
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
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
