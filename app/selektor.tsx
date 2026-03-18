

/* libraries */
import { View, Text, SafeAreaView, AppState, AppStateStatus, Pressable, LayoutChangeEvent,Dimensions} from 'react-native'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Alert } from 'react-native';  // To show alerts
/* our files */
import * as styles from '../scripts/styles'
import * as containers from '../scripts/selector_scripts/InfoViewContainers'
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter, useGlobalSearchParams } from 'expo-router'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import * as Device from 'expo-device';


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

    // 1. Add state to hold your scrollObjectContainer size
  const [listSize, setListSize] = useState({ width: 0, height: 0 });
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active"
  );

  const [intercomToggleStates, setIntercomToggleStates] = useState<{
    [id: number]: {
      toggled: boolean;
      activated: boolean;
    };
  }>({});
  const PAGE_SIZE_PHONE = 16;

const outputCount = useMemo(
  () => intercomInfoList.filter(ic => ic.type === "output").length,
  [intercomInfoList]
);
const inputCount = useMemo(
  () => intercomInfoList.filter(ic => ic.type === "input").length,
  [intercomInfoList]
);

// How many “tiles pages” are needed (based on the larger of the two lists)
const outputPages = useMemo(() => {
  const maxCount = Math.max(outputCount, inputCount);
  return Math.ceil(maxCount / PAGE_SIZE_PHONE);
}, [outputCount, inputCount]);

// Total pages in the phone pager: 1 input page + N output pages
const totalPages = 1 + outputPages;
  const screenWidth = Dimensions.get("window").width;
  const scrollRef = useRef<ScrollView | null>(null);

  const [isTablet, setIsTablet] = useState(false);
  const [omniIsOn, setOmniIsOn] = useState(false)
  const [groupIsOn, setGroupIsOn] = useState(false)

  const [loading, setLoading] = useState(true);  // Add loading state

  const timecodeRef = useRef("No timecode");
  const [, forceRender] = useState(0); // Dummy state to trigger updates
  const lastRenderTime = useRef(0);
  const throttleDuration = 100; // in milliseconds, e.g., 100ms = max 10 updates/sec

  const [isMuted, setIsMuted] = useState(!db.isMuted);
      const [, setTick] = useState(0)
  const goToIndexScreen = (chosenTemplate: types.TemplateInfo) => {
    db.playerExit(chosenTemplate)
    router.push('/')
  };

  const [inputSliderValue, setInputSliderValue] = useState(1);

  const handleSocketDisconnect = () => {
      // Handle the case where the socket fails to reconnect after 3 attempts

      Alert.alert(
          "Failed to Reconnect",
          "The connection could not be restored. You will be redirected to the main screen.",
          [{ text: "OK", onPress: () => goToIndexScreen(chosenTemplate as types.TemplateInfo) }]
      );
  };


function onListLayout(e: LayoutChangeEvent) {
  const { width, height } = e.nativeEvent.layout;
  setListSize({ width, height });
}

useEffect(() => {
  const sub = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
    setIsAppActive(nextAppState === "active");
  });

  return () => sub.remove();
}, []);


  useEffect(() => {
    
    const fetchDeviceType = async () => {
      const type = await Device.getDeviceTypeAsync();
      setIsTablet(type === Device.DeviceType.TABLET);
    };
    fetchDeviceType();

    // Register the disconnection handler
    db.onSocketDisconnect(handleSocketDisconnect);

    db.requestMicrophonePermission()

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
            const activatedInputs = await db.fetchActivatedInputs()
            const activatedIntercoms = await db.fetchActivatedIntercoms()
            setInputInfoList(inputs)
            setIntercomInfoList(parsedTemplate.intercomInfo)
            setIntercomOmniList(db.addOmniToList(parsedTemplate.intercomInfo))
            setIntercomGroupList(db.addGroupToList(parsedTemplate.intercomInfo))
            toggleActivatedInputs(activatedInputs)
            toggleActivatedIntercoms(activatedIntercoms)

            

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
  if (!isAppActive) return;

  let animationFrameId: number;

  const update = (time: number) => {
    if (time - lastRenderTime.current >= throttleDuration) {
      forceRender(n => n + 1);
      lastRenderTime.current = time;
    }
    animationFrameId = requestAnimationFrame(update);
  };

  animationFrameId = requestAnimationFrame(update);
  return () => cancelAnimationFrame(animationFrameId);
}, [isAppActive]);



