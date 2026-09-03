
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
import { BlurView } from 'expo-blur'
import Ionicons from '@expo/vector-icons/Ionicons'


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
        <View pointerEvents="none" style={styles.backdropLayer}>
          <View style={styles.backdropBandPrimary} />
          <View style={styles.backdropBandCoral} />
          <View style={styles.backdropBandAmber} />
          <View style={styles.scanlineTop} />
          <View style={styles.scanlineBottom} />
        </View>

        <View style={[styles.hero, isTablet && styles.heroTablet]}>
          <View style={styles.brandColumn}>
            <View style={styles.brandPill}>
              <Ionicons name="radio-outline" size={16} color={palette.cyan} />
              <Text style={styles.brandPillText}>Live Control</Text>
            </View>

            <Text
              style={[styles.title, !isTablet ? { fontSize: 47 } : { fontSize: 82 }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              Pro Selector
            </Text>

            <View style={styles.signalRow}>
              <View style={[styles.signalBar, { backgroundColor: palette.primary }]} />
              <View style={[styles.signalBar, { backgroundColor: palette.greenSolid }]} />
              <View style={[styles.signalBar, { backgroundColor: palette.coral }]} />
            </View>
          </View>

          <BlurView intensity={34} tint="dark" style={styles.logoStage}>
            <View style={styles.logoRailLeft} />
            <View style={styles.logoRailBottom} />
            <Image source={require("../assets/images/gilydlogo.png")} style={styles.image} />
          </BlurView>
        </View>

        <BlurView intensity={38} tint="dark" style={styles.commandDock}>
          <View style={styles.connectionPill}>
            <Ionicons
              name={isButtonDisabled ? "pulse-outline" : "wifi-outline"}
              size={17}
              color={isButtonDisabled ? palette.warning : palette.greenSolid}
            />
            <Text style={styles.connectionText}>
              {isButtonDisabled ? "Searching" : "Ready"}
            </Text>
          </View>

          {generalComponent.getButton({
            title: isButtonDisabled ? "Connecting" : "Connect",
            buttonStyle: styles.button,
            textStyle: styles.buttonText,
            pDefaultButtonBgColor: palette.primary,
            pPressedButtonBgColor: palette.primaryPressed,
            isDisabled: isButtonDisabled,
            iconName: "wifi",
            iconSize: 19,
            onPress: () => searchForService()
          })}
        </BlurView>
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
    justifyContent: 'space-between',
    backgroundColor: palette.appBg,
    paddingHorizontal: 18,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.appBg,
  },
  backdropBandPrimary: {
    position: 'absolute',
    left: -40,
    top: 24,
    width: '72%',
    height: 78,
    borderRadius: 8,
    backgroundColor: palette.primarySoft,
    transform: [{ rotate: '-12deg' }],
  },
  backdropBandCoral: {
    position: 'absolute',
    right: -34,
    top: '26%',
    width: '52%',
    height: 66,
    borderRadius: 8,
    backgroundColor: palette.coralSoft,
    transform: [{ rotate: '16deg' }],
  },
  backdropBandAmber: {
    position: 'absolute',
    left: '18%',
    bottom: '19%',
    width: '72%',
    height: 56,
    borderRadius: 8,
    backgroundColor: palette.amberSoft,
    transform: [{ rotate: '8deg' }],
  },
  scanlineTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '18%',
    height: 1,
    backgroundColor: palette.separator,
  },
  scanlineBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '28%',
    height: 1,
    backgroundColor: palette.separator,
  },
  hero: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    gap: 18,
  },
  heroTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 28,
  },
  brandColumn: {
    minHeight: 160,
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  brandPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: palette.panelDeep,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    marginBottom: 12,
  },
  brandPillText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  title: {
    alignSelf: "flex-start",
    color: palette.text,
    fontWeight: "800",
    textAlign: "left",
    letterSpacing: 0,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  signalBar: {
    width: 46,
    height: 5,
    borderRadius: 8,
  },
  logoStage: {
    width: '100%',
    maxWidth: 460,
    height: '33%',
    minHeight: 150,
    maxHeight: 300,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(23,25,34,0.74)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.highlight,
    padding: 22,
    overflow: 'hidden',
    shadowColor: palette.primary,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  logoRailLeft: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 5,
    backgroundColor: palette.cyan,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  logoRailBottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    height: 4,
    backgroundColor: palette.coral,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  commandDock: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: palette.chrome,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.highlight,
    padding: 10,
    overflow: 'hidden',
  },
  connectionPill: {
    minWidth: 104,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: palette.panelDeep,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  connectionText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  button: {
    flex: 1,
    minWidth: 0,
    maxWidth: 520,
    height: 56,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.primary,
    borderWidth: 0,
    borderColor: palette.primary,
    paddingHorizontal: 18,
    shadowColor: palette.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  buttonText: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0,
  },
  image:{
        width: "100%",
        height: "100%",
        resizeMode: "contain"
    },
})
