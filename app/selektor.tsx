

/* libraries */
import { View, Text, TextInput, SafeAreaView, AppState, AppStateStatus, Pressable, LayoutChangeEvent, Dimensions, Modal, KeyboardAvoidingView, Platform, Button } from 'react-native'
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
import Slider from "@react-native-community/slider";


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
  type TabInputToggleStates = {
    [tabId: number]: { [port: number]: boolean }
  };
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [tabInputToggleStates, setTabInputToggleStates] = useState<TabInputToggleStates>({});
  const selectedTabIdRef = useRef<number | null>(null);
  
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
const INPUT_PAGE_SIZE = 64;


const [inputReorderMode, setInputReorderMode] = useState(false);
const [inputDeleteMode, setInputDeleteMode] = useState(false);
const [hiddenInputPorts, setHiddenInputPorts] = useState<number[]>([]);

const hiddenInputPortSet = useMemo(
  () => new Set(hiddenInputPorts),
  [hiddenInputPorts]
);

const toggleInputHidden = (port: number) => {
  const isCurrentlyHidden =
    hiddenInputPorts.includes(port);

  const nextHiddenInputPorts = isCurrentlyHidden
    ? hiddenInputPorts.filter(
        existingPort => existingPort !== port
      )
    : Array.from(
        new Set([
          ...hiddenInputPorts,
          port,
        ])
      );

  /*
   * Update the local interface immediately.
   */
  setHiddenInputPorts(nextHiddenInputPorts);

  /*
   * Save both hiding and unhiding.
   *
   * The backend receives the complete hidden list,
   * so removing a port from this list unhides it.
   */
  if (chosenTemplate) {
    void db
      .saveTemplateHiddenInputs(
        chosenTemplate,
        nextHiddenInputPorts
      )
      .catch(error => {
        console.warn(
          "Failed to save hidden inputs",
          error
        );
      });
  }

  /*
   * UNHIDE:
   *
   * Make the input visible again, but do not:
   * - reactivate it
   * - put it back into an input group
   */
  if (isCurrentlyHidden) {
    return;
  }

  /*
   * HIDE:
   *
   * Deactivate the input immediately.
   */
  setInputToggleStates(previousStates => ({
    ...previousStates,
    [port]: false,
  }));

  if (
    chosenTemplate &&
    !chosenTemplate.isTabMaster
  ) {
    db.sendInputOff(
      chosenTemplate,
      port,
      false,
      false
    );
  }

  /*
   * Remove the hidden input from both special
   * input groups.
   */
  const updatedInputGroups = {
    group1: specialInputGroups.group1.filter(
      groupPort => groupPort !== port
    ),
    group2: specialInputGroups.group2.filter(
      groupPort => groupPort !== port
    ),
  };

  setSpecialInputGroups(updatedInputGroups);

  if (
    chosenTemplate &&
    !chosenTemplate.isTabMaster
  ) {
    void db
      .saveTemplateInputGroups(
        chosenTemplate,
        updatedInputGroups
      )
      .catch(error => {
        console.warn(
          "Failed to save input groups after hiding input",
          error
        );
      });
  }

  if (
    specialGroup1IsOn &&
    updatedInputGroups.group1.length === 0
  ) {
    setSpecialGroup1IsOn(false);
  }

  if (
    specialGroup2IsOn &&
    updatedInputGroups.group2.length === 0
  ) {
    setSpecialGroup2IsOn(false);
  }
};

/*
 * Deleted inputs remain in the pager while input edit mode is active.
 * Outside input edit mode, they are removed from the displayed list,
 * causing the remaining inputs to fill the empty space.
 */
const displayedInputInfoList = useMemo(() => {
  if (inputReorderMode) {
    return inputInfoList;
  }

  return inputInfoList.filter(
    input => !hiddenInputPortSet.has(input.port)
  );
}, [
  inputInfoList,
  inputReorderMode,
  hiddenInputPortSet,
]);

type InputPagerPage = {
  key: "overflow-inputs" | "primary-inputs";
  sourcePageIndex: number;
  inputs: types.InputInfo[];
};

const inputPages = useMemo<InputPagerPage[]>(() => {
  const primaryInputs = displayedInputInfoList.slice(
    0,
    INPUT_PAGE_SIZE
  );

  const overflowInputs = displayedInputInfoList.slice(
    INPUT_PAGE_SIZE,
    INPUT_PAGE_SIZE * 2
  );

  const pages: InputPagerPage[] = [
    {
      key: "primary-inputs",
      sourcePageIndex: 0,
      inputs: primaryInputs,
    },
  ];

  if (overflowInputs.length > 0) {
    pages.push({
      key: "overflow-inputs",
      sourcePageIndex: 1,
      inputs: overflowInputs,
    });
  }

  return pages;
}, [displayedInputInfoList]);

useEffect(() => {
  if (!inputReorderMode) {
    setInputDeleteMode(false);
  }
}, [inputReorderMode]);

useEffect(() => {
  const validPorts = new Set(
    inputInfoList.map(input => input.port)
  );

  setHiddenInputPorts(previousPorts =>
    previousPorts.filter(port => validPorts.has(port))
  );
}, [inputInfoList]);

const inputPageCount = inputPages.length;



const tabSlaveIntercoms = useMemo(
  () =>
    intercomInfoList
      .filter(ic => ic.isTabSlave)
      .sort((a, b) => a.id - b.id),
  [intercomInfoList]
);

