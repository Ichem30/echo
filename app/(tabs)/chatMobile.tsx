import { Ionicons } from '@expo/vector-icons';
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
      content: `You are a helpful assistant. Here's some context about the user you're talking to:
      - Name: ${userProfile.name}
      - Age: ${userProfile.age}
      - Profession: ${userProfile.profession}
      - Interests: ${userProfile.interests}
      Please adapt your responses to be personalized and relevant to their profile.`
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <UserProfileModal
        visible={showProfileModal}
        onClose={handleProfileSubmit}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          contentContainerStyle={styles.messageList}
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

        <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text }]}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Tapez votre message..."
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
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  input: {
    flex: 1,
    marginRight: 10,
    padding: 10,
    borderRadius: 20,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