const handleToggleLatchGroup = (
  setToggle: React.Dispatch<React.SetStateAction<boolean>>,
  toggle: boolean, // current state (true means we are turning OFF)
  chosenTemplate: types.TemplateInfo | undefined,
  ports: types.IntercomInfo[] | undefined,
  otherIsOn: boolean,
  otherPorts: types.IntercomInfo[] | undefined
) => {
  setToggle(prev => !prev);

  const selectedIds = ports?.map(p => p.id) ?? [];
  const otherIds = new Set((otherPorts ?? []).map(p => p.id));

  if (toggle) {
    // TURNING THIS GROUP OFF
    const idsToTurnOff = selectedIds
      // only those that were turned on by group toggling (not manual)
      .filter(id => (intercomToggleStates[id]?.toggled ?? false) && !(intercomToggleStates[id]?.activated ?? false))
      // keep overlaps ON if other group still ON
      .filter(id => !(otherIsOn && otherIds.has(id)));

    const matchingPorts: number[] = intercomInfoList
      .filter(info => idsToTurnOff.includes(info.id))
      .map(info => info.port);

    db.sendOutputOffOmni(chosenTemplate, matchingPorts);

    for (const id of idsToTurnOff) {
      setIntercomToggleStates(prev => ({
        ...prev,
        [id]: { ...prev[id], toggled: false }, // DON'T clear activated here
      }));
    }
} else {
  // TURNING THIS GROUP ON:
  // Only send ON for outputs that are currently OFF.
  const idsToTurnOn = selectedIds.filter(
    (id) => !(intercomToggleStates[id]?.toggled ?? false)
  );

  const matchingPorts: number[] = intercomInfoList
    .filter((info) => idsToTurnOn.includes(info.id))
    .map((info) => info.port);

  if (matchingPorts.length > 0) {
    db.sendOutputOnOmni(chosenTemplate, matchingPorts);
  }

  for (const id of idsToTurnOn) {
    setIntercomToggleStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], toggled: true },
    }));
  }
}
};

  



const handleToggleUnlatchPressGroup = (
  setToggle: React.Dispatch<React.SetStateAction<boolean>>,
  toggle: boolean,
  chosenTemplate: types.TemplateInfo | undefined,
  ports: types.IntercomInfo[] | undefined
) => {
  setToggle((prev) => !prev);

  const selectedIds = ports?.map((p) => p.id) ?? [];

  // ✅ only turn on ones that are currently OFF
  const idsToTurnOn = selectedIds.filter(
    (id) => !(intercomToggleStates[id]?.toggled ?? false)
  );

  const matchingPorts: number[] = intercomInfoList
    .filter((info) => idsToTurnOn.includes(info.id))
    .map((info) => info.port);

  if (matchingPorts.length > 0) {
    db.sendOutputOnOmni(chosenTemplate, matchingPorts);
  }

  for (const id of idsToTurnOn) {
    setIntercomToggleStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        toggled: true,
      },
    }));
  }
};


