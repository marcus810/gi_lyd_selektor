

/* libraries */
import { View, Text, TextInput, AppState, AppStateStatus, Pressable, LayoutChangeEvent, Dimensions, Modal, KeyboardAvoidingView, Platform, Button } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Alert } from 'react-native';  // To show alerts
/* our files */
import * as styles from '../scripts/styles'
import * as containers from '../scripts/selector_scripts/InfoViewContainers'
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter, useGlobalSearchParams } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as Device from 'expo-device';
import Slider from "@react-native-community/slider";
import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMECODE_RENDER_THROTTLE_MS = 100;

const monotonicNow = (): number => {
  if (
    typeof globalThis.performance !== "undefined" &&
    typeof globalThis.performance.now === "function"
  ) {
    return globalThis.performance.now();
  }

  return Date.now();
};

type TimecodeValueProps = {
  style?: any;
  numberOfLines?: number;
};

type TimecodeSample = {
  value: string;
  sequence: number | null;
};

const TimecodeValue = React.memo(({
  style,
  numberOfLines,
}: TimecodeValueProps) => {
  const db = useMemo(() => DatabaseHandler.getInstance(), []);
  const pendingTimecodeRef = useRef<TimecodeSample>({
    value: db.getLatestTimecode(),
    sequence: db.getLatestTimecodeSequence(),
  });
  const [timecode, setTimecode] = useState<TimecodeSample>(
    pendingTimecodeRef.current
  );
  const lastRenderAtRef = useRef(0);
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushDisplay = useCallback(() => {
    if (renderTimerRef.current) {
      clearTimeout(renderTimerRef.current);
      renderTimerRef.current = null;
    }

    lastRenderAtRef.current = monotonicNow();
    setTimecode({ ...pendingTimecodeRef.current });
  }, []);

  const updateDisplay = useCallback((
    newTimecode: string,
    sequence: number | null
  ) => {
    pendingTimecodeRef.current = {
      value: newTimecode,
      sequence,
    };

    const elapsed = monotonicNow() - lastRenderAtRef.current;
    if (elapsed >= TIMECODE_RENDER_THROTTLE_MS) {
      flushDisplay();
      return;
    }

    if (renderTimerRef.current) {
      return;
    }

    renderTimerRef.current = setTimeout(() => {
      renderTimerRef.current = null;
      lastRenderAtRef.current = monotonicNow();
      setTimecode({ ...pendingTimecodeRef.current });
    }, Math.max(0, TIMECODE_RENDER_THROTTLE_MS - elapsed));
  }, [flushDisplay]);

  useEffect(() => {
    const unsubscribe = db.addTimecodeListener(updateDisplay);

    return () => {
      unsubscribe();
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current);
        renderTimerRef.current = null;
      }
    };
  }, [db, updateDisplay]);

  useEffect(() => {
    db.markTimecodeRendered(timecode.sequence);
  }, [db, timecode.sequence]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        flushDisplay();
      }
    });

    return () => sub.remove();
  }, [flushDisplay]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {timecode.value}
    </Text>
  );
});

const selektor = () => {
  /*routing*/
  const router = useRouter()
  const isFocused = useIsFocused()
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
  if (!isAppActive || !isFocused) return;
  if (!db.isDisconnected()) return;

  Alert.alert(
    "Failed to Reconnect",
    "The connection could not be restored. You will be redirected to the main screen.",
    [{ text: "OK", onPress: () => goToIndexScreen(chosenTemplate as types.TemplateInfo) }]
  );
}, [isAppActive, isFocused, chosenTemplate]);

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

const intercomsWithPorts = useMemo(
  () => intercomInfoList.filter(ic => Number(ic.port) !== -1),
  [intercomInfoList]
);

