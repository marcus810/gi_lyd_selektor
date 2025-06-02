
import { View, Text, StyleSheet, Pressable, SafeAreaView, StatusBar, Platform} from 'react-native'

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import React, { useState, useEffect } from 'react'
import { Alert } from 'react-native';  // To show alerts
import Zeroconf from 'react-native-zeroconf';
import { DatabaseHandler } from '@/scripts/database/database'
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as generalComponent from '../scripts/general_scripts/custom_components'




const index = () => {
  const getUUID = async () => {
    // Try to get the UUID from AsyncStorage
    const storedUUID = await AsyncStorage.getItem('device_uuid');
    
    // If no UUID exists, return null
    if (!storedUUID) {
      return null;
    }
  
    // If a UUID is found, return it
    return storedUUID;
  };

  const [uuid, setUuid] = useState<string | null>(null);

  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const db = DatabaseHandler.getInstance()
  

    const handleSocketDisconnect = () => {
        
  
        // Handle the case where the socket fails to reconnect after 3 attempts

            Alert.alert(
                "Failed to connect",
                "Check if a Pro Selector Server is running on the local network",
                [{ text: "OK"}]
            );
          // Show after waiting for a while to give reconnection a chance
    };

  const searchForService = (() => {

    setIsButtonDisabled(true);
    let resolved = false

    const zeroconf = new Zeroconf();
    // Start scanning for the specific service (e.g., '_http._tcp' for HTTP services)
    zeroconf.on('start', () => {
      
        setTimeout(() => {
          zeroconf.stop();  // Stop scanning
          zeroconf.removeDeviceListeners();  // Remove device listeners
          zeroconf.removeAllListeners();  // Remove all event listeners
          setIsButtonDisabled(false);
          if (!resolved){
            handleSocketDisconnect()
          }

      }, 4000);  // 6000 milliseconds = 6 seconds
    });

    // Event triggered when a service is found (but not fully resolved)

    // Event triggered when a service is resolved (fully discovered)
    zeroconf.on('resolved', (service) => {
        
        if (service.name === 'gi_lyd_selector') {
            resolved = true
                    // Stop any previous scans to ensure a clean start
            zeroconf.stop();  // Stop scanning
            zeroconf.removeDeviceListeners();  // Remove device listeners
            zeroconf.removeAllListeners();  // Remove all event listeners
            const api_url = `http://${service.txt.local_ip}:${service.txt.port}`
            db.setApiUrl(api_url)
            db.onSocketDisconnect(handleSocketDisconnect);
            db.connectSelectorSocket(uuid, false)
        }

        

    });

    // Event triggered when a service is removed

    // Event triggered when an error occurs
    zeroconf.on('error', (err) => {
      zeroconf.stop();  // Stop scanning
      zeroconf.removeDeviceListeners();  // Remove device listeners
      zeroconf.removeAllListeners();  // Remove all event listeners
    });

    // Start scanning for the service (adjust the service type accordingly)
    zeroconf.scan('http', 'tcp', 'local.');

});

  useEffect(() => {
    StatusBar.setHidden(true);

    const fetchData = async () => {
      try {
        const deviceUUID = await getUUID();
        setUuid(deviceUUID)

      }catch (error) {

      }
    }
    fetchData()

    
    }, []);  // Empty dependency array to run only once when the component mounts
  
  

   
  return (
    <SafeAreaView style={styles.safeContainer}>
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Pro Selector</Text>
      </View>
      <View style={styles.linkContainer}>
        {/* <Link href="/selektor" style={{ marginHorizontal: "auto" }} asChild> */}

          {generalComponent.getButton({
            title: "Connect",
            buttonStyle: styles.button,
            textStyle: styles.buttonText,
            pDefaultButtonBgColor: 'rgba(0,0,150,0.5)',
            isDisabled: isButtonDisabled,
            onPress: () => searchForService()
          })}
        {/* </Link> */}
      </View>
    </View>
    </SafeAreaView>
  )
}

export default index

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  titleContainer:{
    flex: 1,
    flexDirection: "column",
    alignSelf: 'center',
  },
  linkContainer:{
    flex: 1,
    alignSelf: 'center'
  },
  title: {
    alignSelf: "flex-start",
    color: "white",
    fontSize: 90,
    fontWeight: "bold",
    textAlign: "center",
  },
  button: {
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    backgroundColor: "rgba(255,250,250,0.25)",
    padding: 6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
})