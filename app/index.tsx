
import { View, Text, StyleSheet, StatusBar, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState, useEffect } from 'react'
import { Alert } from 'react-native';  // To show alerts
import { DatabaseHandler } from '@/scripts/database/database'
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as generalComponent from '../scripts/general_scripts/custom_components'
import { palette } from '../scripts/styles'
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
            pDefaultButtonBgColor: palette.control,
            pPressedButtonBgColor: palette.controlPressed,
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
    backgroundColor: palette.appBg,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: palette.appBg,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  titleContainer:{
    flex: 0.9,
    flexDirection: "column",
    alignSelf: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  imageContainer:{
    flex: 1.2,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkContainer:{
    flex: 1.3,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  title: {
    alignSelf: "center",
    color: palette.text,
    fontSize: 90,
    fontWeight: "900",
    textAlign: "center",
  },
  button: {
    minWidth: 210,
    width: '58%',
    maxWidth: 420,
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.control,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  image:{
        width: "100%",
        height: "74%",
        resizeMode: "contain"
    },
})

  const localstyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '40%',
    padding: 20,
    backgroundColor: palette.panelRaised,
    borderRadius: 8,
    borderColor: palette.borderStrong,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 20,
  },
});
