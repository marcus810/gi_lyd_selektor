/* selector_choice.tsx (safe/native wrapper) */
import React, { useEffect, useState } from 'react';
import { View, Text, NativeModules, SafeAreaView, Alert, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
      setTimeout(() => {
        Alert.alert(
          'Failed to Reconnect',
          'The connection could not be restored. You will be redirected to the main screen.',
          [{ text: 'OK', onPress: () => { db.closeSocket(); router.push('/'); } }]
        );
      }, 500);
    };
    db.onSocketDisconnect(handleSocketDisconnect);

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
    router.push('/');
  };

  return (
    <GestureHandlerRootView>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        <View style={styles.templateSelectorStyles.container}>
          <View style={{ height: 80, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ alignSelf: 'center', justifyContent: 'flex-start', flex: 0.5 }}>
              {generalComponent.getButton({
                title: 'Go Back',
                pDefaultButtonBgColor: 'rgba(66, 63, 63, 0.75)',
                buttonStyle: styles.templateSelectorStyles.button,
                textStyle: styles.generalStyles.text,
                onPress: () => goToIndexScreen()
              })}
            </View>
            <View style={{ alignSelf: 'center', justifyContent: 'center', flex: 5 }}>
              <Text style={[styles.templateSelectorStyles.title, !isTablet ? { fontSize: 30 } : undefined]}>Choose role</Text>
            </View>
          </View>

          <View style={styles.templateSelectorStyles.linkContainer}>
            {generalComponent.getButton({
              title: 'Selector',
              buttonStyle: styles.generalStyles.indexButton,
              textStyle: styles.generalStyles.indexButtonText,
              pDefaultButtonBgColor: 'rgba(66, 63, 63, 0.75)',
              onPress: goToSelectorScreen,
            })}
            {generalComponent.getButton({
              title: 'Listener',
              buttonStyle: styles.generalStyles.indexButton,
              textStyle: styles.generalStyles.indexButtonText,
              pDefaultButtonBgColor: 'rgba(66, 63, 63, 0.75)',
              onPress: goToListenerScreen
            })}
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default selector_choice;
