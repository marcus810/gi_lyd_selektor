/* selector_choice.tsx (safe/native wrapper) */
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as styles from '../scripts/styles';
import * as generalComponent from '../scripts/general_scripts/custom_components';
import { DatabaseHandler } from '@/scripts/database/database';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';






const selector_choice = () => {
  const router = useRouter();
  const db = DatabaseHandler.getInstance();

  const [isTablet, setIsTablet] = useState(false);



  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    // Get device type once
    (async () => {
      try {
        const type = await Device.getDeviceTypeAsync();
        setIsTablet(type === Device.DeviceType.TABLET);
      } catch (e) {
        console.warn('Device.getDeviceTypeAsync failed', e);
      }
    })();

    // socket disconnect handler
    const handleSocketDisconnect = () => {
      redirectTimer = setTimeout(() => {
        Alert.alert(
          'Failed to Reconnect',
          'The connection could not be restored. You will be redirected to the main screen.',
          [{ text: 'OK', onPress: () => { db.closeSocket(); router.dismissTo('/'); } }]
        );
      }, 500);
    };
    const removeDisconnectHandler = db.onSocketDisconnect(handleSocketDisconnect);

    return () => {
      removeDisconnectHandler();
      if (redirectTimer !== null) {
        clearTimeout(redirectTimer);
      }
    };
  }, []);

  // navigate to selector role (speaker + mic)
  const goToSelectorScreen = async () => {
    try {
      db.setRole('selector');                  // <- set role first
      await db.safeCall('setPlayAndRecordVoiceChat'); // optional: native audio hint
      router.push('/template_selector');
    } catch (err) {
      console.warn('goToSelectorScreen error', err);
      router.push('/template_selector');
    }
  };

  // navigate to listener role (playback-only)
  const goToListenerScreen = async () => {
    try {
      db.setRole('listener');                   // <- set role first
      await db.safeCall('setPlayback');
      router.push('/listener_selector');
    } catch (err) {
      console.warn('goToListenerScreen error', err);
      router.push('/listener_selector');
    }
  };

  const goToIndexScreen = () => {
    db.closeSocket();
    router.dismissTo('/');
  };

  type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
  const roleCard = (
    title: string,
    iconName: IoniconName,
    accentColor: string,
    onPress: () => void
  ) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.roleCard,
        isTablet && localStyles.roleCardTablet,
        {
          borderColor: pressed ? accentColor : styles.palette.highlight,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={[localStyles.roleAccent, { backgroundColor: accentColor }]} />
      <View style={[localStyles.roleIconShell, { borderColor: accentColor }]}>
        <Ionicons name={iconName} size={isTablet ? 42 : 34} color={accentColor} />
      </View>
      <Text
        style={[localStyles.roleTitle, { fontSize: isTablet ? 34 : 28 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {title}
      </Text>
    </Pressable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        <View style={localStyles.screen}>
          <View pointerEvents="none" style={localStyles.backdropLayer}>
            <View style={localStyles.leftBand} />
            <View style={localStyles.rightBand} />
            <View style={localStyles.lowerBand} />
          </View>

          <BlurView intensity={44} tint="dark" style={localStyles.topBar}>
            <View style={localStyles.topBarSide}>
              {generalComponent.getButton({
                title: 'Back',
                pDefaultButtonBgColor: styles.palette.controlSoft,
                pPressedButtonBgColor: styles.palette.controlPressed,
                buttonStyle: styles.templateSelectorStyles.button,
                textStyle: styles.generalStyles.text,
                iconName: "chevron-back",
                iconSize: 17,
                onPress: () => goToIndexScreen()
              })}
            </View>
            <View style={localStyles.topBarCenter}>
              <Text style={[localStyles.topTitle, !isTablet ? { fontSize: 24 } : undefined]}>Choose role</Text>
            </View>
            <View style={localStyles.topBarSide} />
          </BlurView>

          <View style={localStyles.body}>
            <Text
              style={[localStyles.heroTitle, { fontSize: isTablet ? 56 : 40 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.76}
            >
              Control Mode
            </Text>
            <View style={[localStyles.roleGrid, isTablet && localStyles.roleGridTablet]}>
              {roleCard('Selector', 'radio-outline', styles.palette.primary, goToSelectorScreen)}
              {roleCard('Listener', 'headset-outline', styles.palette.coral, goToListenerScreen)}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default selector_choice;

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: styles.palette.appBg,
    overflow: 'hidden',
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  leftBand: {
    position: 'absolute',
    left: -44,
    top: 94,
    width: '64%',
    height: 72,
    borderRadius: 8,
    backgroundColor: styles.palette.primarySoft,
    transform: [{ rotate: '-14deg' }],
  },
  rightBand: {
    position: 'absolute',
    right: -40,
    top: '34%',
    width: '58%',
    height: 74,
    borderRadius: 8,
    backgroundColor: styles.palette.coralSoft,
    transform: [{ rotate: '14deg' }],
  },
  lowerBand: {
    position: 'absolute',
    left: '12%',
    bottom: '16%',
    width: '80%',
    height: 52,
    borderRadius: 8,
    backgroundColor: styles.palette.violetSoft,
    transform: [{ rotate: '6deg' }],
  },
  topBar: {
    height: 70,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: styles.palette.separator,
    backgroundColor: styles.palette.chrome,
    overflow: 'hidden',
  },
  topBarSide: {
    width: 104,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: styles.palette.text,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  heroTitle: {
    color: styles.palette.text,
    fontWeight: '800',
    textAlign: 'left',
    letterSpacing: 0,
    marginBottom: 18,
  },
  roleGrid: {
    gap: 14,
  },
  roleGridTablet: {
    flexDirection: 'row',
  },
  roleCard: {
    minHeight: 148,
    justifyContent: 'center',
    backgroundColor: 'rgba(23,25,34,0.86)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    overflow: 'hidden',
    shadowColor: styles.palette.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  roleCardTablet: {
    flex: 1,
    minHeight: 240,
  },
  roleAccent: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 5,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  roleIconShell: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: styles.palette.panelDeep,
    marginBottom: 16,
  },
  roleTitle: {
    color: styles.palette.text,
    fontWeight: '800',
    letterSpacing: 0,
  },
});
