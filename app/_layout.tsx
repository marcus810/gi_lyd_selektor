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
import * as Device from 'expo-device';
import { useColorScheme } from '@/hooks/useColorScheme';
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function isAndroidTablet() {
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) >= 600;
}

const TABLET_KEEP_AWAKE_TAG = 'ProSelectorTabletKeepAwake';

async function isTabletDevice() {
  try {
    const type = await Device.getDeviceTypeAsync();

    if (type === Device.DeviceType.TABLET) return true;
    if (type === Device.DeviceType.PHONE) return false;
  } catch (error) {
    console.warn('Device.getDeviceTypeAsync failed for keep awake', error);
  }

  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) >= 600;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const tablet = await isTabletDevice();
      if (!mounted) return;

      if (tablet) {
        await activateKeepAwakeAsync(TABLET_KEEP_AWAKE_TAG);
      } else {
        await deactivateKeepAwake(TABLET_KEEP_AWAKE_TAG);
      }
    })().catch((error) => {
      console.warn('Failed to update tablet keep awake state', error);
    });

    return () => {
      mounted = false;
      deactivateKeepAwake(TABLET_KEEP_AWAKE_TAG).catch(() => {});
    };
  }, []);

  // ✅ Lock orientation globally (Android: tablet=landscape, phone=portrait)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    (async () => {
      const androidTablet = isAndroidTablet();

      if (androidTablet) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        await NavigationBar.setVisibilityAsync('visible');
        await NavigationBar.setBehaviorAsync('inset-touch');
        NavigationBar.setStyle('dark');
      }
    })();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
