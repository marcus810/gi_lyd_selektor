

/* libraries */
import { View, Text, SafeAreaView, AppState, AppStateStatus } from 'react-native'
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



const selector_choice = () => {
  /*routing*/
  const router = useRouter()
  const db = DatabaseHandler.getInstance()


  const goToIndexScreen = () => {
    db.closeSocket()
    router.push('/')
  };

  const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
      const fetchDeviceType = async () => {
        const type = await Device.getDeviceTypeAsync();
        setIsTablet(type === Device.DeviceType.TABLET);
      };

      fetchDeviceType();
  
          const goToIndexScreen = () => {
            
            router.push('/')
          };
        
          const handleSocketDisconnect = () => {
        
              // Handle the case where the socket fails to reconnect after 3 attempts
              setTimeout(() => {
                  Alert.alert(
                      "Failed to Reconnect",
                      "The connection could not be restored. You will be redirected to the main screen.",
                      [{ text: "OK", onPress: () => goToIndexScreen() }]
                  );
              }, 500);  // Show after waiting for a while to give reconnection a chance
          };
          db.onSocketDisconnect(handleSocketDisconnect);
    }, []);  // Empty dependency array to run only once when the component mounts


  const goToSelectorScreen = () => {
    
    router.push('/template_selector')
  };

  const goToListenerScreen = () => {
    
    router.push('/listener_selector')
  };

  return (
    <GestureHandlerRootView>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        

            
          <View style={styles.templateSelectorStyles.container}>
            <View style={{height:80, display: "flex", flexDirection: "row", alignItems: 'center', justifyContent: "center"}}>
              <View style={{alignSelf: "center", justifyContent: "flex-start", flex:0.5}}>
              {generalComponent.getButton({
                title: "Go Back",
                buttonStyle: styles.templateSelectorStyles.button,
                textStyle: styles.generalStyles.text,
                onPress: () => goToIndexScreen()
              })}
              </View>
              <View style={{alignSelf: "center", justifyContent: "center", flex:5}}>
                <Text style={styles.templateSelectorStyles.title}>Choose role</Text>
              </View>
            </View>
              <View style={styles.templateSelectorStyles.linkContainer}>
              {isTablet &&
                generalComponent.getButton({
                  title: 'Selector',
                  buttonStyle: styles.generalStyles.indexButton,
                  textStyle: styles.generalStyles.indexButtonText,
                  pDefaultButtonBgColor: 'rgba(0,0,150,0.5)',
                  onPress: goToSelectorScreen,
                })}
              {generalComponent.getButton({
                title: 'Listener',
                buttonStyle: styles.generalStyles.indexButton,
                textStyle: styles.generalStyles.indexButtonText,
                pDefaultButtonBgColor: 'rgba(0,0,150,0.5)',
                onPress: goToListenerScreen
              })}
              </View>
            

          </View>

      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default selector_choice