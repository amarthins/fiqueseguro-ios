import React, { useCallback, useEffect } from "react"
import { View, Text,StatusBar } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import Router from './src/routes/Router'
import AuthProvider from "./src/contexts/auth";
import { Provider as PaperProvider } from 'react-native-paper'
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync()

function App() {

  const [fontsLoaded] = useFonts({
    'avenir': require('./assets/fonts/AvenirLTStd-Book.otf'),
    'avenirBlack': require('./assets/fonts/AvenirLTStd-Black.otf'),
    'avenirRoman': require('./assets/fonts/AvenirLTStd-Roman.otf'),
  });

  useEffect(() => {
    const getFont = async () => {
      const data = await closeSplash()
    }
    getFont()
      .catch(console.error);
  }, [fontsLoaded])

  const closeSplash = async () => {
    await SplashScreen.hideAsync()
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer>
      <AuthProvider>
        <PaperProvider>
          <Router />
        </PaperProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}

export default App