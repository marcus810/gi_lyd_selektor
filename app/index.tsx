
import { View, Text, StyleSheet, Pressable, SafeAreaView, StatusBar, Platform} from 'react-native'
import React, { useState, useEffect } from 'react'
import { Alert } from 'react-native';  // To show alerts
import Zeroconf from 'react-native-zeroconf';
import { DatabaseHandler } from '@/scripts/database/database'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';  // Import UUID generator




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
    
    console.log("Initializing Zeroconf...");

    setIsButtonDisabled(true);

    const zeroconf = new Zeroconf();
    // Start scanning for the specific service (e.g., '_http._tcp' for HTTP services)
    zeroconf.on('start', () => {
      
        console.log('Scan started...');
        setTimeout(() => {
          console.log('Stopping Zeroconf scan after 6 seconds...');
          zeroconf.stop();  // Stop scanning
          zeroconf.removeDeviceListeners();  // Remove device listeners
          zeroconf.removeAllListeners();  // Remove all event listeners
          setIsButtonDisabled(false);
      }, 6000);  // 6000 milliseconds = 6 seconds
    });

    // Event triggered when a service is found (but not fully resolved)
    zeroconf.on('found', (service) => {
        if (service === 'gi_lyd_selector') {
            console.log('Service found:', service);
            console.log('Service is found but not fully resolved yet.');
        }
    });

    // Event triggered when a service is resolved (fully discovered)
    zeroconf.on('resolved', (service) => {
        if (service.name === 'gi_lyd_selector') {
            console.log('Resolved service:', service);
            console.log('IP Address:', service.host);  // The IP address of the resolved service
            console.log('Port:', service.port);       // The port of the resolved service
        }
        // Stop any previous scans to ensure a clean start
        zeroconf.stop();  // Stop scanning
        zeroconf.removeDeviceListeners();  // Remove device listeners
        zeroconf.removeAllListeners();  // Remove all event listeners
        const api_url = `http://${service.txt.local_ip}:${service.txt.port}`
        console.log(api_url)
        db.setApiUrl(api_url)
        db.onSocketDisconnect(handleSocketDisconnect);

        db.connectSocket(uuid, false)

    });

    // Event triggered when a service is removed
    zeroconf.on('remove', (name) => {
        console.log('Service removed:', name);
    });

    // Event triggered when an error occurs
    zeroconf.on('error', (err) => {
      zeroconf.stop();  // Stop scanning
      zeroconf.removeDeviceListeners();  // Remove device listeners
      zeroconf.removeAllListeners();  // Remove all event listeners
        console.error('Zeroconf error:', err);
    });

    // Start scanning for the service (adjust the service type accordingly)
    zeroconf.scan('http', 'tcp', 'local.');

});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const deviceUUID = await getUUID();
        setUuid(deviceUUID)
        console.log('Device UUID:', deviceUUID);  // You can send this to your server for tracking
      }catch (error) {
        console.error('Error fetching UUID in Index:', error);
      }
    }
    fetchData()
    }, []);  // Empty dependency array to run only once when the component mounts
  
  

   
  return (
    <SafeAreaView style={styles.safeContainer}>
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Gi Lyd Selektor</Text>
      </View>
      <View style={styles.linkContainer}>
        {/* <Link href="/selektor" style={{ marginHorizontal: "auto" }} asChild> */}
          <Pressable style={styles.button} onPress={searchForService} disabled={isButtonDisabled}>
            <Text style={styles.buttonText}>Connect</Text>
          </Pressable>
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
    fontSize: 50,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 40
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