const outputCount = useMemo(
  () => intercomsWithPorts.filter(ic => ic.type === "output").length,
  [intercomsWithPorts]
);
const inputCount = useMemo(
  () => intercomsWithPorts.filter(ic => ic.type === "input").length,
  [intercomsWithPorts]
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
    maxWidth: 80,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    flex: 0,
    flexShrink: 0,
  } as const

  const PHONE_FOOTER_BUTTON_HEIGHT = "64%" as const
  const PHONE_FOOTER_TEXT_SIZE = 10
  const PHONE_FOOTER_SMALL_TEXT_SIZE = 9

  const PHONE_GROUP_BUTTON_STYLE = {
    height: '72%',
    minWidth: '20%',
    maxWidth: '20%',
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  } as const

  const SPECIAL_INPUT_GROUP_BUTTON_STYLE = {
  height: 37,
  minWidth: 80,
  maxWidth: 80,
  justifyContent: 'center',
  alignItems: 'center',
  alignContent: 'center',
  paddingHorizontal: 5,
  paddingVertical: 6,
  flex: 0,
  flexShrink: 0,
} as const

  const SPECIAL_GROUP_COLORS = {
    group1: {
      base: 'rgba(185, 74, 72, 0.72)',
      active: 'rgba(232, 122, 118, 0.92)',
    },
    group2: {
      base: 'rgba(63, 111, 182, 0.72)',
      active: 'rgba(129, 174, 241, 0.92)',
    },
    editFlashOn: styles.palette.cyan,
    editFlashOff: styles.palette.cyanBase,
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

  const [isMuted, setIsMuted] = useState(!db.isMuted);
  const listenActiveRef = useRef(!db.isMuted);
      const [, setTick] = useState(0)
  const goToIndexScreen = (chosenTemplate: types.TemplateInfo) => {
    void db.playerExit(chosenTemplate)
    router.dismissTo('/')
  };

  const [allInputsSliderValue, setAllInputsSliderValue] = useState(1);
  const [inputVolumes, setInputVolumes] = useState<{ [port: number]: number }>({});
  const [intercomVolumes, setIntercomVolumes] = useState<{ [id: number]: number }>({});
  const [listenVolumeModalVisible, setListenVolumeModalVisible] = useState(false);
  const [templateProfiles, setTemplateProfiles] = useState<types.TemplateProfile[]>([]);
  const [activeTemplateProfile, setActiveTemplateProfile] = useState<types.TemplateProfile | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [renamingProfileId, setRenamingProfileId] = useState<number | null>(null);
  const [renameProfileName, setRenameProfileName] = useState("");
  const [profileActionError, setProfileActionError] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const listenDisabled = chosenTemplate?.listenDisabled === true;
  const PROFILE_LIMIT = 8;

  const getProfileListenActive = (
    profileState: types.TemplateProfilePayload,
    templateInfo?: types.TemplateInfo | null
  ) => {
    if (templateInfo?.listenDisabled) return false;
    return profileState.listenActive ??
      profileState.currentProfile?.listenActive ??
      false;
  };

  const applyListenActiveState = (listenActive: boolean) => {
    listenActiveRef.current = listenActive;
    setIsMuted(listenActive);
    db.isMuted = !listenActive;
    db.playRemoteStream();
  };

  const defaultProfileForPhone = (
    profiles: types.TemplateProfile[]
  ) =>
    profiles.find(profile =>
      profile.name.trim().toLowerCase() === "default"
    ) ?? profiles[0] ?? null;

  const getPhoneListenStorageKey = (
    templateInfo: types.TemplateInfo
  ) => `phone_default_listen_active:${templateInfo.id}`;

  const readPhoneDefaultListenActive = async (
    templateInfo: types.TemplateInfo
  ): Promise<boolean | null> => {
    try {
      const value = await AsyncStorage.getItem(
        getPhoneListenStorageKey(templateInfo)
      );

      if (value == null) return null;
      return value === "1";
    } catch (error) {
      console.warn("Failed to read phone listen state", error);
      return null;
    }
  };

  const savePhoneDefaultListenActive = async (
    templateInfo: types.TemplateInfo,
    active: boolean
  ) => {
    try {
      await AsyncStorage.setItem(
        getPhoneListenStorageKey(templateInfo),
        active ? "1" : "0"
      );
    } catch (error) {
      console.warn("Failed to save phone listen state", error);
    }
  };

  const persistListenActive = async (
    templateInfo: types.TemplateInfo,
    active: boolean,
    phoneMode: boolean,
    profileId?: number
  ) => {
    if (phoneMode) {
      await savePhoneDefaultListenActive(templateInfo, active);
    }

    await db.saveTemplateListenActive(
      templateInfo,
      active,
      profileId
    );
  };

  useEffect(() => {
    if (!listenDisabled) return;

    applyListenActiveState(false);
  }, [listenDisabled]);

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

const handleIntercomVolumeChange = (
  intercom: types.IntercomInfo,
  value: number
) => {
  setIntercomVolumes(prev => ({
    ...prev,
    [intercom.id]: value,
  }));

  db.sendOnChangeIntercomVolume(
    intercom.id,
    intercom.port,
    intercom.type,
    value
  );
};

const handleAllInputsVolumeChange = (value: number) => {
  setAllInputsSliderValue(value);
  if (chosenTemplate) {
    db.saveTemplateAllInputsVolume(chosenTemplate, value);
  }
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
  if (chosenTemplate) {
    db.saveTemplateAllInputsVolume(chosenTemplate, 1);
  }
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
  if (!editingSpecialGroup || !isFocused) {
    setEditingFlashOn(false);
    return;
  }

  setEditingFlashOn(true);
  const interval = setInterval(() => {
    setEditingFlashOn(prev => !prev);
  }, 450);

  return () => clearInterval(interval);
}, [editingSpecialGroup, isFocused]);


  useEffect(() => {
    let cancelled = false;
    let joinedTemplate: types.TemplateInfo | null = null;

    // Register the disconnection handler
    const removeDisconnectHandler = db.onSocketDisconnect(handleSocketDisconnect);

    db.requestMicrophonePermission()

    const fetchData = async () => {
        try {
            const deviceType = await Device.getDeviceTypeAsync();
            if (cancelled) return;

            const detectedIsTablet =
              deviceType === Device.DeviceType.TABLET;
            setIsTablet(detectedIsTablet);
            

            let parsedTemplate = null;
            if (template) {
              try {
                // Parse the template data from the query string
                parsedTemplate = JSON.parse(decodeURIComponent(template as string));
              } catch (error) {

              }
            }
            
            setChosenTemplate(parsedTemplate)

            let profileState = await db.fetchTemplateProfileState(parsedTemplate);
            if (cancelled) return;

            if (!detectedIsTablet) {
              const defaultProfile = defaultProfileForPhone(
                profileState.profiles
              );

              if (
                defaultProfile &&
                defaultProfile.id !== profileState.currentProfile?.id
              ) {
                await db.selectTemplateProfile(
                  parsedTemplate,
                  defaultProfile.id
                );
                profileState = await db.fetchTemplateProfileState(
                  parsedTemplate
                );
                if (cancelled) return;
              }
            }

            let restoredListenActive = getProfileListenActive(
              profileState,
              parsedTemplate
            );

            if (!detectedIsTablet && parsedTemplate) {
              const cachedPhoneListenActive =
                await readPhoneDefaultListenActive(parsedTemplate);
              if (cancelled) return;

              if (cachedPhoneListenActive === null) {
                await savePhoneDefaultListenActive(
                  parsedTemplate,
                  restoredListenActive
                );
                if (cancelled) return;
              } else {
                restoredListenActive = parsedTemplate.listenDisabled
                  ? false
                  : cachedPhoneListenActive;

                const defaultProfile = defaultProfileForPhone(
                  profileState.profiles
                );

                void persistListenActive(
                  parsedTemplate,
                  restoredListenActive,
                  true,
                  defaultProfile?.id
                ).catch(error => {
                  console.warn(
                    "Failed to sync phone listen state",
                    error
                  );
                });
              }
            }

            setTemplateProfiles(profileState.profiles);
            setActiveTemplateProfile(profileState.currentProfile);

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
            if (cancelled) return;

            const validInputPorts = new Set(
              inputs.map(input => Number(input.port))
            );

            const validHiddenInputPorts =
              savedHiddenInputPorts.filter(port =>
                validInputPorts.has(Number(port))
              );

            setSpecialGroupNames(savedInputGroupNames);
            const profileAllInputsVolume =
              profileState.allInputsVolume ??
              profileState.currentProfile?.allInputsVolume ??
              1;
            const profileInputVolumes = profileState.inputVolumes ?? {};
            const restoredInputVolumes: { [port: number]: number } = {};
            inputs.forEach(input => {
              restoredInputVolumes[input.port] =
                profileInputVolumes[input.port] ??
                profileAllInputsVolume;
            });
            setAllInputsSliderValue(profileAllInputsVolume);
            setInputVolumes(restoredInputVolumes);
            const profileIntercomVolumes = profileState.intercomVolumes ?? {};
            const restoredIntercomVolumes: { [id: number]: number } = {};
            (parsedTemplate?.intercomInfo ?? []).forEach((intercom: types.IntercomInfo) => {
              restoredIntercomVolumes[intercom.id] =
                profileIntercomVolumes[intercom.id] ??
                1;
            });
            setIntercomVolumes(restoredIntercomVolumes);
            

            

            joinedTemplate = parsedTemplate;
            await db.playerJoin(parsedTemplate)
            if (cancelled) {
              if (
                joinedTemplate &&
                db.templateInfo?.id === joinedTemplate.id
              ) {
                void db.playerExit(joinedTemplate);
              }
              return;
            }

            applyListenActiveState(restoredListenActive);
            inputs.forEach(input => {
              db.sendOnChangeVolume(
                input.port,
                restoredInputVolumes[input.port] ??
                  profileAllInputsVolume
              );
            });
            (parsedTemplate?.intercomInfo ?? []).forEach((intercom: types.IntercomInfo) => {
              db.sendOnChangeIntercomVolume(
                intercom.id,
                intercom.port,
                intercom.type,
                restoredIntercomVolumes[intercom.id] ?? 1
              );
            });
            const activatedIntercoms = parsedTemplate?.isTabMaster
              ? []
              : Array.isArray(profileState.activeIntercoms)
                ? profileState.activeIntercoms
                : await db.fetchActivatedIntercoms();
            if (cancelled) return;

            setInputInfoList(inputs);
            setHiddenInputPorts(validHiddenInputPorts);
            setSpecialInputGroups(savedInputGroups);
            setIntercomInfoList(parsedTemplate.intercomInfo)
            setIntercomOmniList(db.addOmniToList(parsedTemplate.intercomInfo))
            setIntercomGroupList(db.addGroupToList(parsedTemplate.intercomInfo))
            setInputToggleStates({});
            setSpecialGroup1IsOn(false);
            setSpecialGroup2IsOn(false);

            if (!parsedTemplate?.isTabMaster) {
              toggleActivatedIntercoms(activatedIntercoms, parsedTemplate);
            }

            

        } catch (error) {
            if (!cancelled) {
              router.dismissTo("/template_selector")
            }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
    };

    fetchData();  // Call the async function to fetch the data

    db.intercomInfoListSetter = setIntercomInfoList
    db.inputInfoListSetter = setInputInfoList
    db.chosenTemplateSetter = setChosenTemplate
    db.intercomOmniListSetter = setIntercomOmniList
    db.intercomGroupListSetter = setIntercomGroupList

    return () => {
      cancelled = true;
      removeDisconnectHandler();

      if (db.intercomInfoListSetter === setIntercomInfoList) {
        db.intercomInfoListSetter = null;
      }
      if (db.inputInfoListSetter === setInputInfoList) {
        db.inputInfoListSetter = null;
      }
      if (db.chosenTemplateSetter === setChosenTemplate) {
        db.chosenTemplateSetter = null;
      }
      if (db.intercomOmniListSetter === setIntercomOmniList) {
        db.intercomOmniListSetter = null;
      }
      if (db.intercomGroupListSetter === setIntercomGroupList) {
        db.intercomGroupListSetter = null;
      }

      if (
        joinedTemplate &&
        db.templateInfo?.id === joinedTemplate.id
      ) {
        void db.playerExit(joinedTemplate);
      }
    };
  }, []);  // Empty dependency array to run only once when the component mounts


const renderSpecialGroupButtonWithEditor = (groupKey: 'group1' | 'group2') => {
  const isGroup1 = groupKey === 'group1'
  const isEditing = editingSpecialGroup === groupKey
  const isOn = isGroup1 ? specialGroup1IsOn : specialGroup2IsOn
  const colors = isGroup1 ? SPECIAL_GROUP_COLORS.group1 : SPECIAL_GROUP_COLORS.group2

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        width: isEditing ? 150 : 80,
        flexGrow: 0,
        flexShrink: 0,
      }}
    >
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
            minWidth: 56,
            maxWidth: 64,
            backgroundColor: styles.palette.control,
            borderWidth: 1,
            borderColor: styles.palette.borderStrong,
            borderRadius: 8,
            justifyContent: 'center',
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{
              color: styles.palette.text,
              fontSize: 10,
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

  const toggleActivatedIntercoms = (
    activatedIntercoms: Array<{ id: number; port: number; type: string }>,
    templateInfo: types.TemplateInfo | undefined = chosenTemplate
  ) => {
    if (!templateInfo) return;

    const nextStates: {
      [id: number]: {
        toggled: boolean;
        activated: boolean;
      };
    } = {};

    activatedIntercoms.forEach(({ id, port, type }) => {
      nextStates[id] = {
        toggled: true,
        activated: true,
      };

      if (type !== 'output'){
        db.sendOutputOn(templateInfo, port);
      }
      else{
        db.sendInputOn(templateInfo, port, true);
      }
    });

    setIntercomToggleStates(nextStates);
    setOmniIsOn(false);
    setGroupIsOn(false);
  };

  const toggleActivatedInputs = (
    activatedInputs: Array<{ port: number }>,
    templateInfo: types.TemplateInfo | undefined = chosenTemplate
  ) => {
    if (!templateInfo) return;

    const nextStates: { [port: number]: boolean } = {};
    activatedInputs.forEach(({ port }) => {
      nextStates[port] = true;
      db.sendInputOn(templateInfo, port, false);
    });

    setInputToggleStates(nextStates);
    setSpecialGroup1IsOn(false);
    setSpecialGroup2IsOn(false);
  };

  const applyProfileVolumeState = (
    inputs: types.InputInfo[],
    profileState: types.TemplateProfilePayload
  ) => {
    const profileAllInputsVolume =
      profileState.allInputsVolume ??
      profileState.currentProfile?.allInputsVolume ??
      1;
    const profileInputVolumes = profileState.inputVolumes ?? {};
    const restoredInputVolumes: { [port: number]: number } = {};

    inputs.forEach(input => {
      restoredInputVolumes[input.port] =
        profileInputVolumes[input.port] ??
        profileAllInputsVolume;
    });

    setAllInputsSliderValue(profileAllInputsVolume);
    setInputVolumes(restoredInputVolumes);

    inputs.forEach(input => {
      db.sendOnChangeVolume(
        input.port,
        restoredInputVolumes[input.port] ??
          profileAllInputsVolume
      );
    });
  };

  const applyProfileIntercomVolumeState = (
    intercoms: types.IntercomInfo[],
    profileState: types.TemplateProfilePayload
  ) => {
    const profileIntercomVolumes = profileState.intercomVolumes ?? {};
    const restoredIntercomVolumes: { [id: number]: number } = {};

    intercoms.forEach(intercom => {
      restoredIntercomVolumes[intercom.id] =
        profileIntercomVolumes[intercom.id] ??
        1;
    });

    setIntercomVolumes(restoredIntercomVolumes);

    intercoms.forEach(intercom => {
      db.sendOnChangeIntercomVolume(
        intercom.id,
        intercom.port,
        intercom.type,
        restoredIntercomVolumes[intercom.id] ?? 1
      );
    });
  };

  const clearRuntimeForProfileSwitch = (
    templateInfo: types.TemplateInfo
  ) => {
    inputInfoList.forEach(input => {
      db.sendInputOff(
        templateInfo,
        input.port,
        false,
        false,
        undefined,
        true
      );
    });

    intercomInfoList.forEach(intercom => {
      if (intercom.type !== "output") {
        db.sendOutputOff(
          templateInfo,
          intercom.port,
          true
        );
      } else {
        db.sendInputOff(
          templateInfo,
          intercom.port,
          true,
          false,
          undefined,
          true
        );
      }
    });

    setInputToggleStates({});
    setIntercomToggleStates({});
    setSpecialGroup1IsOn(false);
    setSpecialGroup2IsOn(false);
    setOmniIsOn(false);
    setGroupIsOn(false);
  };

  const reloadActiveProfileState = async (
    templateInfo: types.TemplateInfo
  ) => {
    const profileState = await db.fetchTemplateProfileState(templateInfo);
    setTemplateProfiles(profileState.profiles);
    setActiveTemplateProfile(profileState.currentProfile);

    const [
      inputs,
      savedInputGroups,
      savedInputGroupNames,
      savedHiddenInputPorts,
    ] = await Promise.all([
      db.fetchInputs(templateInfo),
      db.fetchTemplateInputGroups(templateInfo),
      db.fetchTemplateInputGroupNames(templateInfo),
      db.fetchTemplateHiddenInputs(templateInfo),
    ]);

    const validInputPorts = new Set(
      inputs.map(input => Number(input.port))
    );
    const validHiddenInputPorts =
      savedHiddenInputPorts.filter(port =>
        validInputPorts.has(Number(port))
      );

    setInputInfoList(inputs);
    setHiddenInputPorts(validHiddenInputPorts);
    setSpecialInputGroups(savedInputGroups);
    setSpecialGroupNames(savedInputGroupNames);
    applyProfileVolumeState(inputs, profileState);
    applyProfileIntercomVolumeState(
      templateInfo.intercomInfo ?? [],
      profileState
    );
    applyListenActiveState(
      getProfileListenActive(profileState, templateInfo)
    );

    if (templateInfo.isTabMaster) {
      setInputToggleStates({});
      setIntercomToggleStates({});
      return;
    }

    setInputToggleStates({});
    setSpecialGroup1IsOn(false);
    setSpecialGroup2IsOn(false);

    const activatedIntercoms = Array.isArray(profileState.activeIntercoms)
      ? profileState.activeIntercoms
      : await db.fetchActivatedIntercoms();
    toggleActivatedIntercoms(activatedIntercoms, templateInfo);
  };

  const handleSelectProfile = async (
    profile: types.TemplateProfile
  ) => {
    if (!chosenTemplate || profileBusy || !isTablet) return;

    setProfileBusy(true);
    setProfileActionError(null);

    try {
      clearRuntimeForProfileSwitch(chosenTemplate);
      await db.selectTemplateProfile(chosenTemplate, profile.id);
      await reloadActiveProfileState(chosenTemplate);
      setProfileModalVisible(false);
    } catch (error: any) {
      setProfileActionError(error?.message ?? "Could not switch profile");
    } finally {
      setProfileBusy(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!chosenTemplate || profileBusy || !isTablet) return;

    if (templateProfiles.length >= PROFILE_LIMIT) {
      setProfileActionError(`A template can have a maximum of ${PROFILE_LIMIT} profiles`);
      return;
    }

    const cleanName = newProfileName.trim();
    if (!cleanName) {
      setProfileActionError("Profile name is required");
      return;
    }

    setProfileBusy(true);
    setProfileActionError(null);

    try {
      await db.createTemplateProfile(chosenTemplate, cleanName);
      setNewProfileName("");
      await reloadActiveProfileState(chosenTemplate);
    } catch (error: any) {
      setProfileActionError(error?.message ?? "Could not create profile");
    } finally {
      setProfileBusy(false);
    }
  };

  const handleStartRenameProfile = (
    profile: types.TemplateProfile
  ) => {
    setRenamingProfileId(profile.id);
    setRenameProfileName(profile.name);
    setProfileActionError(null);
  };

  const handleRenameProfile = async () => {
    if (
      !chosenTemplate ||
      profileBusy ||
      renamingProfileId == null
    ) return;

    const cleanName = renameProfileName.trim();
    if (!cleanName) {
      setProfileActionError("Profile name is required");
      return;
    }

    setProfileBusy(true);
    setProfileActionError(null);

    try {
      await db.renameTemplateProfile(
        chosenTemplate,
        renamingProfileId,
        cleanName
      );
      setRenamingProfileId(null);
      setRenameProfileName("");
      await reloadActiveProfileState(chosenTemplate);
    } catch (error: any) {
      setProfileActionError(error?.message ?? "Could not rename profile");
    } finally {
      setProfileBusy(false);
    }
  };

  const handleDeleteProfile = (
    profile: types.TemplateProfile
  ) => {
    if (!chosenTemplate || profileBusy) return;

    Alert.alert(
      "Delete profile",
      `Delete "${profile.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!chosenTemplate) return;

            setProfileBusy(true);
            setProfileActionError(null);

            try {
              if (profile.id === activeTemplateProfile?.id) {
                clearRuntimeForProfileSwitch(chosenTemplate);
              }

              await db.deleteTemplateProfile(
                chosenTemplate,
                profile.id
              );
              setRenamingProfileId(null);
              setRenameProfileName("");
              await reloadActiveProfileState(chosenTemplate);
            } catch (error: any) {
              setProfileActionError(error?.message ?? "Could not delete profile");
            } finally {
              setProfileBusy(false);
            }
          },
        },
      ]
    );
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
    if (listenDisabled) return;

    const next = !listenActiveRef.current;
    applyListenActiveState(next);
    console.log(next ? 'Now Listening' : 'Muted');

    if (chosenTemplate) {
      const profileId =
        activeTemplateProfile?.id ??
        (!isTablet
          ? defaultProfileForPhone(templateProfiles)?.id
          : undefined);

      void persistListenActive(
        chosenTemplate,
        next,
        !isTablet,
        profileId
      ).catch(error => {
        console.warn(
          "Failed to save listen state",
          error
        );
      });
    }
  };

const renderProfileButton = (
  extraStyle: any = {},
  textSize = 12
) => (
  <Pressable
    style={({ pressed }) => [
      styles.generalStyles.button,
      pressed && styles.generalStyles.buttonPressed,
      {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 6,
        paddingVertical: 4,
      },
      extraStyle,
    ]}
    onPress={() => {
      setProfileActionError(null);
      setProfileModalVisible(true);
    }}
  >
    <Text
      style={[
        styles.generalStyles.text,
        { fontSize: textSize, textAlign: "center" },
      ]}
      numberOfLines={1}
    >
      Profile
    </Text>
    <Text
      style={[
        styles.generalStyles.text,
        { fontSize: Math.max(textSize - 2, 9), textAlign: "center", width: "100%" },
      ]}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {activeTemplateProfile?.name ?? "Default"}
    </Text>
  </Pressable>
);

const renderProfileModal = () => {
  const canCreateProfile =
    isTablet &&
    templateProfiles.length < PROFILE_LIMIT;

  return (
    <Modal
      visible={profileModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setProfileModalVisible(false)}
      supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalStyles.overlay}
      >
        <View
          style={{
            width: 600,
            maxWidth: "92%",
            maxHeight: "88%",
            backgroundColor: styles.palette.panelRaised,
            borderWidth: 1,
            borderColor: styles.palette.borderStrong,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <Text style={styles.modalStyles.title}>
            Template Profiles
          </Text>
          <Text
            style={[
              styles.generalStyles.text,
              {
                fontSize: 12,
                color: styles.palette.textMuted,
                textAlign: "center",
                marginBottom: 10,
              },
            ]}
          >
            {templateProfiles.length}/{PROFILE_LIMIT}
          </Text>

          <ScrollView
            style={{ maxHeight: 300 }}
            contentContainerStyle={{ gap: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {templateProfiles.map(profile => {
              const isActive =
                profile.id === activeTemplateProfile?.id;
              const isDefault =
                profile.name.trim().toLowerCase() === "default";
              const isRenaming =
                profile.id === renamingProfileId;

              return (
                <View
                  key={profile.id}
                  style={{
                    backgroundColor: isActive
                      ? styles.palette.cyanBase
                      : styles.palette.control,
                    borderWidth: 1,
                    borderColor: isActive
                      ? styles.palette.cyan
                      : styles.palette.borderStrong,
                    borderRadius: 8,
                    padding: 8,
                    opacity: profileBusy && !isActive ? 0.65 : 1,
                  }}
                >
                  {isRenaming ? (
                    <View style={{ gap: 8 }}>
                      <TextInput
                        value={renameProfileName}
                        onChangeText={(text) => {
                          setRenameProfileName(text);
                          setProfileActionError(null);
                        }}
                        placeholder="Profile name"
                        placeholderTextColor={styles.palette.textMuted}
                        style={{
                          height: 40,
                          backgroundColor: styles.palette.appBg,
                          color: styles.palette.text,
                          borderWidth: 1,
                          borderColor: styles.palette.borderStrong,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          fontSize: 15,
                        }}
                        returnKeyType="done"
                        onSubmitEditing={handleRenameProfile}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 8,
                        }}
                      >
                        <Pressable
                          disabled={profileBusy}
                          onPress={handleRenameProfile}
                          style={[
                            styles.generalStyles.button,
                            {
                              flex: 1,
                              minHeight: 38,
                              justifyContent: "center",
                              alignItems: "center",
                            },
                          ]}
                        >
                          <Text style={styles.generalStyles.text}>
                            Save
                          </Text>
                        </Pressable>
                        <Pressable
                          disabled={profileBusy}
                          onPress={() => {
                            setRenamingProfileId(null);
                            setRenameProfileName("");
                            setProfileActionError(null);
                          }}
                          style={[
                            styles.generalStyles.button,
                            {
                              flex: 1,
                              minHeight: 38,
                              justifyContent: "center",
                              alignItems: "center",
                            },
                          ]}
                        >
                          <Text style={styles.generalStyles.text}>
                            Cancel
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        disabled={profileBusy || isActive}
                        onPress={() => handleSelectProfile(profile)}
                        style={{
                          flex: 1,
                          minHeight: 40,
                          justifyContent: "center",
                          paddingHorizontal: 8,
                        }}
                      >
                        <Text
                          style={[
                            styles.generalStyles.text,
                            {
                              fontSize: 14,
                              textAlign: "left",
                            },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {profile.name}
                        </Text>
                        {isActive && (
                          <Text
                            style={[
                              styles.generalStyles.text,
                              {
                                fontSize: 10,
                                color: styles.palette.textMuted,
                              },
                            ]}
                          >
                            Active
                          </Text>
                        )}
                      </Pressable>

                      {!isDefault && (
                        <>
                          <Pressable
                            disabled={profileBusy}
                            onPress={() => handleStartRenameProfile(profile)}
                            style={[
                              styles.generalStyles.button,
                              {
                                width: 82,
                                minHeight: 38,
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 4,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.generalStyles.text,
                                { fontSize: 11 },
                              ]}
                            >
                              Rename
                            </Text>
                          </Pressable>
                          <Pressable
                            disabled={profileBusy}
                            onPress={() => handleDeleteProfile(profile)}
                            style={[
                              styles.generalStyles.button,
                              {
                                width: 72,
                                minHeight: 38,
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 4,
                                backgroundColor: styles.palette.danger,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.generalStyles.text,
                                { fontSize: 11 },
                              ]}
                            >
                              Delete
                            </Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View
            style={{
              height: 1,
              backgroundColor: styles.palette.borderStrong,
              marginVertical: 12,
              opacity: 0.65,
            }}
          />

          <TextInput
            editable={canCreateProfile && !profileBusy}
            value={newProfileName}
            onChangeText={(text) => {
              setNewProfileName(text);
              setProfileActionError(null);
            }}
            placeholder={
              canCreateProfile
                ? "New profile name"
                : "8 profile limit reached"
            }
            placeholderTextColor={styles.palette.textMuted}
            style={{
              height: 42,
              backgroundColor: styles.palette.appBg,
              color: styles.palette.text,
              borderWidth: 1,
              borderColor: styles.palette.borderStrong,
              borderRadius: 8,
              paddingHorizontal: 12,
              fontSize: 15,
              opacity: canCreateProfile ? 1 : 0.55,
            }}
            returnKeyType="done"
            onSubmitEditing={
              canCreateProfile ? handleCreateProfile : undefined
            }
          />

          {profileActionError && (
            <Text
              style={{
                color: styles.palette.warning,
                fontSize: 12,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {profileActionError}
            </Text>
          )}

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 12,
            }}
          >
            <Pressable
              disabled={profileBusy || !canCreateProfile}
              onPress={handleCreateProfile}
              style={[
                styles.generalStyles.button,
                {
                  flex: 1,
                  minHeight: 42,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity:
                    profileBusy || !canCreateProfile ? 0.55 : 1,
                },
              ]}
            >
              <Text style={styles.generalStyles.text}>
                {profileBusy ? "Saving..." : "Create"}
              </Text>
            </Pressable>

            <Pressable
              disabled={profileBusy}
              onPress={() => {
                setRenamingProfileId(null);
                setRenameProfileName("");
                setProfileModalVisible(false);
              }}
              style={[
                styles.generalStyles.button,
                {
                  flex: 1,
                  minHeight: 42,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: profileBusy ? 0.6 : 1,
                },
              ]}
            >
              <Text style={styles.generalStyles.text}>Close</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
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
      height: 68,
      width: 170,
      maxWidth: 170,
      minWidth: 170,
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

        <TimecodeValue
          style={[
            styles.generalStyles.text,
            { fontSize: 18, textAlign: "center", width: "100%" },
          ]}
        />
      </View>


      {isTablet && renderProfileButton({
        marginRight: 12,
        height: 60,
        width: 120,
        maxWidth: 120,
        minWidth: 120,
        flexShrink: 0,
      }, 12)}

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

  if (!isAppActive || !isFocused) {
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

  if (loading){
    return (
      <GestureHandlerRootView>
      <SafeAreaView style={styles.generalStyles.safeContainer}>

        <View style={{...styles.generalStyles.container, alignContent: "center", justifyContent: "center", alignItems: "center"}}>
          <View style={{alignContent: "center", justifyContent: "center", alignItems: "center"}}>
            <Text style={{...styles.generalStyles.text, fontSize: 30}}>Loading...</Text>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
    )
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
              intercomVolumes={intercomVolumes}
              onIntercomVolumeChange={handleIntercomVolumeChange}
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
    width: 178,
    flexGrow: 0,
    flexShrink: 0,
  }}
>
  <Text style={[styles.generalStyles.text, { fontSize: 11, marginBottom: 3 }]}>
    Intercom
  </Text>

  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
      backgroundColor: styles.palette.borderStrong,
      marginHorizontal: 3,
      opacity: 0.6,
    }}
  />
<View
  style={{
    alignItems: 'center',
    justifyContent: 'center',
    width: editingSpecialGroup ? 246 : 170,
    flexGrow: 0,
    flexShrink: 0,
  }}
>
  <Text style={[styles.generalStyles.text, { fontSize: 11, marginBottom: 3 }]}>
    Listen
  </Text>

    {/* Input groups */}

  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    {renderSpecialGroupButtonWithEditor('group1')}
    {renderSpecialGroupButtonWithEditor('group2')}
    </View>
</View>
  <View
    style={{
      width: 1,
      height: '70%',
      backgroundColor: styles.palette.borderStrong,
      marginHorizontal: 2,
      opacity: 0.6,
    }}
  />
{/* INPUT EDIT SECTION */}
<View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    width: inputReorderMode ? 134 : 66,
    flexGrow: 0,
    flexShrink: 0,
    gap: 4,
  }}
>
  <View
    style={{
      width: inputReorderMode ? 128 : 58,
      height: 50,
      justifyContent: 'center',
      flexDirection: inputReorderMode ? 'row' : 'column',
      alignItems: 'center',
      gap: inputReorderMode ? 4 : 0,
    }}
  >
  <Pressable
    style={({ pressed }) => [
      styles.generalStyles.button,
      pressed && styles.generalStyles.buttonPressed,
      {
        flex: 0,
        height: inputReorderMode ? 38 : 44,
        minWidth: inputReorderMode ? 52 : 58,
        maxWidth: inputReorderMode ? 52 : 58,
        width: inputReorderMode ? 52 : 58,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
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
    <Text style={[styles.generalStyles.text, { fontSize: inputReorderMode ? 11 : 12 }]}>
      {inputReorderMode ? "Done" : "Edit"}
    </Text>
  </Pressable>

  {inputReorderMode && (
    <Pressable
      style={[
        styles.generalStyles.button,
        {
          flex: 0,
          height: 38,
          minWidth: 72,
          maxWidth: 72,
          width: 72,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 2,
          backgroundColor: inputDeleteMode
            ? styles.palette.dangerActive
            : styles.palette.danger,
          borderWidth: inputDeleteMode ? 2 : 1,
          borderColor: inputDeleteMode
            ? styles.palette.text
            : 'rgba(255,255,255,0.2)',
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
            fontSize: 10,
            textAlign: 'center',
          },
        ]}
      >
        Hide/show
      </Text>
      </Pressable>
  )}
  </View>

  <View
    style={{
      width: 1,
      height: '70%',
      backgroundColor: styles.palette.borderStrong,
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
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'space-between',
    minWidth: 0,
    gap: 4,
  }}
>

  <View
    style={[
      styles.generalStyles.timecode,
      {
        flex: 0,
        width: 144,
        maxWidth: 144,
        minWidth: 132,
        height: 58,
        paddingHorizontal: 6,
      },
    ]}
  >
    <Text style={[styles.generalStyles.text, { fontSize: 13 }]} numberOfLines={1}>{chosenTemplate?.name || 'Name Unknown'}</Text>
    <TimecodeValue style={{ ...styles.generalStyles.text, width: "100%", fontSize: 16 }} numberOfLines={1} />
  </View>

  <Pressable
    style={[
      styles.generalStyles.button,
      !listenDisabled && styles.getInfoViewPressableStyleInput(isMuted),
      listenDisabled && { backgroundColor: styles.palette.controlSoft },
      { flex: 0, width: 92, maxWidth: 92, minWidth: 82, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }
    ]}
    onPress={listenDisabled ? undefined : handleToggleMute}
    onLongPress={() => setListenVolumeModalVisible(true)}
  >
    {!listenDisabled && (
      <Text style={[styles.generalStyles.text, { fontSize: 11 }]}>Listen</Text>
    )}
    <Text style={{ ...styles.generalStyles.text, fontSize: 10 }}>
      {(allInputsSliderValue * 100).toFixed(0)}%
    </Text>
  </Pressable>

  {renderProfileButton({
    flex: 0,
    width: 82,
    maxWidth: 82,
    minWidth: 74,
    height: 54,
    flexShrink: 0,
    paddingHorizontal: 3,
  }, 10)}

  <Pressable
    style={({ pressed }) => [
      styles.generalStyles.button,
      pressed && styles.generalStyles.buttonPressed,
      { flex: 0, width: 76, maxWidth: 76, minWidth: 68, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
    ]}
    onPress={clearAllInputs}
  >
    <Text style={[styles.generalStyles.text, { fontSize: 11 }]}>Clear all</Text>
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
              ...styles.modalStyles.overlay,
            }}
          >
            <View
              style={{
                ...styles.modalStyles.compactContent,
              }}
            >
              <Text style={styles.modalStyles.title}>
                All Inputs Volume: {(allInputsSliderValue * 100).toFixed(0)}%
              </Text>
              <Slider
                style={styles.modalStyles.slider}
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
              backgroundColor: 'rgba(0,0,0,0.68)',
            }}
          >
            <View
              style={{
                width: '88%',
                backgroundColor: styles.palette.panelRaised,
                borderRadius: 8,
                padding: 16,
                marginBottom: Platform.OS === 'ios' ? 12 : 24,
                borderWidth: 1,
                borderColor: styles.palette.borderStrong,
              }}
            >
              <Text
                style={{
                  color: styles.palette.text,
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
                placeholderTextColor={styles.palette.textMuted}
                style={{
                  height: 44,
                  backgroundColor: styles.palette.appBg,
                  color: styles.palette.text,
                  borderWidth: 1,
                  borderColor: styles.palette.borderStrong,
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
                    backgroundColor: styles.palette.control,
                    borderRadius: 8,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: styles.palette.text, fontSize: 15 }}>Done</Text>
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
                    backgroundColor: styles.palette.controlPressed,
                    borderRadius: 8,
                    paddingVertical: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: styles.palette.text, fontSize: 15 }}>Reset name</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {renderProfileModal()}

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
                            width: inputReorderMode ? 128 : 54,
                            maxWidth: inputReorderMode ? 128 : 54,
                            minWidth: inputReorderMode ? 128 : 54,
                            height: PHONE_FOOTER_BUTTON_HEIGHT,
                            marginLeft: -6,
                            marginRight: 6,
                            flexShrink: 0,
                          }}
                        >
                          <Pressable
                            style={({ pressed }) => [
                              styles.generalStyles.button,
                              pressed && styles.generalStyles.buttonPressed,
                              {
                                height: "100%",
                                flex: 0,
                                width: inputReorderMode ? 48 : 54,
                                maxWidth: inputReorderMode ? 48 : 54,
                                minWidth: inputReorderMode ? 48 : 54,
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 4,
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
                            <Text
                              style={[
                                styles.generalStyles.text,
                                { fontSize: inputReorderMode ? PHONE_FOOTER_SMALL_TEXT_SIZE : PHONE_FOOTER_TEXT_SIZE },
                              ]}
                              numberOfLines={1}
                            >
                              {inputReorderMode ? "Done" : "Edit"}
                            </Text>
                          </Pressable>

                          {inputReorderMode && (
                            <Pressable
                              style={[
                                styles.generalStyles.button,
                                {
                                  flex: 0,
                                  height: "100%",
                                  width: 72,
                                  maxWidth: 72,
                                  minWidth: 72,
                                  marginLeft: 4,
                                  justifyContent: "center",
                                  alignItems: "center",
                                  paddingHorizontal: 2,
                                  backgroundColor: inputDeleteMode
                                    ? styles.palette.dangerActive
                                    : styles.palette.danger,
                                  borderWidth: inputDeleteMode ? 2 : 1,
                                  borderColor: inputDeleteMode
                                    ? styles.palette.text
                                    : "rgba(255,255,255,0.2)",
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
                                    fontSize: PHONE_FOOTER_SMALL_TEXT_SIZE,
                                    textAlign: "center",
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                Hide/show
                              </Text>
                            </Pressable>
                          )}
                        </View>
                        
                        <Pressable
                          style={[
                            styles.generalStyles.button,
                            !listenDisabled && styles.getInfoViewPressableStyleInput(isMuted),
                            listenDisabled && { backgroundColor: styles.palette.controlSoft },
                            {
                              height: PHONE_FOOTER_BUTTON_HEIGHT,
                              width: "17%",
                              maxWidth: "17%",
                              justifyContent: "center",
                              alignItems: "center",
                              paddingHorizontal: 2,
                            },
                          ]}
                          onPress={listenDisabled ? undefined : handleToggleMute}
                          onLongPress={() => setListenVolumeModalVisible(true)}
                        >
                          {!listenDisabled && (
                            <Text style={[styles.generalStyles.text, { fontSize: PHONE_FOOTER_TEXT_SIZE }]} numberOfLines={1}>
                              Listen
                            </Text>
                          )}
                          <Text style={{ ...styles.generalStyles.text, fontSize: PHONE_FOOTER_SMALL_TEXT_SIZE }} numberOfLines={1}>
                            {(allInputsSliderValue * 100).toFixed(0)}%
                          </Text>
                        </Pressable>

                        <View
                          style={{
                            ...styles.generalStyles.timecode,
                            height: PHONE_FOOTER_BUTTON_HEIGHT,
                            width: "38%",
                            maxWidth: "38%",
                            paddingHorizontal: 4,
                          }}
                        >
                          <Text style={[styles.generalStyles.text, { fontSize: PHONE_FOOTER_TEXT_SIZE }]} numberOfLines={1}>
                            {chosenTemplate?.name || "Name Unknown"}
                          </Text>
                          <TimecodeValue style={{ ...styles.generalStyles.text, width: "100%", fontSize: PHONE_FOOTER_SMALL_TEXT_SIZE }} numberOfLines={1} />
                        </View>

                        <Pressable
                          style={({ pressed }) => [
                            styles.generalStyles.button,
                            pressed && styles.generalStyles.buttonPressed,
                            {
                              height: PHONE_FOOTER_BUTTON_HEIGHT,
                              width: "17%",
                              maxWidth: "17%",
                              justifyContent: "center",
                              alignItems: "center",
                              paddingHorizontal: 2,
                            },
                          ]}
                          onPress={clearAllInputs}
                        >
                          <Text style={[styles.generalStyles.text, { fontSize: PHONE_FOOTER_SMALL_TEXT_SIZE }]} numberOfLines={1}>
                            Clear all
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            }

            // Pages 1..N = outputs pages, each shows 16 phone-sized tiles
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
                      intercomVolumes={intercomVolumes}
                      onIntercomVolumeChange={handleIntercomVolumeChange}
                      isAppActive={isAppActive}
                      pageIndex={outputPageIndex}
                      pageSize={PAGE_SIZE_PHONE}
                    />
                  </View>)}

                  {generalComponent.getSelectorLineBreak()}

                    <View style={{...styles.generalStyles.buttonContainer}}>
                      <Pressable style={[styles.generalStyles.button, PHONE_GROUP_BUTTON_STYLE, { marginRight: 4 }, styles.getInfoViewPressableStyleOmni(omniIsOn)]}
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
                        <Text style={[styles.generalStyles.text, { fontSize: PHONE_FOOTER_TEXT_SIZE }]} numberOfLines={1}>
                          {chosenTemplate?.groupName}
                        </Text>
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
                        <Text style={[styles.generalStyles.text, { fontSize: PHONE_FOOTER_TEXT_SIZE }]} numberOfLines={1}>
                          {chosenTemplate?.omniName}
                        </Text>
                      </Pressable>


                      <View
                        style={{
                          ...styles.generalStyles.timecode,
                          height: PHONE_FOOTER_BUTTON_HEIGHT,
                          width: "22%",
                          maxWidth: "22%",
                          paddingHorizontal: 4,
                        }}
                      >
                        <Text style={[styles.generalStyles.text, { fontSize: PHONE_FOOTER_TEXT_SIZE }]} numberOfLines={1}>
                          {chosenTemplate?.name || 'Name Unknown'}
                        </Text>
                        <TimecodeValue style={{...styles.generalStyles.text, width: "100%", fontSize: PHONE_FOOTER_SMALL_TEXT_SIZE}} numberOfLines={1} />
                      </View>

                      <Pressable style={[
                              styles.generalStyles.button,
                              !listenDisabled && styles.getInfoViewPressableStyleInput(isMuted),
                              listenDisabled && { backgroundColor: styles.palette.controlSoft },
                              {
                                height: PHONE_FOOTER_BUTTON_HEIGHT,
                                width: "14%",
                                maxWidth: "14%",
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 2,
                              }
                            ]}
                              onPress={listenDisabled ? undefined : handleToggleMute}
                              onLongPress={() => setListenVolumeModalVisible(true)}>
                        {!listenDisabled && (
                          <Text style={[styles.generalStyles.text, { fontSize: PHONE_FOOTER_TEXT_SIZE }]} numberOfLines={1}>
                            Listen
                          </Text>
                        )}
                        <Text style={{...styles.generalStyles.text, fontSize: PHONE_FOOTER_SMALL_TEXT_SIZE}} numberOfLines={1}>
                          {(allInputsSliderValue * 100).toFixed(0)}%
                        </Text>
                      </Pressable>
                    </View>
                  
                </View>
              </View>
            );
          })}
        </ScrollView>
        {isTablet && renderProfileModal()}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}


export default selektor
