
import { View, Text, StyleSheet, Pressable, SafeAreaView, StatusBar, Platform, NativeModules} from 'react-native'
import React, { useState, useEffect } from 'react'
import { Link } from 'expo-router'
import Zeroconf from 'react-native-zeroconf';
import * as db from '../scripts/database/database'
const index = () => {

//   const test = (() => {
//     console.log("Initializing Zeroconf...");

//     const zeroconf = new Zeroconf();

//     // Start scanning for the specific service (e.g., '_http._tcp' for HTTP services)
//     zeroconf.on('start', () => {
//         console.log('Scan started...');
//     });

//     // Event triggered when a service is found (but not fully resolved)
//     zeroconf.on('found', (service) => {
//         if (service === 'gi_lyd_selector') {
//             console.log('Service found:', service);
//             console.log('Service is found but not fully resolved yet.');
//         }
//     });

//     // Event triggered when a service is resolved (fully discovered)
//     zeroconf.on('resolved', (service) => {
//         if (service.name === 'gi_lyd_selector') {
//             console.log('Resolved service:', service);
//             console.log('IP Address:', service.host);  // The IP address of the resolved service
//             console.log('Port:', service.port);       // The port of the resolved service
//             zeroconf.stop();  // Stop scanning once the service is resolved
//         }
//     });

//     // Event triggered when a service is removed
//     zeroconf.on('remove', (name) => {
//         console.log('Service removed:', name);
//     });

//     // Event triggered when an error occurs
//     zeroconf.on('error', (err) => {
//         console.error('Zeroconf error:', err);
//     });

//     // Stop any previous scans to ensure a clean start
//     zeroconf.stop();

//     // Start scanning for the service (adjust the service type accordingly)
//     zeroconf.scan('http', 'tcp', 'local.');

// });
  

   
  return (
    <SafeAreaView style={styles.safeContainer}>
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Gi Lyd Selektor</Text>
      </View>
      <View style={styles.linkContainer}>
        <Link href="/selektor" style={{ marginHorizontal: "auto" }} asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Connect</Text>
          </Pressable>
        </Link>
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