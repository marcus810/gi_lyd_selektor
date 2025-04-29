

/* libraries */
import { View, Text, SafeAreaView, AppState, AppStateStatus, Pressable} from 'react-native'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Alert } from 'react-native';  // To show alerts
/* our files */
import * as styles from '../scripts/styles'
import * as containers from '../scripts/selector_scripts/InfoViewContainers'
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter, useGlobalSearchParams } from 'expo-router'
import React, { useState, useEffect } from 'react'



const selektor = () => {
  /*routing*/
  const router = useRouter()
  const db = DatabaseHandler.getInstance()
  const { template } = useGlobalSearchParams(); // Access the 'template' query parameter

  const [inputInfoList, setInputInfoList] = useState<types.InputInfo[]>([])
  const [templateInfoList, setTemplateInfoList] = useState<types.TemplateInfo[]>([]);
  const [intercomInfoList, setIntercomInfoList] = useState<types.IntercomInfo[]>([]);
  const [chosenTemplate, setChosenTemplate] = useState<types.TemplateInfo>();

  const [intercomOmniListPorts, setIntercomOmniListPorts] = useState<number[]>()
  const [omniIsOn, setOmniIsOn] = useState(false)

  const [loading, setLoading] = useState(true);  // Add loading state

  const goToIndexScreen = (chosenTemplate: types.TemplateInfo) => {
    db.playerExit(chosenTemplate)
    router.push('/')
  };

  const handleSocketDisconnect = () => {
      // Handle the case where the socket fails to reconnect after 3 attempts

      Alert.alert(
          "Failed to Reconnect",
          "The connection could not be restored. You will be redirected to the main screen.",
          [{ text: "OK", onPress: () => goToIndexScreen(chosenTemplate as types.TemplateInfo) }]
      );
  };


  


  useEffect(() => {

    // Function to run when app goes to the background or is closed
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'inactive') {
        // Call your function here
        console.log('App is closed.');
        // You can perform your cleanup or save state here
        appStateListener.remove()
      }
    };
    // Register the disconnection handler
    db.onSocketDisconnect(handleSocketDisconnect);

    // Add event listener to listen for changes in app state
    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    console.log("selektor loaded")
    const fetchData = async () => {
        try {
            

            let parsedTemplate = null;
            if (template) {
              try {
                // Parse the template data from the query string
                parsedTemplate = JSON.parse(decodeURIComponent(template as string));
              } catch (error) {
                console.error("Error parsing template data:", error);
              }
            }
            
            setChosenTemplate(parsedTemplate)
            const inputs = await db.fetchInputs();  // Await the promise to get the actual data
            await db.playerJoin(parsedTemplate)
            setInputInfoList(inputs)
            setIntercomInfoList(parsedTemplate.intercomInfo)
            setIntercomOmniListPorts(db.addOmniToList(parsedTemplate.intercomInfo))

            

        } catch (error) {
            console.error('Error fetching templates:', error);
            console.log('Full error details in fetchData:', JSON.stringify(error, null, 2));
            router.push("/template_selector")
        } finally {
          setLoading(false)
        }
    };

    fetchData();  // Call the async function to fetch the data

    db.intercomInfoListSetter = setIntercomInfoList
    db.inputInfoListSetter = setInputInfoList
    db.chosenTemplateSetter = setChosenTemplate
    db.intercomOmniListPortsSetter = setIntercomOmniListPorts
    
  }, []);  // Empty dependency array to run only once when the component mounts

  

  const handleToggleLatch = (setToggle: React.Dispatch<React.SetStateAction<boolean>>, toggle: boolean, chosenTemplate: types.TemplateInfo, ports: number[] | undefined) => {
    setToggle((prev) => !prev);
        if (toggle){
          db.sendOutputOffOmni(chosenTemplate, ports)
        }
        else{
          db.sendOutputOnOmni(chosenTemplate, ports)
        }
    };
  const handleToggleUnlatchPress = (setToggle: React.Dispatch<React.SetStateAction<boolean>>, chosenTemplate: types.TemplateInfo | undefined, ports: number[] | undefined) => {
    setToggle((prev) => !prev);
    db.sendOutputOnOmni(chosenTemplate, ports)   
  };
  
  const handleToggleUnlatchRelease = (setToggle: React.Dispatch<React.SetStateAction<boolean>>, chosenTemplate: types.TemplateInfo | undefined, ports: number[] | undefined) => {
    setToggle((prev) => !prev);
    db.sendOutputOffOmni(chosenTemplate, ports)   
  };

  /* userefs */

  // const [outputInfoArr, outputRefArr] = selektorComponent.getInfoViews({
  //   outerViewStyle: styles.outputStyles.infoContainer, 
  //   imageViewStyle: styles.outputStyles.imageContainer, 
  //   textViewStyle: styles.outputStyles.textContainer, 
  //   imageStyle: styles.generalStyles.image,
  //   textStyle: styles.generalStyles.text,
  //   selectedStyle: styles.getInfoViewPressableStyle,
  //   dataType: "input",
  //   onToggle: selektorHandler.handleInfoViewToggle
  //   })

  const handleInputToggle = (port: number) => {
    
    setInputToggleStates(prev => ({
      ...prev,
      [port]: !prev[port],
    }));
  
    if (inputToggleStates[port]) {
      db.sendInputOff(chosenTemplate as types.TemplateInfo, port);
    } else {
      db.sendInputOn(chosenTemplate as types.TemplateInfo, port);
    }
  };
  
  const handleOutputToggleLatch = (port: number) => {
    setOutputToggleStates(prev => ({
      ...prev,
      [port]: !prev[port],
    }));
  
    if (outputToggleStates[port]) {
      db.sendOutputOff(chosenTemplate as types.TemplateInfo, port);
    } else {
      db.sendOutputOn(chosenTemplate as types.TemplateInfo, port);
    }
  };
  
  const handleOutputToggleUnlatchPress = (port: number) => {
    setOutputToggleStates(prev => ({
      ...prev,
      [port]: true,
    }));
    db.sendOutputOn(chosenTemplate as types.TemplateInfo, port);
  };
  
  const handleOutputToggleUnlatchRelease = (port: number) => {
    setOutputToggleStates(prev => ({
      ...prev,
      [port]: false,
    }));
    db.sendOutputOff(chosenTemplate as types.TemplateInfo, port);
  };

  useEffect(() => {
    // Clean up INPUT toggle states
    const validInputPorts = new Set(inputInfoList.map(input => input.port));
    const filteredInputToggles: { [port: number]: boolean } = {};
  
    for (const port in inputToggleStates) {
      const portNumber = Number(port);
      if (validInputPorts.has(portNumber)) {
        filteredInputToggles[portNumber] = inputToggleStates[portNumber];
      } else {
        // If port was removed, send input off
        db.sendInputOff(chosenTemplate as types.TemplateInfo, portNumber);
      }
    }
  
    setInputToggleStates(filteredInputToggles);
  
    // Clean up INTERCOM (OUTPUT) toggle states
    const validIntercomPorts = new Set(intercomInfoList.map(intercom => intercom.port));
    const filteredIntercomToggles: { [port: number]: boolean } = {};
  
    for (const port in outputToggleStates) {
      const portNumber = Number(port);
      if (validIntercomPorts.has(portNumber)) {
        filteredIntercomToggles[portNumber] = outputToggleStates[portNumber];
      } else {
        // If port was removed, send output off
        db.sendOutputOff(chosenTemplate as types.TemplateInfo, portNumber);
      }
    }
  
    setOutputToggleStates(filteredIntercomToggles);
  
  }, [inputInfoList, intercomInfoList]);


  const [inputToggleStates, setInputToggleStates] = useState<{ [port: number]: boolean }>({});
  const [outputToggleStates, setOutputToggleStates] = useState<{ [port: number]: boolean }>({});

  const outputInfoArr = containers.InfoViewOuputContainer(intercomInfoList, chosenTemplate as types.TemplateInfo,
    outputToggleStates, 
    handleOutputToggleLatch, 
    handleOutputToggleUnlatchPress, 
    handleOutputToggleUnlatchRelease)

  const inputInfoArr = containers.InfoViewInputContainer(inputInfoList, chosenTemplate as types.TemplateInfo,
    inputToggleStates, 
    handleInputToggle)

  

  if (loading){
    return (
      <GestureHandlerRootView>
      <SafeAreaView style={styles.generalStyles.safeContainer}>

        <View style={{...styles.generalStyles.container, alignContent: "center", justifyContent: "center", alignItems: "center"}}>
          <View style={{alignContent: "center", justifyContent: "center", alignItems: "center"}}>
            <Text style={{fontSize: 30}}>Loading...</Text>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
    )
  }
  return (
    <GestureHandlerRootView>
      <SafeAreaView style={styles.generalStyles.safeContainer}>

        <View style={styles.generalStyles.container}>
        
          <View style={styles.inputStyles.container}>
            <ScrollView 
              horizontal={true}
              bounces={false}
            >
              <View style={styles.generalStyles.scrollObjectContainer}>

                {inputInfoArr}

              </View>
            </ScrollView>
          </View>
          
          {generalComponent.getSelectorLineBreak()}

          <View style={styles.outputStyles.container}>
            <ScrollView 
              horizontal={true}
              bounces={false}
              >
              <View style={styles.generalStyles.scrollObjectContainer}>

                {outputInfoArr}

              </View>
            </ScrollView>
          </View>

          {generalComponent.getSelectorLineBreak()}
          
          <View style={styles.generalStyles.buttonContainer}>

            {generalComponent.getButton({
              title: "Exit",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.text,
              onPress: () => goToIndexScreen(chosenTemplate as types.TemplateInfo)
            })}

            {/* {generalComponent.getButton({
              title: "+",
              buttonStyle: styles.generalStyles.zoomBtn,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.zoomInfoViewIn(outputRefArr, inputRefArr)
            })} */}

            <View style={styles.generalStyles.timecode}>
              <Text style={styles.generalStyles.text}>11:24:05:23</Text>
            </View>

            <Pressable style={[styles.generalStyles.button, styles.getInfoViewPressableStyleOmni(omniIsOn)]} 
                  onPress={() => {
                    if (chosenTemplate?.omniState) {
                      handleToggleLatch(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniListPorts);
                    } 
                  }}
                  onPressIn={() => {
                    if(!chosenTemplate?.omniState){
                      handleToggleUnlatchPress(setOmniIsOn, chosenTemplate, intercomOmniListPorts);
                    }
                  }}
                  onPressOut={() => {
                    if(!chosenTemplate?.omniState){
                      handleToggleUnlatchRelease(setOmniIsOn, chosenTemplate, intercomOmniListPorts);
                    }
                  }}>
              <Text style={styles.generalStyles.text}>Omni</Text>
            </Pressable>
                  
{/* 
            {generalComponent.getButton({
              title: "-",
              buttonStyle: styles.generalStyles.zoomBtn,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.zoomInfoViewOut(outputRefArr, inputRefArr)
            })} */}

            {/* {generalComponent.getButton({
              title: "Clear All",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.clearAllInfoViews(outputRefArr,inputRefArr)
            })} */}

          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default selektor