useEffect(() => {
  if (!isAppActive) return;
  if (!db.isDisconnected()) return;

  Alert.alert(
    "Failed to Reconnect",
    "The connection could not be restored. You will be redirected to the main screen.",
    [{ text: "OK", onPress: () => goToIndexScreen(chosenTemplate as types.TemplateInfo) }]
  );
}, [isAppActive, chosenTemplate]);

const currentInputToggleStates = useMemo(() => {
  if (chosenTemplate?.isTabMaster) {
    if (selectedTabId == null) return {};
    return tabInputToggleStates[selectedTabId] ?? {};
  }
  return inputToggleStates;
}, [chosenTemplate?.isTabMaster, selectedTabId, tabInputToggleStates, inputToggleStates]);

useEffect(() => {
  if (chosenTemplate?.isTabMaster && tabSlaveIntercoms.length > 0) {
    setSelectedTabId(prev => {
      const next = prev ?? tabSlaveIntercoms[0].id;
      selectedTabIdRef.current = next;
      return next;
    });
  } else {
    selectedTabIdRef.current = null;
    setSelectedTabId(null);
  }
}, [chosenTemplate?.isTabMaster, tabSlaveIntercoms]);

useEffect(() => {
  selectedTabIdRef.current = selectedTabId;
}, [selectedTabId]);

const moveInputsForPage = (
  sourcePageIndex: number,
  reorderedPageInputs: types.InputInfo[]
) => {
  setInputInfoList((previousInputs) => {
    const startIndex =
      sourcePageIndex * INPUT_PAGE_SIZE;

    const endIndex = Math.min(
      startIndex + INPUT_PAGE_SIZE,
      previousInputs.length
    );

    return [
      ...previousInputs.slice(0, startIndex),
      ...reorderedPageInputs,
      ...previousInputs.slice(endIndex),
    ];
  });
};

const saveInputOrder = async () => {
  if (!chosenTemplate) return;

  try {
    await db.saveTemplateInputOrder(chosenTemplate, inputInfoList);
  } catch (error) {
    console.warn("Failed to save input order", error);
  }
};

useEffect(() => {
  const validInputPorts = new Set(inputInfoList.map(input => input.port));
  setInputVolumes(prev => {
    const next: { [port: number]: number } = {};
    for (const input of inputInfoList) {
      next[input.port] = prev[input.port] ?? allInputsSliderValue;
    }
    return next;
  });


  if (chosenTemplate?.isTabMaster) {
    setTabInputToggleStates(prev => {
      const next: TabInputToggleStates = {};
      for (const [tabIdStr, tabState] of Object.entries(prev)) {
        const filtered: { [port: number]: boolean } = {};
        for (const [portStr, value] of Object.entries(tabState)) {
          const port = Number(portStr);
          if (validInputPorts.has(port)) filtered[port] = value;
        }
        next[Number(tabIdStr)] = filtered;
      }
      return next;
    });
    return;
  }

  const filteredInputToggles: { [port: number]: boolean } = {};
  for (const port in inputToggleStates) {
    const portNumber = Number(port);
    if (validInputPorts.has(portNumber)) {
      filteredInputToggles[portNumber] = inputToggleStates[portNumber];
    }
  }
  setInputToggleStates(filteredInputToggles);
}, [inputInfoList, intercomInfoList, chosenTemplate?.isTabMaster]);

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
  // Input pages plus the phone intercom/output pages.
const totalPages = chosenTemplate?.isTabMaster
  ? inputPageCount
  : inputPageCount + outputPages;
  const screenWidth = Dimensions.get("window").width;
  const scrollRef = useRef<ScrollView | null>(null);

  const [isTablet, setIsTablet] = useState(false);
  const [omniIsOn, setOmniIsOn] = useState(false)
  const [groupIsOn, setGroupIsOn] = useState(false)
  const [specialGroup1IsOn, setSpecialGroup1IsOn] = useState(false)
  const [specialGroup2IsOn, setSpecialGroup2IsOn] = useState(false)
  const [specialInputGroups, setSpecialInputGroups] = useState<{ group1: number[]; group2: number[] }>({
    group1: [],
    group2: [],
  })
const [editingSpecialGroup, setEditingSpecialGroup] = useState<null | 'group1' | 'group2'>(null)
const [renamingSpecialGroup, setRenamingSpecialGroup] = useState<null | 'group1' | 'group2'>(null)
const [editingFlashOn, setEditingFlashOn] = useState(false)

  const [specialGroupNames, setSpecialGroupNames] = useState<{
  group1: string
  group2: string
  }>({
    group1: 'Input Group 1',
    group2: 'Input Group 2',
  })



  const FOOTER_GROUP_BUTTON_STYLE = {
    height: 37,
    maxWidth: 90,
    minWidth: 90,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    flexShrink: 0,
  } as const

  const PHONE_GROUP_BUTTON_STYLE = {
  height: '70%',
  minWidth: '18%',
  maxWidth: '18%',
  justifyContent: 'center',
  alignItems: 'center',
  alignContent: 'center',
  paddingHorizontal: 10,
  paddingVertical: 8,
  flexShrink: 0,
} as const

  const SPECIAL_INPUT_GROUP_BUTTON_STYLE = {
  height: 37,
  minWidth: 90,
  maxWidth: 90,
  justifyContent: 'center',
  alignItems: 'center',
  alignContent: 'center',
  paddingHorizontal: 8,
  paddingVertical: 6,
  flexShrink: 0,
} as const

  const SPECIAL_GROUP_COLORS = {
    group1: {
      base: '#b94a48',
      active: '#e87a76',
    },
    group2: {
      base: '#3f6fb6',
      active: '#81aef1',
    },
    editFlashOn: '#2f80ff',
    editFlashOff: '#8ab6ff',
  } as const

  const [loading, setLoading] = useState(true);  // Add loading state

