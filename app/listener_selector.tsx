

/* libraries */
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert } from 'react-native';  // To show alerts
/* our files */
import * as styles from '../scripts/styles'
import DropDownPicker from 'react-native-dropdown-picker';
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import * as Device from 'expo-device';




const ListenerSelector = () => {
  const router = useRouter();
  const db = DatabaseHandler.getInstance();

  // Raw list from the database
  const [templateInfoList, setTemplateInfoList] = useState<types.TemplateInfo[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<types.TemplateInfo>();

  // DropDownPicker states
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | null>(null);
  const [items, setItems] = useState<Array<{ label: string; value: number }>>([]);

  // Toggle state: false → not listening (button says "Listen"), true → listening (button says "Mute")
  const [isListening, setIsListening] = useState(!db.isMuted);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;
    const fetchDeviceType = async () => {
      const type = await Device.getDeviceTypeAsync();
      setIsTablet(type === Device.DeviceType.TABLET);
    };

    fetchDeviceType();
    
    const fetchData = async () => {
      try {
        const templates = await db.fetchTemplates();
        setTemplateInfoList(templates);


        // Build the items array for DropDownPicker
        const ddItems = templates.map((t) => ({
          label: t.name,
          value: t.id,
        }));
        const programItem = { label: "PGM", value: -1 };
        setItems([programItem, ...ddItems]);

        // Optionally default-select the first one
        if (ddItems.length > 0) {
          setValue(-1);
          console.log(
            `Default template selected on load: ID=${ddItems[0].value}, name=${ddItems[0].label}`
          );
        }
      } catch (error) {
        console.warn('Error fetching templates:', error);
      }
    };
    fetchData();

    const goToIndexScreen = () => router.dismissTo('/');

    const handleSocketDisconnect = () => {
      redirectTimer = setTimeout(() => {
        Alert.alert(
          'Failed to Reconnect',
          'The connection could not be restored. You will be redirected to the main screen.',
          [{ text: 'OK', onPress: () => goToIndexScreen() }]
        );
      }, 500);
    };
    const removeDisconnectHandler = db.onSocketDisconnect(handleSocketDisconnect);

    return () => {
      removeDisconnectHandler();
      if (redirectTimer !== null) {
        clearTimeout(redirectTimer);
      }
      db.closeSocket();
    };
    
  }, []);

  const goToIndexScreen = () => {
    db.listenerExit(currentTemplate)
    router.dismissTo('/');
  };

  // Called whenever the user picks a different value
  const onValueChange = async (selectedId: number | null) => {
    setValue(selectedId);
    if (selectedId === null) {
      console.log('No template selected');
      return;
    }
    const chosenTemplate = templateInfoList.find((t) => t.id === selectedId);
    if (chosenTemplate) {
      console.log(`Template picked: ID=${chosenTemplate.id}, name=${chosenTemplate.name}`);
      setCurrentTemplate(chosenTemplate)
      await db.listenerJoin(chosenTemplate)
    } 
    else if (selectedId === -1){
      const fakeTemplate = { id: -1,
        name: "",
        noDelayPort: 0,
        delayPort: 0,
        micPort: 0,
        intercomOutputPort: 0,
        intercomInfo: [],
        delay: 0,
        omniState: false,
        omniName: "",
        groupState: false,
        groupName: "",
        deviceUuid:"",
        deviceExpiryDate: "",
        lastActivationUtc: "",
        autoDuck: false,
        autoDuckGain: 1,
        autoDuckThreshold: 0,
        autoDuckRelease: 0,
        isMaster: false,
        isTabMaster: false,
        isSlave: false,
        slaveColor: "" }
        setCurrentTemplate(fakeTemplate)
        await db.listenerJoin(fakeTemplate)
    }
    else {
      console.log(`Template picked: ID=${selectedId}`);
    }


  };

  // Toggle between listening and muted
  const handleToggle = () => {
    setIsListening((prev) => {
      const next = !prev;
      if (next) { 
        db.isMuted = false
        db.playRemoteStream()
        console.log('Now Listening');
      } else {
        db.isMuted = true
        db.playRemoteStream()
        console.log('Muted');
      }
      return next;
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        <View style={styles.templateSelectorStyles.container}>
          <View style={styles.templateSelectorStyles.header}>
            <View style={styles.templateSelectorStyles.headerSide}>
              {generalComponent.getButton({
                title: 'Go Back',
                pDefaultButtonBgColor: styles.palette.control,
                pPressedButtonBgColor: styles.palette.controlPressed,
                buttonStyle: styles.templateSelectorStyles.button,
                textStyle: styles.generalStyles.text,
                onPress: () => goToIndexScreen(),
              })}
            </View>
            <View style={styles.templateSelectorStyles.headerCenter} />
            <View style={styles.templateSelectorStyles.headerSide} />
          </View>

          {/* ───── Fully Centered Drop-down + Toggle Button ───── */}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 16,
            }}
          >
            {/* “Select Template” label, centered */}
            <Text
              style={[
                styles.generalStyles.text,
                { marginBottom: 12, textAlign: 'center'}, !isTablet ? { fontSize:  30} : { fontSize:  50},
              ]}
            >
              Select Template:
            </Text>

            {/* Wrapper to force dropdown width to 50% of parent */}
            <View style={{ width: isTablet ? '50%' : '72%', zIndex: 10 }}>
              <DropDownPicker
                open={open}
                value={value}
                items={items}
                setOpen={setOpen}            // actual setState from useState
                setValue={setValue}          // actual setState from useState
                setItems={setItems}          // actual setState from useState
                onChangeValue={onValueChange}
                placeholder="Pick a template…"
                showTickIcon={false}
                itemSeparator={true}

                scrollViewProps={{
                  nestedScrollEnabled: true,
                }}
                showArrowIcon={false}
                style={{
                  borderColor: styles.palette.borderStrong,
                  backgroundColor: styles.palette.panelRaised,
                  width: '100%',
                  minHeight: 54,
                  borderRadius: 8,
                }}
                dropDownContainerStyle={{
                  borderColor: styles.palette.borderStrong,
                  backgroundColor: styles.palette.panelRaised,
                  width: '100%',
                  borderRadius: 8,
                }}
                labelStyle={[
                  {textAlign: 'center', color: styles.palette.text,
                  }, !isTablet ? { fontSize:  20} : { fontSize:  30}
                ]}
                placeholderStyle={[
                  {textAlign: 'center', color: styles.palette.textMuted,
                  }, !isTablet ? { fontSize:  20} : { fontSize:  30}
                ]}
                textStyle={[styles.generalStyles.text,
                  {textAlign: 'center',
                  color: styles.palette.text}, !isTablet ? { fontSize:  20} : { fontSize:  30}
                ]}
                listItemLabelStyle={{
                  color: styles.palette.text,
                  textAlign: 'center',
                }}
                selectedItemContainerStyle={{
                  backgroundColor: styles.palette.controlPressed,
                }}
                itemSeparatorStyle={{
                  backgroundColor: styles.palette.border,
                }}
              />
            </View>

            {/* Toggle button below the dropdown */}
            <View style={{ marginTop: 20 }}>
              {generalComponent.getButton({
                title: isListening ? 'Mute' : 'Listen',
                pDefaultButtonBgColor: isListening ? styles.palette.danger : styles.palette.control,
                pPressedButtonBgColor: styles.palette.controlPressed,
                buttonStyle: {
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  minWidth: 150,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: styles.palette.borderStrong,
                },
                textStyle: {...styles.generalStyles.text,
                  color: '#fff',
                  fontSize: 16,
                },
                onPress: handleToggle,
              })}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ListenerSelector;
