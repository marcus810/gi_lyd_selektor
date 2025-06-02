

/* libraries */
import { View, Text, SafeAreaView } from 'react-native'
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

  useEffect(() => {
    
    const fetchData = async () => {
      try {
        const templates = await db.fetchTemplates();
        setTemplateInfoList(templates);


        // Build the items array for DropDownPicker
        const ddItems = templates.map((t) => ({
          label: t.name,
          value: t.id,
        }));
        setItems(ddItems);

        // Optionally default-select the first one
        if (ddItems.length > 0) {
          setValue(ddItems[0].value);
          console.log(
            `Default template selected on load: ID=${ddItems[0].value}, name=${ddItems[0].label}`
          );
        }
      } catch (error) {
        console.warn('Error fetching templates:', error);
      }
    };
    fetchData();

    const goToIndexScreen = () => router.push('/');

    const handleSocketDisconnect = () => {
      setTimeout(() => {
        Alert.alert(
          'Failed to Reconnect',
          'The connection could not be restored. You will be redirected to the main screen.',
          [{ text: 'OK', onPress: () => goToIndexScreen() }]
        );
      }, 500);
    };
    db.onSocketDisconnect(handleSocketDisconnect);

    return () => {
      db.closeSocket();
    };
    
  }, []);

  const goToIndexScreen = () => {
    db.listenerExit(currentTemplate)
    router.push('/');
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
    } else {
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
          <View
            style={{
              height: 80,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ flex: 0.5, justifyContent: 'flex-start' }}>
              {generalComponent.getButton({
                title: 'Go Back',
                buttonStyle: styles.templateSelectorStyles.button,
                textStyle: styles.generalStyles.text,
                onPress: () => goToIndexScreen(),
              })}
            </View>
            <View style={{ flex: 5, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.templateSelectorStyles.title}>
                Choose a template to listen to
              </Text>
            </View>
          </View>

          {/* ───── Fully Centered Drop-down + Toggle Button ───── */}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* “Select Template” label, centered */}
            <Text
              style={[
                styles.generalStyles.text,
                { marginBottom: 12, fontSize: 50, textAlign: 'center' },
              ]}
            >
              Select Template:
            </Text>

            {/* Wrapper to force dropdown width to 50% of parent */}
            <View style={{ width: '50%' }}>
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
                  borderColor: '#ccc',
                  backgroundColor: '#fff',
                  width: '100%',
                }}
                dropDownContainerStyle={{
                  borderColor: '#ccc',
                  backgroundColor: '#fff',
                  width: '100%',
                }}
                labelStyle={{
                  textAlign: 'center',
                  fontSize: 30,
                }}
                placeholderStyle={{
                  textAlign: 'center',
                  fontSize: 30,
                }}
                textStyle={{
                  textAlign: 'center',
                  fontSize: 30,
                }}
              />
            </View>

            {/* Toggle button below the dropdown */}
            <View style={{ marginTop: 20 }}>
              {generalComponent.getButton({
                title: isListening ? 'Mute' : 'Listen',
                buttonStyle: {
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#007AFF',
                },
                textStyle: {
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
