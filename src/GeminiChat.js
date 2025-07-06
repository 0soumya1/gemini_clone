import {
  ActivityIndicator,
  Button,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';

const GeminiChat = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const flatListRef = useRef(null);

  const API_KEY = 'AIzaSyDp6uqnps4iOMLiZ-mvzifFJBsSS2qah0w';

  const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = err => console.warn('Speech Error:', err);

    Tts.addEventListener('tts-start', () => setIsSpeaking(true));
    Tts.addEventListener('tts-finish', () => setIsSpeaking(false));
    Tts.addEventListener('tts-cancel', () => setIsSpeaking(false));

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
    };
  }, []);

  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'This app needs access to your microphone for voice recognition.',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    } else {
      // iOS automatically prompts; no manual request needed
      return true;
    }
  };

  const onSpeechPartialResults = event => {
    if (event.value && event.value[0]) {
      setUserInput(event.value[0]);
    }
  };

  const onSpeechEnd = () => {
    console.log('Speech ended');
    setIsListening(false);
  };

  const onSpeechResults = event => {
    if (event.value && event.value[0]) {
      setUserInput(event.value[0]);
    }
  };

  const startListening = async () => {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      alert('Microphone permission is required');
      return;
    }

    try {
      await Voice.start('en-US');
      setIsListening(true);
    } catch (e) {
      console.error('Voice Start Error:', e);
    }
  };

  const stopListening = async () => {
    try {
      if (isListening) {
        await Voice.stop();
        setIsListening(false);
      }
    } catch (error) {
      console.warn('Voice Stop Error:', error);
    }
  };

  const speak = text => {
    Tts.stop();
    Tts.speak(text);
  };

  const stopSpeaking = () => {
    Tts.stop();
    setIsSpeaking(false);
  };

  const askQuestion = async () => {
    const input = userInput.trim();
    if (!input) return;

    Keyboard.dismiss();
    await stopListening();
    setIsLoading(true);

    const userMessage = { text: input, user: true };

    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, userMessage];
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
      return updatedMessages;
    });

    try {
      const response = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: input }],
            },
          ],
        }),
      });

      const json = await response.json();
      // console.log('Response:', JSON.stringify(json, null, 2));

      const aiText =
        json?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No response from AI.';

      const aiMessage = { text: aiText, user: false };

      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, aiMessage];
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        });
        return updatedMessages;
      });

      speak(aiText);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: 'Sorry, something went wrong.', user: false },
      ]);
    } finally {
      setIsLoading(false);
      setUserInput('');
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.user ? styles.userBubble : styles.aiBubble,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <FlatList
            style={{ flex: 1 }}
            ref={flatListRef}
            // data={[...messages].reverse()}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{
              // flexGrow: 1,
              // justifyContent: 'flex-end',
              padding: 10,
            }}
            keyboardShouldPersistTaps="handled"
            // inverted
          />
          <View style={styles.inputContainer}>
            <TouchableOpacity
              onPress={isListening ? stopListening : startListening}
              style={styles.micButton}
            >
              <Text style={{ color: '#fff', fontSize: 18 }}>
                {isListening ? '🛑' : '🎤'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Ask something..."
              placeholderTextColor="#666"
              value={userInput}
              onChangeText={setUserInput}
              onSubmitEditing={askQuestion}
              returnKeyType="send"
            />
            <View style={styles.buttonWrapper}>
              <Button title="Ask" onPress={askQuestion} />
              {isLoading && (
                <ActivityIndicator
                  size="small"
                  color="black"
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>

            {isSpeaking && (
              <TouchableOpacity
                onPress={stopSpeaking}
                style={[
                  styles.micButton,
                  { marginLeft: 10, backgroundColor: '#FF3B30' },
                ]}
              >
                <Text style={{ color: '#fff', fontSize: 14 }}>⏹️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default GeminiChat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    marginBottom: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
  },

  userBubble: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },

  aiBubble: {
    backgroundColor: '#ECECEC',
    alignSelf: 'flex-start',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 25,
    fontSize: 16,
  },
  messageContainer: {
    padding: 10,
    marginVertical: 5,
  },
  userMessage: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  buttonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});