useEffect(() => {
  if (loading) return;

  const animationFrame = requestAnimationFrame(() => {
    scrollRef.current?.scrollTo({
      x: 0,
      y: 0,
      animated: false,
    });
  });

  return () => {
    cancelAnimationFrame(animationFrame);
  };
}, [
  loading,
  isTablet,
  screenWidth,
]);

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

  const [allInputsSliderValue, setAllInputsSliderValue] = useState(1);
  const [inputVolumes, setInputVolumes] = useState<{ [port: number]: number }>({});
  const [listenVolumeModalVisible, setListenVolumeModalVisible] = useState(false);

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

const handleSingleInputVolumeChange = (port: number, value: number) => {
  setInputVolumes(prev => ({ ...prev, [port]: value }));
  db.sendOnChangeVolume(port, value);
};

const handleAllInputsVolumeChange = (value: number) => {
  setAllInputsSliderValue(value);
  setInputVolumes(prev => {
    const next = { ...prev };
    inputInfoList.forEach(input => {
      next[input.port] = value;
      db.sendOnChangeVolume(input.port, value);
    });
    return next;
  });
};

const handleResetInputVolumes = () => {
  setAllInputsSliderValue(1);
  setInputVolumes(prev => {
    const next = { ...prev };
    inputInfoList.forEach(input => {
      next[input.port] = 1;
      db.sendOnChangeVolume(input.port, 1);
    });
    return next;
  });
};

useEffect(() => {
  if (!chosenTemplate?.isTabMaster) return;

  const validTabIds = new Set(tabSlaveIntercoms.map(tab => tab.id));
  const validInputPorts = new Set(inputInfoList.map(input => input.port));

  // Preserve existing per-tab input states
  setTabInputToggleStates(prev => {
    const next: TabInputToggleStates = {};

    for (const tab of tabSlaveIntercoms) {
      const prevTabState = prev[tab.id] ?? {};
      const filteredTabState: { [port: number]: boolean } = {};

      for (const [portStr, value] of Object.entries(prevTabState)) {
        const port = Number(portStr);
        if (validInputPorts.has(port)) {
          filteredTabState[port] = value;
        }
      }

      next[tab.id] = filteredTabState;
    }

    return next;
  });

  // Keep current selected tab if it still exists
  setSelectedTabId(prev => {
    if (prev != null && validTabIds.has(prev)) {
      selectedTabIdRef.current = prev;
      return prev;
    }

    const fallback = tabSlaveIntercoms.length > 0 ? tabSlaveIntercoms[0].id : null;
    selectedTabIdRef.current = fallback;
    return fallback;
  });
}, [chosenTemplate?.isTabMaster, tabSlaveIntercoms, inputInfoList]);

useEffect(() => {
  if (!editingSpecialGroup) {
    setRenamingSpecialGroup(null)
  }
}, [editingSpecialGroup])

useEffect(() => {
  const sub = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
    setIsAppActive(nextAppState === "active");
  });

  return () => sub.remove();
}, []);

useEffect(() => {
  if (!editingSpecialGroup) {
    setEditingFlashOn(false);
    return;
  }

  setEditingFlashOn(true);
  const interval = setInterval(() => {
    setEditingFlashOn(prev => !prev);
  }, 450);

  return () => clearInterval(interval);
}, [editingSpecialGroup]);


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

            const [
              inputs,
              savedInputGroups,
              savedInputGroupNames,
              savedHiddenInputPorts,
            ] = await Promise.all([
              db.fetchInputs(parsedTemplate),
              db.fetchTemplateInputGroups(parsedTemplate),
              db.fetchTemplateInputGroupNames(parsedTemplate),
              db.fetchTemplateHiddenInputs(parsedTemplate),
            ]);

            const validInputPorts = new Set(
              inputs.map(input => Number(input.port))
            );

            const validHiddenInputPorts =
              savedHiddenInputPorts.filter(port =>
                validInputPorts.has(Number(port))
              );

            setSpecialGroupNames(savedInputGroupNames);
            

            

            await db.playerJoin(parsedTemplate)
            const activatedInputs = parsedTemplate?.isTabMaster
              ? []
              : await db.fetchActivatedInputs();

            const activatedIntercoms = parsedTemplate?.isTabMaster
              ? []
              : await db.fetchActivatedIntercoms();
            setInputInfoList(inputs);
            setHiddenInputPorts(validHiddenInputPorts);
            setSpecialInputGroups(savedInputGroups);
            setIntercomInfoList(parsedTemplate.intercomInfo)
            setIntercomOmniList(db.addOmniToList(parsedTemplate.intercomInfo))
            setIntercomGroupList(db.addGroupToList(parsedTemplate.intercomInfo))

            if (!parsedTemplate?.isTabMaster) {
              toggleActivatedInputs(activatedInputs);
              toggleActivatedIntercoms(activatedIntercoms);
            }

            

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