const handleToggleUnlatchReleaseGroup = (
  setToggle: React.Dispatch<React.SetStateAction<boolean>>,
  toggle: boolean,
  chosenTemplate: types.TemplateInfo | undefined,
  ports: types.IntercomInfo[] | undefined,
  otherIsOn: boolean,
  otherPorts: types.IntercomInfo[] | undefined
) => {
  setToggle(prev => !prev);

  const selectedIds = ports?.map(p => p.id) ?? [];
  const otherIds = new Set((otherPorts ?? []).map(p => p.id));

  const idsToTurnOff = selectedIds
    .filter(id => (intercomToggleStates[id]?.toggled ?? false) && !(intercomToggleStates[id]?.activated ?? false))
    .filter(id => !(otherIsOn && otherIds.has(id)));

  const matchingPorts: number[] = intercomInfoList
    .filter(info => idsToTurnOff.includes(info.id))
    .map(info => info.port);

  db.sendOutputOffOmni(chosenTemplate, matchingPorts);

  for (const id of idsToTurnOff) {
    setIntercomToggleStates(prev => ({
      ...prev,
      [id]: { ...prev[id], toggled: false },
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

  const clearAllInputs = () => {
      
      const inputPorts: number[] = inputInfoList.map(info => info.port);

      inputPorts.forEach(port => {
        setInputToggleStates(prev => ({
          ...prev,
          [port]: false,
        }));
        
        db.sendInputOff(chosenTemplate as types.TemplateInfo, port, false, false);
      });
  } 

  const toggleActivatedIntercoms = (activatedIntercoms: types.IntercomInfo[]) => {
    

    activatedIntercoms.forEach(({ id, port, type }) => {
      setIntercomToggleStates(prev => {
        const isOn = prev[id]?.toggled ?? false;
        
        const newState = !isOn;

        return {
          ...prev,
          [id]: {
            toggled: newState,
            activated: newState,
          },
        };
      });

      const isCurrentlyOn = intercomToggleStates[id]?.toggled ?? false;
      if (type !== 'output'){
        if (isCurrentlyOn) {
          db.sendOutputOff(chosenTemplate as types.TemplateInfo, port);
        } else {
          db.sendOutputOn(chosenTemplate as types.TemplateInfo, port);
        }
      }
      else{
        if (isCurrentlyOn) {
          db.sendInputOff(chosenTemplate as types.TemplateInfo, port, true, false);
        } else {
          db.sendInputOn(chosenTemplate as types.TemplateInfo, port, true);
        }
      }
    })
  };

  const toggleActivatedInputs = (activatedInputs: types.InputInfo[]) => {
    

    activatedInputs.forEach(({ port }) => {
      setInputToggleStates(prev => ({
        ...prev,
        [port]: !prev[port],
      }));
    
      if (inputToggleStates[port]) {
        db.sendInputOff(chosenTemplate as types.TemplateInfo, port, false, false);
      } else {
        db.sendInputOn(chosenTemplate as types.TemplateInfo, port, false);
      }
    })
  };

  const handleInputToggle = (port: number) => {
    
    setInputToggleStates(prev => ({
      ...prev,
      [port]: !prev[port],
    }));
  
    if (inputToggleStates[port]) {
      db.sendInputOff(chosenTemplate as types.TemplateInfo, port, false, false);
    } else {
      db.sendInputOn(chosenTemplate as types.TemplateInfo, port, false);
    }
  };
  
  const handleOutputToggleLatch = (id: number, port: number, groupState: boolean, type: string) => {
    
    setIntercomToggleStates(prev => {
      const isOn = prev[id]?.toggled ?? false;
      
      const newState = !isOn;

      return {
        ...prev,
        [id]: {
          toggled: newState,
          activated: newState,
        },
      };
    });

    const isCurrentlyOn = intercomToggleStates[id]?.toggled ?? false;
    if (type !== 'output'){
      if (isCurrentlyOn) {
        db.sendOutputOff(chosenTemplate as types.TemplateInfo, port);
      } else {
        db.sendOutputOn(chosenTemplate as types.TemplateInfo, port);
      }
    }
    else{
      if (isCurrentlyOn) {
        db.sendInputOff(chosenTemplate as types.TemplateInfo, port, true, false);
      } else {
        db.sendInputOn(chosenTemplate as types.TemplateInfo, port, true);
      }
    }
  };
  
  const handleOutputToggleUnlatchPress = (id: number, port: number, type:string) => {
    setIntercomToggleStates(prev => ({
      ...prev,
      [id]: {
        toggled: true,
        activated: true,
      },
    }));

    if (type !== "output") {
      db.sendOutputOn(chosenTemplate as types.TemplateInfo, port);
    }
    else{
      db.sendInputOn(chosenTemplate as types.TemplateInfo, port, true);
    }
  };
  
  const handleOutputToggleUnlatchRelease = (id: number, port: number, type: string ) => {
    setIntercomToggleStates(prev => ({
      ...prev,
      [id]: {
        toggled: false,
        activated: false,
      },
    }));
    if(type !== "output"){
      db.sendOutputOff(chosenTemplate as types.TemplateInfo, port);
    }
    else{
      db.sendInputOff(chosenTemplate as types.TemplateInfo, port, true, false);
    }
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
      db.sendInputOff(chosenTemplate as types.TemplateInfo, portNumber, true, true);
    }
  }

  setInputToggleStates(filteredInputToggles);




}, [inputInfoList, intercomInfoList]);
  





  
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
  if (!isAppActive) {
      return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        <View style={{ ...styles.generalStyles.container, alignItems: "center", justifyContent: "center" }}>
          <Text style={styles.generalStyles.text}>Paused</Text>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
  if (isTablet) return (
    <GestureHandlerRootView>
  
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        <View style={styles.generalStyles.container}>
        
          <View style={{...styles.inputStyles.container}} onLayout={onListLayout}>
              <containers.InfoViewInputContainer
                inputInfo={inputInfoList}
                chosenTemplate={chosenTemplate as types.TemplateInfo}
                inputToggleStates={inputToggleStates}
                onToggleInput={handleInputToggle}
                parentWidth={listSize.width}
                parentHeight={listSize.height}
                setInputSliderValue={setInputSliderValue}
                inputSliderValue={inputSliderValue}
                isAppActive={isAppActive}
              />
          </View>
    
          {generalComponent.getSelectorLineBreak()}

            <containers.InfoViewOuputContainer
              intercomInfo={intercomInfoList}
              chosenTemplate={chosenTemplate as types.TemplateInfo}
              outputToggleStates={intercomToggleStates}
              onToggleLatch={handleOutputToggleLatch}
              onToggleUnlatchPress={handleOutputToggleUnlatchPress}
              onToggleUnlatchRelease={handleOutputToggleUnlatchRelease}
              isAppActive={isAppActive}
            />
     


          {generalComponent.getSelectorLineBreak()}
          
          <View style={{...styles.generalStyles.buttonContainer}}>

          <Pressable style={[styles.generalStyles.button, styles.getInfoViewPressableStyleOmni(omniIsOn)]} 
                  onPress={() => {
                    if (chosenTemplate?.omniState) {
                      handleToggleLatchGroup(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniList, groupIsOn, intercomGroupList);
                    } 
                  }}
                  onPressIn={() => {
                    if(!chosenTemplate?.omniState){
                      handleToggleUnlatchPressGroup(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniList);
                    }
                  }}
                  onPressOut={() => {
                    if(!chosenTemplate?.omniState){
                      handleToggleUnlatchReleaseGroup(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniList, groupIsOn, intercomGroupList);
                    }
                  }}>
              <Text style={styles.generalStyles.text}>{chosenTemplate?.groupName}</Text>
          </Pressable>

          <Pressable style={[styles.generalStyles.button, styles.getInfoViewPressableStyleGroup(groupIsOn)]} 
                  onPress={() => {
                    if (chosenTemplate?.groupState) {
                      handleToggleLatchGroup(setGroupIsOn, groupIsOn, chosenTemplate, intercomGroupList, omniIsOn, intercomOmniList);
                    } 
                  }}
                  onPressIn={() => {
                    if(!chosenTemplate?.groupState){
                      handleToggleUnlatchPressGroup(setGroupIsOn, groupIsOn, chosenTemplate, intercomGroupList);
                    }
                  }}
                  onPressOut={() => {
                    if(!chosenTemplate?.groupState){
                      handleToggleUnlatchReleaseGroup(setGroupIsOn, groupIsOn, chosenTemplate, intercomGroupList, omniIsOn, intercomOmniList);
                    }
                  }}>
              <Text style={styles.generalStyles.text}>{chosenTemplate?.omniName}</Text>
            </Pressable>

            {/* {generalComponent.getButton({
              title: "+",
              buttonStyle: styles.generalStyles.zoomBtn,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.zoomInfoViewIn(outputRefArr, inputRefArr)
            })} */}

            <View style={styles.generalStyles.timecode}>
              <Text style={styles.generalStyles.text}>{chosenTemplate?.name || 'Name Unknown'}</Text>
              <Text style={{...styles.generalStyles.text, width: "100%"}}>{timecodeRef.current}</Text>
            </View>

            <Pressable style={[styles.generalStyles.button, styles.getInfoViewPressableStyleInput(isMuted)]} 
                  onPress={handleToggleMute}>
              <Text style={styles.generalStyles.text}>Listen</Text>
              <Text style={{...styles.generalStyles.text}}>{(inputSliderValue * 100).toFixed(0)}%</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [
                  styles.generalStyles.button,
                  pressed && styles.generalStyles.buttonPressed,]}
                  onPress={clearAllInputs}>
              <Text style={styles.generalStyles.text}>Clear all</Text>
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        {/* Horizontal pager */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {Array.from({ length: totalPages }).map((_, pageIdx) => {
            // Page 0 = inputs page (unchanged)
            if (pageIdx === 0) {
              return (
                <View key="page-inputs" style={{ width: screenWidth, flex: 1 }}>
                  <View style={styles.generalStyles.container}>
                    <View style={{ ...styles.inputStyles.container }} onLayout={onListLayout}>
                      <containers.InfoViewInputContainer
                        inputInfo={inputInfoList}
                        chosenTemplate={chosenTemplate as types.TemplateInfo}
                        inputToggleStates={inputToggleStates}
                        onToggleInput={handleInputToggle}
                        parentWidth={listSize.width}
                        parentHeight={listSize.height}
                        setInputSliderValue={setInputSliderValue}
                        inputSliderValue={inputSliderValue}
                        isAppActive={isAppActive}
                      />
                    </View>

                    {generalComponent.getSelectorLineBreak()}

                    <View style={{ ...styles.generalStyles.buttonContainer }}>
                      <Pressable
                        style={[
                          styles.generalStyles.button,
                          styles.getInfoViewPressableStyleInput(isMuted),
                          { height: "70%", maxWidth: "30%", alignContent: "center" },
                        ]}
                        onPress={handleToggleMute}
                      >
                        <Text style={styles.generalStyles.text}>Listen</Text>
                        <Text style={{ ...styles.generalStyles.text }}>
                          {(inputSliderValue * 100).toFixed(0)}%
                        </Text>
                      </Pressable>

                      <View style={{ ...styles.generalStyles.timecode, height: "70%", maxWidth: "30%" }}>
                        <Text style={styles.generalStyles.text}>
                          {chosenTemplate?.name || "Name Unknown"}
                        </Text>
                        <Text style={{ ...styles.generalStyles.text, width: "100%" }}>
                          {timecodeRef.current}
                        </Text>
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          styles.generalStyles.button,
                          pressed && styles.generalStyles.buttonPressed,
                          { height: "70%", maxWidth: "30%", alignContent: "center" },
                        ]}
                        onPress={clearAllInputs}
                      >
                        <Text style={styles.generalStyles.text}>Clear all</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            }

            // Pages 1..N = outputs pages, each shows 16 tiles
            const outputPageIndex = pageIdx - 1;

            return (
              <View
                key={`page-outputs-${outputPageIndex}`}
                style={{ width: screenWidth }}
              >
                <View style={styles.generalStyles.container}>
                  <View style={{ ...styles.inputStyles.container }}>
                    <containers.InfoViewOuputContainer
                      intercomInfo={intercomInfoList}
                      chosenTemplate={chosenTemplate as types.TemplateInfo}
                      outputToggleStates={intercomToggleStates}
                      onToggleLatch={handleOutputToggleLatch}
                      onToggleUnlatchPress={handleOutputToggleUnlatchPress}
                      onToggleUnlatchRelease={handleOutputToggleUnlatchRelease}
                      isAppActive={isAppActive}
                      pageIndex={outputPageIndex}
                      pageSize={PAGE_SIZE_PHONE}
                    />
                  </View>

                  {generalComponent.getSelectorLineBreak()}

                  <View style={{ ...styles.generalStyles.buttonContainer }}>
                    <Pressable
                      style={[
                        styles.generalStyles.button,
                        styles.getInfoViewPressableStyleOmni(omniIsOn),
                        { height: "70%", maxWidth: "30%", alignContent: "center" },
                      ]}
                      onPress={() => {
                        if (chosenTemplate?.omniState) {
                          handleToggleLatchGroup(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniList, groupIsOn, intercomGroupList);
                        }
                      }}
                      onPressIn={() => {
                        if (!chosenTemplate?.omniState) {
                          handleToggleUnlatchPressGroup(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniList);
                        }
                      }}
                      onPressOut={() => {
                        if (!chosenTemplate?.omniState) {
                          handleToggleUnlatchReleaseGroup(setOmniIsOn, omniIsOn, chosenTemplate, intercomOmniList, groupIsOn, intercomGroupList);
                        }
                      }}
                    >
                      <Text style={styles.generalStyles.text}>{chosenTemplate?.groupName}</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.generalStyles.button,
                        styles.getInfoViewPressableStyleGroup(groupIsOn),
                        { height: "70%", maxWidth: "30%" },
                      ]}
                      onPress={() => {
                        if (chosenTemplate?.groupState) {
                          handleToggleLatchGroup(setGroupIsOn, groupIsOn, chosenTemplate, intercomGroupList, omniIsOn, intercomOmniList);
                        }
                      }}
                      onPressIn={() => {
                        if (!chosenTemplate?.groupState) {
                          handleToggleUnlatchPressGroup(setGroupIsOn, groupIsOn, chosenTemplate, intercomGroupList);
                        }
                      }}
                      onPressOut={() => {
                        if (!chosenTemplate?.groupState) {
                          handleToggleUnlatchReleaseGroup(setGroupIsOn, groupIsOn, chosenTemplate, intercomGroupList, omniIsOn, intercomOmniList);
                        }
                      }}
                    >
                      <Text style={styles.generalStyles.text}>{chosenTemplate?.omniName}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}


export default selektor