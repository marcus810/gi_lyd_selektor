

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
import * as misc from './../scripts/misc'

const template_selektor = () => {
  /*routing*/
  const router = useRouter()
  const db = DatabaseHandler.getInstance()
  
  const [templateInfoList, setTemplateInfoList] = useState<types.TemplateInfo[]>([]);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
      const fetchDeviceType = async () => {
        const type = await Device.getDeviceTypeAsync();
        setIsTablet(type === Device.DeviceType.TABLET);
      };
  
      fetchDeviceType();

    const fetchData = async () => {
        try {
            const templates = await db.fetchTemplates();  // Await the promise to get the actual data
            const unclaimed = templates.filter(t => t.deviceUuid === null);  
            setTemplateInfoList(unclaimed)  // Set the state with the resolved data
            
        } catch (error) {
        }
    };

    fetchData();  // Call the async function to fetch the data

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

  const goToIndexScreen = () => {
    db.closeSocket()
    router.push('/')
  };

  const TemplateInfoArr = TemplateContainer(templateInfoList, isTablet)

  if (isTablet) return (
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
                <Text style={styles.templateSelectorStyles.title}>Choose template</Text>
              </View>
            </View>
            
            
            <ScrollView 
              horizontal={false}
              bounces={false}
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
    <GestureHandlerRootView>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        

            
          <View style={styles.templateSelectorStyles.container}>

              <View style={{alignSelf: "center", justifyContent: "space-between", flex:0.12, flexDirection: "row", width: "100%", alignContent: "center", alignItems: "center"}}>
              {generalComponent.getButton({
                title: "Go Back",
                buttonStyle: styles.templateSelectorStyles.button,
                textStyle: styles.generalStyles.text,
                onPress: () => goToIndexScreen()
                
              })}
              <Text style={{...styles.templateSelectorStyles.title, fontSize: 30, justifyContent:"center", alignItems:"center"}}>Choose template</Text>
              </View>


            
            
            <ScrollView 
              
              horizontal={false}
              bounces={false}
              style={{ flex:1}}
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