const renderSpecialGroupButtonWithEditor = (groupKey: 'group1' | 'group2') => {
  const isGroup1 = groupKey === 'group1'
  const isEditing = editingSpecialGroup === groupKey
  const isOn = isGroup1 ? specialGroup1IsOn : specialGroup2IsOn
  const colors = isGroup1 ? SPECIAL_GROUP_COLORS.group1 : SPECIAL_GROUP_COLORS.group2

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        style={[
          styles.generalStyles.button,
          SPECIAL_INPUT_GROUP_BUTTON_STYLE,
          {
            backgroundColor: isEditing
              ? (editingFlashOn ? SPECIAL_GROUP_COLORS.editFlashOn : SPECIAL_GROUP_COLORS.editFlashOff)
              : (isOn ? colors.active : colors.base),
          },
        ]}
        onPress={() => {
          void handleSpecialGroupPress(groupKey);
        }}
        onLongPress={() => handleStartEditingSpecialGroup(groupKey)}
        delayLongPress={1500}
      >
        <Text
          style={[styles.generalStyles.text, { fontSize: 12, textAlign: 'center' }]}
          numberOfLines={2}
        >
          {specialGroupNames[groupKey]}
        </Text>
      </Pressable>

      {isEditing && (
        <Pressable
          onPress={() => setRenamingSpecialGroup(groupKey)}
          style={{
            marginLeft: 6,
            height: 28,
            minWidth: 70,
            maxWidth: 90,
            backgroundColor: '#2b2b2b',
            borderWidth: 1,
            borderColor: '#666',
            borderRadius: 6,
            justifyContent: 'center',
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{
              color: '#ddd',
              fontSize: 11,
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            Rename
          </Text>
        </Pressable>
      )}
    </View>
  )
}

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

  const getSpecialGroupPorts = (groupKey: 'group1' | 'group2') => specialInputGroups[groupKey] ?? [];

  const handleStartEditingSpecialGroup = (groupKey: 'group1' | 'group2') => {
    setInputReorderMode(false);
    setEditingSpecialGroup(groupKey);
  };

const handleSpecialGroupPress = async (
  groupKey: 'group1' | 'group2'
) => {
  if (!chosenTemplate || chosenTemplate.isTabMaster) return;

  /*
   * Preserve your existing group-editing behavior.
   */
  if (editingSpecialGroup === groupKey) {
    try {
      await db.saveTemplateInputGroups(
        chosenTemplate,
        specialInputGroups
      );
    } catch (error) {
      console.warn("Failed to save input groups", error);
    }

    setEditingSpecialGroup(null);
    setRenamingSpecialGroup(null);
    return;
  }

  if (editingSpecialGroup) {
    try {
      await db.saveTemplateInputGroups(
        chosenTemplate,
        specialInputGroups
      );
    } catch (error) {
      console.warn("Failed to save input groups", error);
    }

    setEditingSpecialGroup(null);
    setRenamingSpecialGroup(null);
  }

  const validInputPorts = new Set(
    inputInfoList.map(input => input.port)
  );

  const groupPorts = getSpecialGroupPorts(groupKey).filter(
    port => validInputPorts.has(port)
  );

  const groupPortSet = new Set(groupPorts);

  const isGroupCurrentlyOn =
    groupKey === 'group1'
      ? specialGroup1IsOn
      : specialGroup2IsOn;

  /*
   * Pressing the currently active group turns that group off.
   *
   * Inputs outside the group that were manually activated after
   * the group was activated are left alone.
   */
  if (isGroupCurrentlyOn) {
    const portsToTurnOff = groupPorts.filter(
      port => inputToggleStates[port]
    );

    setInputToggleStates(previousStates => {
      const nextStates = { ...previousStates };

      groupPorts.forEach(port => {
        nextStates[port] = false;
      });

      return nextStates;
    });

    portsToTurnOff.forEach(port => {
      db.sendInputOff(
        chosenTemplate,
        port,
        false,
        false
      );
    });

    // Enforce that neither input group is active.
    setSpecialGroup1IsOn(false);
    setSpecialGroup2IsOn(false);

    return;
  }

  /*
   * Do not activate an empty group.
   */
  if (groupPorts.length === 0) return;

  /*
   * Activating a group:
   *
   * 1. Turns off every input outside the newly selected group.
   * 2. Turns on every input inside the newly selected group.
   * 3. Detoggles the other input group.
   */
  const portsToTurnOff = inputInfoList
    .map(input => input.port)
    .filter(
      port =>
        !groupPortSet.has(port) &&
        !!inputToggleStates[port]
    );

  const portsToTurnOn = groupPorts.filter(
    port => !inputToggleStates[port]
  );

  setInputToggleStates(previousStates => {
    const nextStates = { ...previousStates };

    inputInfoList.forEach(input => {
      nextStates[input.port] = groupPortSet.has(input.port);
    });

    return nextStates;
  });

  /*
   * Send OFF before ON so the newly selected group becomes
   * the final active selection.
   */
  portsToTurnOff.forEach(port => {
    db.sendInputOff(
      chosenTemplate,
      port,
      false,
      false
    );
  });

  portsToTurnOn.forEach(port => {
    db.sendInputOn(
      chosenTemplate,
      port,
      false
    );
  });

  /*
   * Only one picture-input group may be active at a time.
   */
  setSpecialGroup1IsOn(groupKey === 'group1');
  setSpecialGroup2IsOn(groupKey === 'group2');
};

const clearAllInputs = () => {
  const inputPorts = inputInfoList.map(
    input => input.port
  );

  /*
   * Tab-master behavior remains unchanged.
   * Clear every input belonging to the selected tab.
   */
  if (chosenTemplate?.isTabMaster) {
    if (selectedTabId == null) return;

    setTabInputToggleStates(previousStates => ({
      ...previousStates,
      [selectedTabId]: {},
    }));

    inputPorts.forEach(port => {
      db.sendInputOff(
        chosenTemplate,
        port,
        false,
        false,
        selectedTabId
      );
    });

    return;
  }

  if (!chosenTemplate) return;

  /*
   * Clear the active state of every picture input.
   */
  setInputToggleStates(previousStates => {
    const nextStates = { ...previousStates };

    inputPorts.forEach(port => {
      nextStates[port] = false;
    });

    return nextStates;
  });

  /*
   * Clear both input-group buttons.
   *
   * This does not delete or change the saved group memberships.
   * It only deactivates the currently active group.
   */
  setSpecialGroup1IsOn(false);
  setSpecialGroup2IsOn(false);

  /*
   * Send OFF for every input.
   *
   * Sending this unconditionally makes sure the backend is
   * completely cleared even if the React state was stale.
   */
  inputPorts.forEach(port => {
    db.sendInputOff(
      chosenTemplate,
      port,
      false,
      false
    );
  });
};

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
    if (editingSpecialGroup) {
      setSpecialInputGroups(prev => {
        const currentPorts = prev[editingSpecialGroup] ?? [];
        const exists = currentPorts.includes(port);
        return {
          ...prev,
          [editingSpecialGroup]: exists
            ? currentPorts.filter(p => p !== port)
            : [...currentPorts, port].sort((a, b) => a - b),
        };
      });
      return;
    }

    if (chosenTemplate?.isTabMaster) {
      const activeTabId = selectedTabIdRef.current;
      if (activeTabId == null) return;

      const isCurrentlyOn = !!(tabInputToggleStates[activeTabId]?.[port]);

      setTabInputToggleStates(prev => ({
        ...prev,
        [activeTabId]: {
          ...(prev[activeTabId] ?? {}),
          [port]: !isCurrentlyOn,
        },
      }));

      if (isCurrentlyOn) {
        db.sendInputOff(chosenTemplate, port, false, false, activeTabId);
      } else {
        db.sendInputOn(chosenTemplate, port, false, activeTabId);
      }

      return;
    }

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

const renderTabMasterFooter = () => (
  <View
    style={{
      ...styles.generalStyles.buttonContainer,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 80, 
    }}
  >
    {/* LEFT: tabs */}
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        marginLeft: 12,
      }}
    >
      {tabSlaveIntercoms.map((tab) => {
        const isSelected = selectedTabId === tab.id;

        return (
          <Pressable
            key={tab.id}
            style={[
              styles.generalStyles.button,
              isSelected && styles.generalStyles.tabButtonPressed,
              {
                marginRight: 8,
                height: 80, 
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 12,
              },
            ]}
            onPress={() => setSelectedTabId(tab.id)}
          >
            <Text
              style={[
                styles.generalStyles.text,
                { textAlign: "center" },
              ]}
            >
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>


    {/* RIGHT: timecode/template + clear all */}
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        flexShrink: 0,
      }}
    >
      {/* TIME / TEMPLATE */}
<View
  style={[
    styles.generalStyles.timecode,
    {
      marginRight: 12,
      height: 60,
      width: 120,
      maxWidth: 120,
      minWidth: 120,
      flexShrink: 0,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 8,
    },
  ]}
>
        <Text
          style={[
            styles.generalStyles.text,
            { fontSize: 16, textAlign: "center" },
          ]}
        >
          {chosenTemplate?.name || "Name Unknown"}
        </Text>

        <Text
          style={[
            styles.generalStyles.text,
            { fontSize: 14, textAlign: "center", width: "100%" },
          ]}
        >
          {timecodeRef.current}
        </Text>
      </View>


      {/* CLEAR ALL */}
      <Pressable
        style={({ pressed }) => [
          styles.generalStyles.button,
          pressed && styles.generalStyles.buttonPressed,
          {
            height: 60,
            width: 180,
            flexShrink: 0,
            maxWidth:180,
            minWidth:180,
            marginRight: 10,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
        onPress={clearAllInputs}
      >
        <Text
          style={[
            styles.generalStyles.text,
            { fontSize: 16, textAlign: "center" },
          ]}
        >
          Clear all
        </Text>
      </Pressable>
    </View>
  </View>
);


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
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.generalStyles.safeContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        contentContainerStyle={{
          flexGrow: 1,
        }}
      >
        {inputPages.map((inputPage) => (
          <View
            key={`tablet-${inputPage.key}`}
            style={{
              width: screenWidth,
              flex: 1,
            }}
          >
            <View style={styles.generalStyles.container}>
        
          <View style={{...styles.inputStyles.container}} onLayout={onListLayout}>
            <containers.InfoViewInputContainer
              isInputDeleteMode={inputDeleteMode}
              hiddenInputPorts={hiddenInputPorts}
              onToggleInputHidden={toggleInputHidden}
              inputInfo={inputPage.inputs}
              chosenTemplate={chosenTemplate as types.TemplateInfo}
              inputToggleStates={currentInputToggleStates}
              onToggleInput={handleInputToggle}
              isInputGroupingEditMode={!!editingSpecialGroup}
              isInputReorderMode={inputReorderMode}
              onReorderInputs={(newInputs) =>
                moveInputsForPage(
                  inputPage.sourcePageIndex,
                  newInputs
                )
              }
              editingGroupPorts={editingSpecialGroup ? getSpecialGroupPorts(editingSpecialGroup) : []}
              parentWidth={listSize.width}
              parentHeight={listSize.height}
              inputVolumes={inputVolumes}
              onInputVolumeChange={handleSingleInputVolumeChange}
              onInputVolumeLongPress={() => {}}
              isAppActive={isAppActive}
            />
          </View>
    
          {generalComponent.getSelectorLineBreak()}

          {!chosenTemplate?.isTabMaster && (
            <containers.InfoViewOuputContainer
              intercomInfo={intercomInfoList}
              chosenTemplate={chosenTemplate as types.TemplateInfo}
              outputToggleStates={intercomToggleStates}
              onToggleLatch={handleOutputToggleLatch}
              onToggleUnlatchPress={handleOutputToggleUnlatchPress}
              onToggleUnlatchRelease={handleOutputToggleUnlatchRelease}
              isAppActive={isAppActive}
            />
          )}
     


          {generalComponent.getSelectorLineBreak()}
          
          {chosenTemplate?.isTabMaster ? (
            renderTabMasterFooter()
          ) : (
<View
  style={{
    ...styles.generalStyles.buttonContainer,
    justifyContent: 'flex-start',
    gap: 6,
  }}
>
<View
  style={{
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    flexGrow: 0,
    flexShrink: 0,
  }}
>
  <Text style={[styles.generalStyles.text, { fontSize: 11, marginBottom: 3 }]}>
    Intercom
  </Text>

  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
<Pressable
    style={[
      styles.generalStyles.button,
      FOOTER_GROUP_BUTTON_STYLE,
      styles.getInfoViewPressableStyleOmni(omniIsOn),
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
      FOOTER_GROUP_BUTTON_STYLE,
      styles.getInfoViewPressableStyleGroup(groupIsOn),
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
  <View
    style={{
      width: 1,
      height: '70%',
      backgroundColor: '#666',
      marginHorizontal: 8,
      opacity: 0.6,
    }}
  />
<View
  style={{
    alignItems: 'center',
    justifyContent: 'center',
    width: 225,
    flexGrow: 0,
    flexShrink: 0,
  }}
>
  <Text style={[styles.generalStyles.text, { fontSize: 11, marginBottom: 3 }]}>
    Listen
  </Text>

    {/* Input groups */}

  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {renderSpecialGroupButtonWithEditor('group1')}
    {renderSpecialGroupButtonWithEditor('group2')}
    </View>
</View>
  <View
    style={{
      width: 1,
      height: '70%',
      backgroundColor: '#666',
      marginHorizontal: 4,
      opacity: 0.6,
    }}
  />
{/* INPUT EDIT SECTION */}
<View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    flexGrow: 0,
    flexShrink: 0,
    gap: 6,
  }}
>
  <Pressable
    style={({ pressed }) => [
      styles.generalStyles.button,
      pressed && styles.generalStyles.buttonPressed,
      {
        height: 44,
        minWidth: 70,
        maxWidth: 70,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 0,
      },
    ]}
    delayLongPress={500}
    onLongPress={() => {
      setEditingSpecialGroup(null);
      setRenamingSpecialGroup(null);
      setInputDeleteMode(false);
      setInputReorderMode(true);
    }}
    onPress={async () => {
      if (inputReorderMode) {
        await saveInputOrder();
        setInputDeleteMode(false);
        setInputReorderMode(false);
      }
    }}
  >
    <Text style={styles.generalStyles.text}>
      {inputReorderMode ? "Done" : "Edit"}
    </Text>
  </Pressable>

  {inputReorderMode && (
    <Pressable
      style={[
        styles.generalStyles.button,
        {
          height: 34,
          minWidth: 58,
          maxWidth: 58,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 4,
          backgroundColor: inputDeleteMode
            ? '#ff3b30'
            : '#8b1e1e',
          borderWidth: inputDeleteMode ? 2 : 1,
          borderColor: inputDeleteMode
            ? '#ffffff'
            : '#b84444',
        },
      ]}
      onPress={() => {
        setInputDeleteMode(previous => !previous);
      }}
    >
      <Text
        style={[
          styles.generalStyles.text,
          {
            fontSize: 11,
            textAlign: 'center',
          },
        ]}
      >
        Delete
      </Text>
    </Pressable>
  )}

  <View
    style={{
      width: 1,
      height: '70%',
      backgroundColor: '#666',
      opacity: 0.6,
    }}
  />
</View>

{/* RIGHT 3-BUTTON SECTION */}
<View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    flexGrow: 1,
    justifyContent: 'space-evenly',

    // Make room for the Delete button while input editing is active.
    marginLeft: inputReorderMode ? 70 : 0,
  }}
>

  <View
    style={[
      styles.generalStyles.timecode,
      {
        width: 120,
        maxWidth: 120,
        minWidth: 120,
        paddingHorizontal: 8,
      },
    ]}
  >
    <Text style={styles.generalStyles.text}>{chosenTemplate?.name || 'Name Unknown'}</Text>
    <Text style={{ ...styles.generalStyles.text, width: "100%" }}>{timecodeRef.current}</Text>
  </View>

  <Pressable
    style={[
      styles.generalStyles.button,
      styles.getInfoViewPressableStyleInput(isMuted),
      { width: 120, maxWidth: 120, minWidth: 120, justifyContent: 'center', alignItems: 'center', }
    ]}
    onPress={handleToggleMute}
    onLongPress={() => setListenVolumeModalVisible(true)}
  >
    <Text style={styles.generalStyles.text}>Listen</Text>
    <Text style={{ ...styles.generalStyles.text }}>
      {(allInputsSliderValue * 100).toFixed(0)}%
    </Text>
  </Pressable>

  <Pressable
    style={({ pressed }) => [
      styles.generalStyles.button,
      pressed && styles.generalStyles.buttonPressed,
      { width: 100, maxWidth: 100, minWidth: 100,justifyContent: 'center', alignItems: 'center' },
    ]}
    onPress={clearAllInputs}
  >
    <Text style={styles.generalStyles.text}>Clear all</Text>
  </Pressable>
</View>
            </View>
          )}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={listenVolumeModalVisible}
          transparent
          animationType="none"
          onRequestClose={() => setListenVolumeModalVisible(false)}
          supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "40%",
                padding: 20,
                backgroundColor: "#fff",
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ marginBottom: 10, fontSize: 16, fontWeight: "bold" }}>
                All Inputs Volume: {(allInputsSliderValue * 100).toFixed(0)}%
              </Text>
              <Slider
                style={{ width: "100%", height: 40, marginBottom: 20 }}
                minimumValue={0}
                maximumValue={2}
                value={allInputsSliderValue}
                onValueChange={handleAllInputsVolumeChange}
                step={0.01}
              />
              <View style={{ flexDirection: "row" }}>
                <View style={{ marginRight: 12 }}>
                  <Button title="Reset volumes" onPress={handleResetInputVolumes} />
                </View>
                <Button title="Close" onPress={() => setListenVolumeModalVisible(false)} />
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={renamingSpecialGroup !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setRenamingSpecialGroup(null)}
          supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-start',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.25)',
            }}
          >
            <View
              style={{
                width: '88%',
                backgroundColor: '#222',
                borderRadius: 12,
                padding: 16,
                marginBottom: Platform.OS === 'ios' ? 12 : 24,
                borderWidth: 1,
                borderColor: '#555',
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 16,
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                Rename input group
              </Text>

              <TextInput
                value={renamingSpecialGroup ? specialGroupNames[renamingSpecialGroup] : ''}
                onChangeText={(text) => {
                  if (!renamingSpecialGroup) return
                  setSpecialGroupNames(prev => ({
                    ...prev,
                    [renamingSpecialGroup]: text,
                  }))
                }}
                placeholder="Group name"
                placeholderTextColor="#999"
                style={{
                  height: 44,
                  backgroundColor: '#111',
                  color: 'white',
                  borderWidth: 1,
                  borderColor: '#666',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  fontSize: 16,
                }}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={async () => {
                  if (chosenTemplate) {
                    await db.saveTemplateInputGroupNames(chosenTemplate, specialGroupNames);
                  }

                  setRenamingSpecialGroup(null);
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 12,
                }}
              >
                <Pressable
                  onPress={async () => {
                    if (chosenTemplate) {
                      await db.saveTemplateInputGroupNames(chosenTemplate, specialGroupNames);
                    }

                    setRenamingSpecialGroup(null);
                  }}
                  style={{
                    flex: 1,
                    marginRight: 6,
                    backgroundColor: '#444',
                    borderRadius: 8,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 15 }}>Done</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (!renamingSpecialGroup) return
                    setSpecialGroupNames(prev => ({
                      ...prev,
                      [renamingSpecialGroup]:
                        renamingSpecialGroup === 'group1' ? 'Input Group 1' : 'Input Group 2',
                    }))
                  }}
                  style={{
                    flex: 1,
                    marginLeft: 6,
                    backgroundColor: '#555',
                    borderRadius: 8,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 15 }}>Reset name</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

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
            /*
            * The first one or two physical pages are input pages.
            *
            * With overflow:
            * page 0 = inputs 1–64
            * page 1 = inputs 65–128
            *
            * Without overflow:
            * page 0 = inputs 1–64
            *
            * Phone-only intercom pages are rendered after all input pages.
            */
          if (pageIdx < inputPageCount) {
            const inputPage = inputPages[pageIdx];
              return (
                <View
                  key={`phone-${inputPage.key}`}
                  style={{
                    width: screenWidth,
                    flex: 1,
                  }}
                >
                  <View style={styles.generalStyles.container}>
                    <View style={{ ...styles.inputStyles.container }} onLayout={onListLayout}>
                      <containers.InfoViewInputContainer
                        isInputDeleteMode={inputDeleteMode}
                        hiddenInputPorts={hiddenInputPorts}
                        onToggleInputHidden={toggleInputHidden}
                        inputInfo={inputPage.inputs}
                        chosenTemplate={chosenTemplate as types.TemplateInfo}
                        inputToggleStates={currentInputToggleStates}
                        onToggleInput={handleInputToggle}
                        isInputGroupingEditMode={!!editingSpecialGroup}
                        isInputReorderMode={inputReorderMode}
                        onReorderInputs={(newInputs) =>
                          moveInputsForPage(
                            inputPage.sourcePageIndex,
                            newInputs
                          )
                        }
                        editingGroupPorts={editingSpecialGroup ? getSpecialGroupPorts(editingSpecialGroup) : []}
                        parentWidth={listSize.width}
                        parentHeight={listSize.height}
                        inputVolumes={inputVolumes}
                        onInputVolumeChange={handleSingleInputVolumeChange}
                        onInputVolumeLongPress={() => {}}
                        isAppActive={isAppActive}
                      />
                    </View>

                    {generalComponent.getSelectorLineBreak()}

                    {chosenTemplate?.isTabMaster ? (
                      renderTabMasterFooter()
                    ) : (
                      
                      <View style={{ ...styles.generalStyles.buttonContainer }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            width: inputReorderMode ? "18%" : "10%",
                            maxWidth: inputReorderMode ? "18%" : "10%",
                            height: "70%",
                          }}
                        >
                          <Pressable
                            style={({ pressed }) => [
                              styles.generalStyles.button,
                              pressed && styles.generalStyles.buttonPressed,
                              {
                                height: inputReorderMode ? "70%" : "50%",
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 2,
                              },
                            ]}
                            delayLongPress={500}
                            onLongPress={() => {
                              setEditingSpecialGroup(null);
                              setRenamingSpecialGroup(null);
                              setInputDeleteMode(false);
                              setInputReorderMode(true);
                            }}
                            onPress={async () => {
                              if (inputReorderMode) {
                                await saveInputOrder();
                                setInputDeleteMode(false);
                                setInputReorderMode(false);
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.generalStyles.text,
                                { fontSize: 11 },
                              ]}
                            >
                              {inputReorderMode ? "Done" : "Edit"}
                            </Text>
                          </Pressable>

                          {inputReorderMode && (
                            <Pressable
                              style={[
                                styles.generalStyles.button,
                                {
                                  height: "55%",
                                  width: 45,
                                  maxWidth: 45,
                                  marginLeft: 4,
                                  justifyContent: "center",
                                  alignItems: "center",
                                  paddingHorizontal: 2,
                                  backgroundColor: inputDeleteMode
                                    ? "#ff3b30"
                                    : "#8b1e1e",
                                  borderWidth: inputDeleteMode ? 2 : 1,
                                  borderColor: inputDeleteMode
                                    ? "#ffffff"
                                    : "#b84444",
                                },
                              ]}
                              onPress={() => {
                                setInputDeleteMode(previous => !previous);
                              }}
                            >
                              <Text
                                style={[
                                  styles.generalStyles.text,
                                  {
                                    fontSize: 9,
                                    textAlign: "center",
                                  },
                                ]}
                              >
                                Delete
                              </Text>
                            </Pressable>
                          )}
                        </View>
                        
                        <Pressable
                          style={[
                            styles.generalStyles.button,
                            styles.getInfoViewPressableStyleInput(isMuted),
                            { height: "70%", maxWidth: "20%", alignContent: "center" },
                          ]}
                          onPress={handleToggleMute}
                          onLongPress={() => setListenVolumeModalVisible(true)}
                        >
                          <Text style={styles.generalStyles.text}>Listen</Text>
                          <Text style={{ ...styles.generalStyles.text }}>
                            {(allInputsSliderValue * 100).toFixed(0)}%
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
                            { height: "70%", maxWidth: "20%", alignContent: "center" },
                          ]}
                          onPress={clearAllInputs}
                        >
                          <Text style={styles.generalStyles.text}>Clear all</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            }

            // Pages 1..N = outputs pages, each shows 16 tiles
            const outputPageIndex =
            pageIdx - inputPageCount;

            return (
              <View
                key={`page-outputs-${outputPageIndex}`}
                style={{ width: screenWidth }}
              >
                <View style={styles.generalStyles.container}>
                  {!chosenTemplate?.isTabMaster && (
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
                  </View>)}

                  {generalComponent.getSelectorLineBreak()}

                    <View style={{...styles.generalStyles.buttonContainer}}>
                      <Pressable style={[styles.generalStyles.button, PHONE_GROUP_BUTTON_STYLE, styles.getInfoViewPressableStyleOmni(omniIsOn)]}
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

                      <Pressable style={[styles.generalStyles.button, PHONE_GROUP_BUTTON_STYLE, styles.getInfoViewPressableStyleGroup(groupIsOn)]}
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


                      <View style={styles.generalStyles.timecode}>
                        <Text style={styles.generalStyles.text}>{chosenTemplate?.name || 'Name Unknown'}</Text>
                        <Text style={{...styles.generalStyles.text, width: "100%"}}>{timecodeRef.current}</Text>
                      </View>

                      <Pressable style={[styles.generalStyles.button, styles.getInfoViewPressableStyleInput(isMuted)]} 
                              onPress={handleToggleMute}
                              onLongPress={() => setListenVolumeModalVisible(true)}>
                        <Text style={styles.generalStyles.text}>Listen</Text>
                        <Text style={{...styles.generalStyles.text}}>{(allInputsSliderValue * 100).toFixed(0)}%</Text>
                      </Pressable>

                      <Pressable style={({ pressed }) => [
                            styles.generalStyles.button,
                            pressed && styles.generalStyles.buttonPressed,]}
                            onPress={clearAllInputs}>
                        <Text style={styles.generalStyles.text}>Clear all</Text>
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