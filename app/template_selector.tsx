

/* libraries */
import { View, Text, AppState, AppStateStatus } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Alert } from 'react-native';  // To show alerts
/* our files */
import * as styles from '../scripts/styles'
import { TemplateContainer } from '@/scripts/template_selector_scripts/TemplateContainer';
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import * as Device from 'expo-device';
import * as misc from './../scripts/misc'

const template_selektor = () => {
  /*routing*/
  const router = useRouter()
  const db = DatabaseHandler.getInstance()
  
  const [templateInfoList, setTemplateInfoList] = useState<types.TemplateInfo[]>([]);
  const [isTablet, setIsTablet] = useState(false);

useEffect(() => {
  let redirectTimer: ReturnType<typeof setTimeout> | null = null;

  const fetchData = async () => {
    try {
      const type = await Device.getDeviceTypeAsync();
      const tablet = type === Device.DeviceType.TABLET;
      setIsTablet(tablet);

      const templates = await db.fetchTemplates();
      const unclaimed = templates.filter(t => t.deviceUuid === null);

      const allowedTemplates = tablet
        ? unclaimed
        : unclaimed.filter(t => !t.isTabMaster);

      setTemplateInfoList(allowedTemplates);
    } catch (error) {
    }
  };

  fetchData();

  const goToIndexScreen = () => {
    router.dismissTo('/');
  };

  const handleSocketDisconnect = () => {
    redirectTimer = setTimeout(() => {
      Alert.alert(
        "Failed to Reconnect",
        "The connection could not be restored. You will be redirected to the main screen.",
        [{ text: "OK", onPress: () => goToIndexScreen() }]
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

  const goToIndexScreen = () => {
    db.closeSocket()
    router.dismissTo('/')
  };

  const TemplateInfoArr = TemplateContainer(templateInfoList, isTablet)

  if (isTablet) return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        

            
          <View style={styles.templateSelectorStyles.container}>
            <View style={styles.templateSelectorStyles.header}>
              <View style={styles.templateSelectorStyles.headerSide}>
              {generalComponent.getButton({
                title: "Go Back",
                buttonStyle: styles.templateSelectorStyles.button,
                textStyle: styles.generalStyles.text,
                pDefaultButtonBgColor: styles.palette.control,
                pPressedButtonBgColor: styles.palette.controlPressed,
                onPress: () => goToIndexScreen()
              })}
              </View>
              <View style={styles.templateSelectorStyles.headerCenter}>
                <Text style={styles.templateSelectorStyles.title}>Choose template</Text>
              </View>
              <View style={styles.templateSelectorStyles.headerSide} />
            </View>
            
            
            <ScrollView 
              horizontal={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <View style={styles.templateSelectorStyles.scrollObjectContainer}>

                {TemplateInfoArr}

              </View>
            </ScrollView>

          </View>

      </SafeAreaView>
    </GestureHandlerRootView>
  )
  else return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        

            
          <View style={styles.templateSelectorStyles.container}>

              <View style={styles.templateSelectorStyles.header}>
              <View
                style={{
                  ...styles.templateSelectorStyles.headerSide,
                  flex: 0,
                  width: 88,
                  minWidth: 88,
                  alignItems: 'flex-start',
                }}
              >
              {generalComponent.getButton({
                title: "Go Back",
                buttonStyle: {
                  ...styles.templateSelectorStyles.button,
                  width: 78,
                  height: 44,
                  marginLeft: 0,
                  paddingHorizontal: 5,
                },
                textStyle: styles.generalStyles.text,
                pDefaultButtonBgColor: styles.palette.control,
                pPressedButtonBgColor: styles.palette.controlPressed,
                onPress: () => goToIndexScreen()
                
              })}
              </View>
              <View
                style={{
                  ...styles.templateSelectorStyles.headerCenter,
                  flex: 1,
                  minWidth: 0,
                  paddingHorizontal: 8,
                }}
              >
              <Text
                style={{
                  ...styles.templateSelectorStyles.title,
                  fontSize: 24,
                  justifyContent:"center",
                  alignItems:"center",
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Choose template
              </Text>
              </View>
              <View style={{ ...styles.templateSelectorStyles.headerSide, flex: 0, width: 88, minWidth: 88 }} />
              </View>


            
            
            <ScrollView 
              
              horizontal={false}
              bounces={false}
              style={{ flex:1}}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <View style={{...styles.templateSelectorStyles.scrollObjectContainer, width: misc.getLandscapeHeight()}}>

                {TemplateInfoArr}

              </View>
            </ScrollView>

          </View>

      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default template_selektor
