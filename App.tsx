import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import GeminiChat from './src/GeminiChat';

function App() {
  return (

    <View style={styles.container}>
      {Platform.OS === "android" && (
        <StatusBar
          backgroundColor={"#fff"}
          barStyle="dark-content"
        />
      )}
      <GeminiChat />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
