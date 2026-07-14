import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Dimensions, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useKeepAwake } from "expo-keep-awake";

useEffect(() => {
  if (Platform.OS !== 'android') return;
  if (!isAndroidTablet()) return;

  (async () => {
    // Hide bottom system bar
    await NavigationBar.setVisibilityAsync('hidden');

    // Allow swipe to temporarily reveal (Play Store safe)
    await NavigationBar.setBehaviorAsync('overlay-swipe');
  })();
}, []);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function isAndroidTablet() {
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) >= 600;
}

export default function RootLayout() {
  useKeepAwake();
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // ✅ Lock orientation globally (Android: tablet=landscape, phone=portrait)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    (async () => {
      if (isAndroidTablet()) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      }
    })();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="selektor" options={{ headerShown: false }} />
        <Stack.Screen name="template_selector" options={{ headerShown: false }} />
        <Stack.Screen name="selector_choice" options={{ headerShown: false }} />
        <Stack.Screen name="listener_selector" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
