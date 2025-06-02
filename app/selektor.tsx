

/* libraries */
import { View, Text, SafeAreaView, AppState, AppStateStatus, Pressable, LayoutChangeEvent} from 'react-native'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Alert } from 'react-native';  // To show alerts
/* our files */
import * as styles from '../scripts/styles'
import * as containers from '../scripts/selector_scripts/InfoViewContainers'
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter, useGlobalSearchParams } from 'expo-router'
import React, { useState, useEffect, useRef } from 'react'



const selektor = () => {
  /*routing*/
  const router = useRouter()
  const db = DatabaseHandler.getInstance()
  const { template } = useGlobalSearchParams(); // Access the 'template' query parameter

  const [inputInfoList, setInputInfoList] = useState<types.InputInfo[]>([])

  const [intercomInfoList, setIntercomInfoList] = useState<types.IntercomInfo[]>([]);
  const [chosenTemplate, setChosenTemplate] = useState<types.TemplateInfo>();

  const [intercomOmniList, setIntercomOmniList] = useState<types.IntercomInfo[]>([])
  const [intercomGroupList, setIntercomGroupList] = useState<types.IntercomInfo[]>([])
  
  const [inputToggleStates, setInputToggleStates] = useState<{ [port: number]: boolean }>({});
  const [outputToggleStates, setOutputToggleStates] = useState<{
    [port: number]: {
      toggled: boolean;
      activated: boolean;
    };
  }>({});

  const [omniIsOn, setOmniIsOn] = useState(false)
  const [groupIsOn, setGroupIsOn] = useState(false)

  const [loading, setLoading] = useState(true);  // Add loading state

  const timecodeRef = useRef("No timecode");
  const [, forceRender] = useState(0); // Dummy state to trigger updates
  const lastRenderTime = useRef(0);
  const throttleDuration = 100; // in milliseconds, e.g., 100ms = max 10 updates/sec

  const [isMuted, setIsMuted] = useState(!db.isMuted);

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
        // You can perform your cleanup or save state here
        appStateListener.remove()
      }
    };
    // Register the disconnection handler
    db.onSocketDisconnect(handleSocketDisconnect);

    // Add event listener to listen for changes in app state
    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    const fetchData = async () => {
        try {
            

            let parsedTemplate = null;
            if (template) {
              try {
                // Parse the template data from the query string
                parsedTemplate = JSON.parse(decodeURIComponent(template as string));
              } catch (error) {

              }
            }
            
            setChosenTemplate(parsedTemplate)

            const inputs = await db.fetchInputs();  // Await the promise to get the actual data

            await db.playerJoin(parsedTemplate)
            setInputInfoList(inputs)
            setIntercomInfoList(parsedTemplate.intercomInfo)
            setIntercomOmniList(db.addOmniToList(parsedTemplate.intercomInfo))
            setIntercomGroupList(db.addGroupToList(parsedTemplate.intercomInfo))

            

        } catch (error) {
            router.push("/template_selector")
        } finally {
          setLoading(false)
        }
    };

    fetchData();  // Call the async function to fetch the data

    db.intercomInfoListSetter = setIntercomInfoList
    db.inputInfoListSetter = setInputInfoList
    db.chosenTemplateSetter = setChosenTemplate
    db.intercomOmniListSetter = setIntercomOmniList
    db.intercomGroupListSetter = setIntercomGroupList
    db.timecodeSetter = (newTimecode: string) => {
      timecodeRef.current = newTimecode;
    };
    
  }, []);  // Empty dependency array to run only once when the component mounts

  useEffect(() => {
    let animationFrameId: number;
  
    const update = (time: number) => {
      if (time - lastRenderTime.current >= throttleDuration) {
        forceRender(n => n + 1);  // Trigger re-render
        lastRenderTime.current = time;
      }
  
      animationFrameId = requestAnimationFrame(update);
    };
  
    animationFrameId = requestAnimationFrame(update);
  
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

const clearAllOutputs = (
  chosenTemplate: types.TemplateInfo | undefined,
  ports: types.InputInfo[] | undefined
) => {
  console.log("abe")
  const portNumbers = ports?.map(p => p.port) ?? [];
  db.sendOutputOffOmni(chosenTemplate, portNumbers);

    for (const port of portNumbers) {
      setOutputToggleStates(prev => ({
        ...prev,
        [port]: {
          ...prev[port],
          toggled: false, // or toggle logic

        }
      }));
    }
}

const handleToggleLatchGroup = (
  setToggle: React.Dispatch<React.SetStateAction<boolean>>,
  toggle: boolean,
  chosenTemplate: types.TemplateInfo,
  ports: types.IntercomInfo[] | undefined
) => {
  setToggle((prev) => !prev);
  const portNumbers = ports?.map(p => p.port) ?? [];

  if (toggle) {
    // Filter only ports where toggled === true && activated === false
    const filteredPorts = portNumbers.filter(port => 
      outputToggleStates[port]?.toggled && !outputToggleStates[port]?.activated
    );

    db.sendOutputOffOmni(chosenTemplate, filteredPorts);

    for (const port of filteredPorts) {
      setOutputToggleStates(prev => ({
        ...prev,
        [port]: {
          ...prev[port],
          toggled: false, // or toggle logic

        }
      }));
    }
  } else {
    db.sendOutputOnOmni(chosenTemplate, portNumbers);

    for (const port of portNumbers) {
      setOutputToggleStates(prev => ({
        ...prev,
        [port]: {
          ...prev[port],
          toggled: true,
        }
      }));
    }
  }
};

  



    const handleToggleUnlatchPressGroup = (setToggle: React.Dispatch<React.SetStateAction<boolean>>, toggle: boolean, chosenTemplate: types.TemplateInfo | undefined, ports: types.IntercomInfo[] | undefined) => {
      setToggle((prev) => !prev);
      const portNumbers = ports?.map(p => p.port) ?? [];

      db.sendOutputOnOmni(chosenTemplate, portNumbers);

      for (const port of portNumbers) {
        setOutputToggleStates(prev => ({
          ...prev,
          [port]: {
            ...prev[port],
            toggled: true,
          }
        }));
      }
  
      
    };


  const handleToggleUnlatchReleaseGroup = (setToggle: React.Dispatch<React.SetStateAction<boolean>>, toggle: boolean, chosenTemplate: types.TemplateInfo | undefined, ports: types.IntercomInfo[] | undefined) => {
    setToggle((prev) => !prev);
    const portNumbers = ports?.map(p => p.port) ?? [];
    // Filter only ports where toggled === true && activated === false
    const filteredPorts = portNumbers.filter(port => 
      outputToggleStates[port]?.toggled && !outputToggleStates[port]?.activated
    );

    db.sendOutputOffOmni(chosenTemplate, filteredPorts);

    for (const port of filteredPorts) {
      setOutputToggleStates(prev => ({
        ...prev,
        [port]: {
          ...prev[port],
          toggled: false, // or toggle logic

        }
      }));
    }
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
  
  const handleOutputToggleLatch = (port: number, groupState: boolean) => {
    setOutputToggleStates(prev => {
      const isOn = prev[port]?.toggled ?? false;
      const newState = !isOn;

      return {
        ...prev,
        [port]: {
          toggled: newState,
          activated: newState,
        },
      };
    });

    const isCurrentlyOn = outputToggleStates[port]?.toggled ?? false;

    if (isCurrentlyOn) {
      db.sendOutputOff(chosenTemplate as types.TemplateInfo, port);
    } else {
      db.sendOutputOn(chosenTemplate as types.TemplateInfo, port);
    }
  };
  
  const handleOutputToggleUnlatchPress = (port: number) => {
    setOutputToggleStates(prev => ({
      ...prev,
      [port]: {
        toggled: true,
        activated: true,
      },
    }));

    db.sendOutputOn(chosenTemplate as types.TemplateInfo, port);
  };
  
  const handleOutputToggleUnlatchRelease = (port: number) => {
    setOutputToggleStates(prev => ({
      ...prev,
      [port]: {
        toggled: false,
        activated: false,
      },
    }));

    db.sendOutputOff(chosenTemplate as types.TemplateInfo, port);
  };

useEffect(() => {
  // Clean up INPUT toggle states (still booleans)
  const validInputPorts = new Set(inputInfoList.map(input => input.port));
  const filteredInputToggles: { [port: number]: boolean } = {};

  for (const port in inputToggleStates) {
    const portNumber = Number(port);
    if (validInputPorts.has(portNumber)) {
      filteredInputToggles[portNumber] = inputToggleStates[portNumber];
    } else {
      db.sendInputOff(chosenTemplate as types.TemplateInfo, portNumber);
    }
  }

  setInputToggleStates(filteredInputToggles);

  // Clean up INTERCOM (OUTPUT) toggle states (now with toggled + activated)
  const validIntercomPorts = new Set(intercomInfoList.map(intercom => intercom.port));
  const filteredIntercomToggles: { [port: number]: { toggled: boolean; activated: boolean } } = {};

  for (const port in outputToggleStates) {
    const portNumber = Number(port);
    if (validIntercomPorts.has(portNumber)) {
      filteredIntercomToggles[portNumber] = outputToggleStates[portNumber];
    } else {
      db.sendOutputOff(chosenTemplate as types.TemplateInfo, portNumber);
    }
  }

  setOutputToggleStates(filteredIntercomToggles);
}, [inputInfoList, intercomInfoList]);
  

    // 1. Add state to hold your scrollObjectContainer size
  const [listSize, setListSize] = useState({ width: 0, height: 0 });

  // 2. Handler for onLayout
  function onListLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setListSize({ width, height });
  }

  const outputInfoArr = containers.InfoViewOuputContainer(intercomInfoList, chosenTemplate as types.TemplateInfo,
    outputToggleStates, 
    handleOutputToggleLatch, 
    handleOutputToggleUnlatchPress, 
    handleOutputToggleUnlatchRelease,
  )

  const inputInfoArr = containers.InfoViewInputContainer(inputInfoList, chosenTemplate as types.TemplateInfo,
    inputToggleStates, 
    handleInputToggle,
    listSize.width,
    listSize.height)
  
  const handleToggleMute = () => {
    setIsMuted((prev) => {
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
        
          <View style={styles.inputStyles.container} onLayout={onListLayout}>



                {inputInfoArr}



          </View>
          
          {generalComponent.getSelectorLineBreak()}
      
            <View style={styles.outputStyles.container}>

                  {outputInfoArr}

            </View>

          {generalComponent.getSelectorLineBreak()}
          
          <View style={styles.generalStyles.buttonContainer}>

          <Pressable style={[styles.generalStyles.button, styles.getInfoViewPressableStyleGroup(groupIsOn)]} 
                  onPress={() => {
                    if (chosenTemplate?.groupState) {
                      handleToggleLatchGroup(setGroupIsOn, groupIsOn, chosenTemplate, intercomGroupList);
                    } 
                  }}
                  onPressIn={() => {
                    if(!chosenTemplate?.groupState){
                      handleToggleUnlatchPressGroup(setGroupIsOn, groupIsOn, chosenTemplate, intercomGroupList);
                    }
                  }}
                  onPressOut={() => {
                    if(!chosenTemplate?.groupState){
                      handleToggleUnlatchReleaseGroup(setGroupIsOn, groupIsOn, chosenTemplate, intercomGroupList);
                    }
                  }}>
              <Text style={styles.generalStyles.text}>{chosenTemplate?.groupName}</Text>
            </Pressable>

            {/* {generalComponent.getButton({
              title: "+",
              buttonStyle: styles.generalStyles.zoomBtn,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.zoomInfoViewIn(outputRefArr, inputRefArr)
            })} */}
            <Pressable style={[styles.generalStyles.button, styles.getInfoViewPressableStyleOmni(omniIsOn)]} 
                  onPress={() => {
                    if (chosenTemplate?.omniState) {
                      handleToggleLatchGroup(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniList);
                    } 
                  }}
                  onPressIn={() => {
                    if(!chosenTemplate?.omniState){
                      handleToggleUnlatchPressGroup(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniList);
                    }
                  }}
                  onPressOut={() => {
                    if(!chosenTemplate?.omniState){
                      handleToggleUnlatchReleaseGroup(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniList);
                    }
                  }}>
              <Text style={styles.generalStyles.text}>{chosenTemplate?.omniName}</Text>
            </Pressable>

            <View style={styles.generalStyles.timecode}>
              <Text style={styles.generalStyles.text}>{chosenTemplate?.name || 'Name Unknown'}</Text>
              <Text style={styles.generalStyles.text}>{timecodeRef.current}</Text>
            </View>

            <Pressable style={[styles.generalStyles.button, styles.getInfoViewPressableStyleInput(isMuted)]} 
                  onPress={handleToggleMute}>
              <Text style={styles.generalStyles.text}>Listen</Text>
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