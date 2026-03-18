
import { View, Text, StyleSheet, Pressable, SafeAreaView, StatusBar, Platform, Image, Modal, } from 'react-native'
import Slider from '@react-native-community/slider';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import React, { useState, useEffect } from 'react'
import { Alert } from 'react-native';  // To show alerts
import { DatabaseHandler } from '@/scripts/database/database'
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as Device from 'expo-device';
import * as ServiceDiscovery from '@inthepocket/react-native-service-discovery';


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

const searchForService = () => {
  setIsButtonDisabled(true);
  let resolved = false;

  const sub = ServiceDiscovery.addEventListener('serviceFound', (service) => {
    // service has: name, addresses[], port, txt, etc. :contentReference[oaicite:3]{index=3}
    if (service.name === 'gi_lyd_selector') {
      resolved = true;
      ServiceDiscovery.stopSearch('http').catch(() => {});
      sub.remove();

      const ip = service.addresses?.[0];
      if (!ip) {
        setIsButtonDisabled(false);
        handleSocketDisconnect();
        return;
      }

      const api_url = `http://${ip}:${service.port}`;
      db.setApiUrl(api_url);
      db.onSocketDisconnect(handleSocketDisconnect);
      db.connectSelectorSocket(uuid, false);
      setIsButtonDisabled(false);
    }
  });

  ServiceDiscovery.startSearch('http').catch(() => {
    sub.remove();
    setIsButtonDisabled(false);
    handleSocketDisconnect();
  });

  setTimeout(() => {
    ServiceDiscovery.stopSearch('http').catch(() => {});
    sub.remove();
    setIsButtonDisabled(false);
    if (!resolved) handleSocketDisconnect();
  }, 4000);
};
  
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const fetchDeviceType = async () => {
      const type = await Device.getDeviceTypeAsync();
      setIsTablet(type === Device.DeviceType.TABLET);
    };
    fetchDeviceType()
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
        <Text   style={[styles.title, !isTablet ? { fontSize:  45} : {fontSize: 90}]}>Pro Selector</Text>
      </View>
      <View style={styles.imageContainer}>
        <Image source={require("../assets/images/gilydlogo.png")} style={styles.image}></Image>
      </View>
      <View style={styles.linkContainer}>
        {/* <Link href="/selektor" style={{ marginHorizontal: "auto" }} asChild> */}

          {generalComponent.getButton({
            title: "Connect",
            buttonStyle: styles.button,
            textStyle: styles.buttonText,
            pDefaultButtonBgColor: 'rgba(66, 63, 63, 0.75)',
            isDisabled: isButtonDisabled,
            onPress: () => searchForService()
          })}
        {/* </Link>//supportedOrientations={["landscape", 'landscape-left', 'landscape-right']} */}
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
    backgroundColor: 'rgb(36, 34, 34)',
  },
  titleContainer:{
    flex: 1,
    flexDirection: "column",
    alignSelf: 'center',
    marginTop:30
  },
  imageContainer:{
    flex:1
  },
  linkContainer:{
    flex: 2,
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
  image:{
        width: "100%",
        height: "70%",
        resizeMode: "contain"
    },
})

  const localstyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '40%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 20,
  },
});