import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, Modal, Button, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { DatabaseHandler } from "@/scripts/database/database";
import * as misc from "../misc";
import * as styles from "../styles";
import * as types from "../types";

export interface InfoOutputViewProps {
  inputIntercom?: types.IntercomInfo | null;
  outputIntercom?: types.IntercomInfo | null;
  outerViewStyle?: any;
  textViewStyle?: any;
  textStyle?: any;
  selectedStyleForOutput?: (...args: any[]) => any;
  selectedStyleForInput?: (...args: any[]) => any;
  isToggledLookup?: { [id: number]: { toggled: boolean; activated: boolean } } | { [id: number]: boolean } | undefined;
  onToggleLatch: (id: number, port: number, groupState: boolean, type: string) => void;
  onToggleUnlatchPress: (id: number, port: number, type: string) => void;
  onToggleUnlatchRelease: (id: number, port: number, type: string) => void;
  templateInfo?: types.TemplateInfo;
  isTablet: boolean;
}


const SILENCE_THRESHOLD = 0.0001; // adjust if your audio levels use a different scale
const ALERT_DURATION_MS = 30_000;
const BLINK_INTERVAL_MS = 500;
const ALERT_COLOR = "rgba(150, 145, 8, 0.88)"; // yellow-ish alert color

const HELD_CLEAR_MS = 3 * 60 * 1000;


const InfoOutputView: React.FC<InfoOutputViewProps> = ({
  inputIntercom,
  outputIntercom,
  outerViewStyle,
  textViewStyle,
  textStyle,
  selectedStyleForOutput,
  selectedStyleForInput,
  isToggledLookup,
  onToggleLatch,
  onToggleUnlatchPress,
  onToggleUnlatchRelease,
  templateInfo,
  isTablet
}) => {
  const db = DatabaseHandler.getInstance();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalSide, setModalSide] = useState<"input" | "output" | null>(null);
  const [sliderValue, setSliderValue] = useState(1.0);

    // --- alert/blink state ---
  const [isAlerting, setIsAlerting] = useState(false); // true while in alert mode (30s window)
  const [blinkOn, setBlinkOn] = useState(false); // toggles to create blinking effect

  const [isHeldAlert, setIsHeldAlert] = useState(false); // stays true after blink times out
  const isHeldAlertRef = useRef(false);

  // refs for timers / cancellation and stable read within handlers
  const alertTimeoutRef = useRef<number | null>(null);
  const blinkIntervalRef = useRef<number | null>(null);
  const isAlertingRef = useRef(false);

  const heldClearTimeoutRef = useRef<number | null>(null);

  const DEBUG_LOG_LEVELS = true; // set false to stop logging
  const [lastLevel, setLastLevel] = useState<number | null>(null);
  const debugIntervalRef = useRef<number | null>(null);

    // keep latest inputIntercom.latchState for quick checks
  const latestInputLatchRef = useRef<boolean | undefined>(undefined);

const inputInOmni = !!inputIntercom?.omniState;
const inputInGroup = !!inputIntercom?.groupState;
const inputInBoth = inputInOmni && inputInGroup;

const omniColour =
  (styles.getInfoViewPressableStyleOutputOmni(false, true) as any)?.backgroundColor
  ?? "rgba(22, 22, 168, 0.54)";

const groupColour =
  (styles.getInfoViewPressableStyleOutputGroup(false, true) as any)?.backgroundColor
  ?? "rgba(77, 36, 36, 0.54)";

const baseGrey = "rgba(66, 63, 63, 0.75)";
  
useEffect(() => {
  const computeToggledFor = (ic?: types.IntercomInfo | null) => {
    if (!ic || !isToggledLookup) return false;
    const byId = (isToggledLookup as any)[ic.id];
    const extract = (v: any) =>
      v === undefined ? undefined : typeof v === "boolean" ? v : v.toggled ?? v;
    return Boolean(extract(byId) ?? false);
  };

  // treat a present intercom with port === -1 as "no input tile"
  if (!inputIntercom || Number(inputIntercom.port) === -1) {
    latestInputLatchRef.current = false;
    if (DEBUG_LOG_LEVELS) console.log("[toggled-check] no inputIntercom (or port=-1) -> allow alerts (toggled=false)");
  } else {
    const toggled = computeToggledFor(inputIntercom);
    if (DEBUG_LOG_LEVELS) console.log("[toggled-check] input id=", inputIntercom.id, "toggled=", toggled);

    latestInputLatchRef.current = toggled;

    if (toggled) {
      if (DEBUG_LOG_LEVELS) console.log("[toggled-check] toggled -> cancelAlert()");
      cancelAlert();
    }
  }
}, [inputIntercom?.id, inputIntercom?.port, isToggledLookup]);


const clearHeldClearTimeout = () => {
    if (heldClearTimeoutRef.current !== null) {
      clearTimeout(heldClearTimeoutRef.current);
      heldClearTimeoutRef.current = null;
    }
  };


  function endBlinkAndHold() {
    // Called when the blink timeout expires: stop blinking, then hold a static alert on the LEFT
    if (DEBUG_LOG_LEVELS) console.log("[alert] endBlinkAndHold() -> stop blinking, set held alert on LEFT");

    // clear blink interval
    if (blinkIntervalRef.current !== null) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }

    // ensure blink clears
    setBlinkOn(false);
    setIsAlerting(false);
    isAlertingRef.current = false;

    // set the held state so the LEFT side shows static yellow
    setIsHeldAlert(true);
    isHeldAlertRef.current = true;


    clearHeldClearTimeout();
    heldClearTimeoutRef.current = (setTimeout(() => {
      // only clear if still held and not actively alerting again
      if (isHeldAlertRef.current && !isAlertingRef.current) {
        if (DEBUG_LOG_LEVELS) console.log("[alert] auto-clearing held alert after 3 minutes");
        setIsHeldAlert(false);
        isHeldAlertRef.current = false;
      }
      heldClearTimeoutRef.current = null;
    }, HELD_CLEAR_MS) as unknown) as number;

    // clear the alertTimeoutRef (we've reached the end)
    if (alertTimeoutRef.current !== null) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  }

    // cancel alert now
  function cancelAlert() {
    if (DEBUG_LOG_LEVELS) console.log("[alert] cancelAlert()");


    clearHeldClearTimeout();

    // clear timeout if present
    if (alertTimeoutRef.current !== null) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    // clear blink interval
    if (blinkIntervalRef.current !== null) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }

    // clear blinking UI
    setIsAlerting(false);
    isAlertingRef.current = false;
    setBlinkOn(false);

    // clear held static alert (left)
    setIsHeldAlert(false);
    isHeldAlertRef.current = false;
  }

  function startOrRefreshAlert() {
    // if input is currently active (user is answering), do not start alert
    if (latestInputLatchRef.current) return;

    // If we were holding a static alert on the LEFT, reset that when new audio arrives
    if (isHeldAlertRef.current) {
      if (DEBUG_LOG_LEVELS) console.log("[alert] clearing held alert because new audio arrived");
      setIsHeldAlert(false);
      isHeldAlertRef.current = false;

      clearHeldClearTimeout();
    }

    // start blinking if not already
    if (!isAlertingRef.current) {
      if (DEBUG_LOG_LEVELS) console.log("[alert] starting alert (blinking)");
      setIsAlerting(true);
      isAlertingRef.current = true;

      // set initial visible state for blink
      setBlinkOn(true);

      // start blink interval (only once)
      blinkIntervalRef.current = (setInterval(() => {
        setBlinkOn(b => !b);
      }, BLINK_INTERVAL_MS) as unknown) as number;
    }

    // refresh timeout (30s from last detection) -> when this fires we stop blinking and HOLD on the LEFT
    if (alertTimeoutRef.current !== null) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    alertTimeoutRef.current = (setTimeout(() => {
      endBlinkAndHold();
    }, ALERT_DURATION_MS) as unknown) as number;
  }

const handleLevel = (level: number | null | undefined) => {
  if (level === undefined || level === null) {

    return;
  }

  setLastLevel(level);
  const approxDb = level > 0 ? 20 * Math.log10(level) : -120.0;
  if (DEBUG_LOG_LEVELS) {

  }

  // treat as SILENT when level is <= threshold (not strict equality)
  const isSilent = level <= SILENCE_THRESHOLD;

  if (!isSilent) {

    startOrRefreshAlert();
  } else {
    // when silent, do NOT call startOrRefreshAlert() — this allows the existing alert timeout
    // to count down and eventually call cancelAlert() when it expires.

  }
};


  // subscribe to audio for this output (listener if available, otherwise poll via getAudioLevel)
  useEffect(() => {
    if (!outputIntercom) return;
    const port = outputIntercom.port-1;
    if (DEBUG_LOG_LEVELS) console.log("[audio effect] subscribing to port", port);

    let unsubFn: (() => void) | null = null;
    let pollIntervalId: number | null = null;

    // (handleLevel defined above)

    if (typeof db.addAudioListener === "function") {
      try {
        const maybeUnsub = db.addAudioListener(port, (level: number) => {
          handleLevel(level);
        });
        if (typeof maybeUnsub === "function") unsubFn = maybeUnsub;
      } catch (err) {
        console.warn("addAudioListener threw, falling back to polling", err);
      }
    }

    if (!unsubFn) {
      if (typeof db.getAudioLevel === "function") {
        pollIntervalId = setInterval(() => {
          try {
            const lvl = (db as any).getAudioLevel(port);
            handleLevel(lvl);
          } catch (err) {
            console.warn("getAudioLevel threw during poll", err);
          }
        }, 200) as unknown as number;
      } else {
        console.warn("No audio API found on DatabaseHandler (addAudioListener or getAudioLevel). Blinking won't work for port:", port);
      }
    }

    return () => {
      if (DEBUG_LOG_LEVELS) console.log("[audio effect] cleanup for port", port);
      if (unsubFn) {
        try { unsubFn(); } catch (err) {}
        unsubFn = null;
      }
      if (pollIntervalId !== null) {
        clearInterval(pollIntervalId as any);
        pollIntervalId = null;
      }

      clearHeldClearTimeout();
      // we intentionally do NOT clear the alertTimeoutRef here so alert can finish its duration
      // but we DO clear the blink interval to avoid leaks when component unmounts / port changes
      if (blinkIntervalRef.current !== null) {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;
      }
      // do not nuke alertTimeoutRef here to allow the current alert session to continue.
      isAlertingRef.current = false;
    };
  // run only when port changes
  }, [outputIntercom?.port]);
  // layout flex ratios


useEffect(() => {
  const leftValid = hasValidPort(outputIntercom);
  const rightValid = hasValidPort(inputIntercom);

  if (!leftValid && !rightValid) {
    if (DEBUG_LOG_LEVELS) console.log("[component] both ports invalid -> cancelling internal activity");

    // cancel blink/alert and clear timers
    cancelAlert();

    if (blinkIntervalRef.current !== null) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    if (alertTimeoutRef.current !== null) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    // any audio unsub / poll refs you created should also be cleared here
    if (debugIntervalRef.current !== null) {
      clearInterval(debugIntervalRef.current);
      debugIntervalRef.current = null;
    }

    // reset one-shot flag so re-init can run when a valid port returns
    didRunOutputRef.current = null;
  }
  // watch port numbers (coerced to Number so "-1" changes trigger effect)
}, [Number(outputIntercom?.port), Number(inputIntercom?.port)]);

  const hasValidPort = (ic?: types.IntercomInfo | null) =>
  !!ic && Number(ic.port) !== -1;

  
// replace your didRunOutputRef boolean with an id ref:
const didRunOutputRef = useRef<number | null>(null);

useEffect(() => {
  // only try when we have an output intercom of the right type
  if (!outputIntercom || outputIntercom.type !== "output") return;

  const id = outputIntercom.id;
  const port = outputIntercom.port;
  // If we've already attempted for this same output id, don't try again
  if (didRunOutputRef.current === id) return;

  // compute current toggled state from isToggledLookup (same logic as your isOnFor)
  const byId = (isToggledLookup as any)?.[id];
  const extract = (v: any) =>
    v === undefined ? undefined : typeof v === "boolean" ? v : v.toggled ?? v;
  const currentlyOn = Boolean(extract(byId) ?? false);

  // mark as handled for this id so we don't repeatedly try
  didRunOutputRef.current = id;

  // only call the toggle if it's not already ON
  if (!currentlyOn) {
    console.log("[output-init] activating output id=", id, "port=", port);
    onToggleLatch(id, port, false, outputIntercom.type);
  } else {
    // If it's already on, nothing to do
    if (DEBUG_LOG_LEVELS) console.log("[output-init] already on, skipping:", id);
  }
}, [
  outputIntercom?.id,
  outputIntercom?.port,
  outputIntercom?.type,
  isToggledLookup,
  onToggleLatch,
]);

  const openModalFor = (side: "input" | "output", startingValue = 1.0) => {
    setModalSide(side);
    setSliderValue(startingValue);
    setModalVisible(true);
  };

  const handleVolumeChange = (port: number, value: number) => {
    setSliderValue(value);
    db.sendOnChangeVolume(port, value);
  };

  // ----------- helpers -----------
  const stateFlagFor = (ic?: types.IntercomInfo | null) => {
    if (!ic) return false;
    return !ic.omniState && ic.groupState ? ic.groupState : ic.omniState;
  };

  const callSelectedStyle = (
    fn: ((...a: any[]) => any) | undefined,
    filled: boolean,
    stateFlag: number | boolean,
    colourDefault = "rgba(66, 63, 63, 0.75)"
  ) => {
    if (!fn) return {};
    try {
      const arity = (fn as any).length ?? 0;
      if (arity >= 3) return fn(filled, stateFlag, colourDefault);
      return fn(filled, stateFlag);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("selectedStyle threw:", err);
      return {};
    }
  };

  const isOnFor = (ic?: types.IntercomInfo | null) => {
    if (!ic || !isToggledLookup) return false;
    const byId = (isToggledLookup as any)[ic.id];
    const extract = (v: any) =>
      v === undefined ? undefined : typeof v === "boolean" ? v : v.toggled ?? v;
    return Boolean(extract(byId) ?? false);
  };



  const inputTileStyleRaw = inputIntercom
    ? callSelectedStyle(
        selectedStyleForInput,
        isOnFor(inputIntercom),
        stateFlagFor(inputIntercom),
        "rgba(0,0,0,0.5)"
      )
    : {};

  // remove any backgroundColor from per-half tile styles — we draw the background at the container level
  const stripBackground = (obj: any) => {
    if (!obj) return {};
    const clone = { ...obj };
    if (clone && typeof clone === "object" && "backgroundColor" in clone) {
      delete clone.backgroundColor;
    }
    return clone;
  };
  
  const inputTileStyle = stripBackground(inputTileStyleRaw);

  // Determine combined base color:
  // When the RIGHT (input) is ON, base becomes a lighter gray.
  // Otherwise prefer the input's backgroundColor (if any), else the output's, else default.
  const defaultBase = "rgba(66, 63, 63, 0.75)";
  const inputBg = (inputTileStyleRaw && (inputTileStyleRaw as any).backgroundColor) || null;

  const inputIsOn = isOnFor(inputIntercom);
  const baseColor = inputIsOn
    ? "rgba(116, 115, 115, 0.95)" // lighter gray when input active
    : inputBg ?? defaultBase;


  const displayBaseColor = baseColor;
  // compute green fill overlay based on sliderValue (0..1)
  const clamped = Math.max(0, Math.min(1, sliderValue ?? 0));
  const fillWidth = `${Math.round(clamped * 100)}%`;
  // semi-transparent green
  const fillColor = `rgba(26, 86, 14)`;;


  
  const leftExists = hasValidPort(outputIntercom);
  const rightExists = hasValidPort(inputIntercom);
  const leftFlex = leftExists && rightExists ? 1 : 1;
  const rightFlex = leftExists && rightExists ? 2 : 1;
  const minWidth = 8;

  if (!leftExists && !rightExists) {
  // We intentionally return null; the cleanup effect above handles stopping timers/subscriptions.
  return null;
}

  if (isTablet) return (
    <>
      {/* Outer wrapper — we draw the shared background + left→right fill here */}
      <View style={[outerViewStyle, { borderRadius: 10, flexDirection: "row", padding: 5,  minWidth: misc.getLandscapeWidth() / 8,height: "50%" }]}>
        {/* --- inside the tablet branch: container view --- */}
        <View
          style={[
            textViewStyle,
            {
              // combined container background (shared by both halves)
              backgroundColor: displayBaseColor,
              borderRadius: 10,
              borderColor: "black",
              borderWidth: 2,
              position: "relative",
              overflow: "hidden",
              flexDirection: "row",
              height: "100%",
            },
          ]}
        >
          {/* LEFT = OUTPUT */}
          {leftExists && (
            <Pressable
              style={{ flex: leftFlex, backgroundColor:"rgba(66, 63, 63, 0.75)" }}
              onLongPress={() => openModalFor("output", sliderValue)}
              delayLongPress={300}
              
            >
              {/* make this container position:relative so we can absolute-position the alert overlay */}
              <View
                style={{
                  ...styles.outputStyles.textContainer,
                  position: "relative",
                  borderTopLeftRadius: 10,
                  borderBottomLeftRadius: 10,
                  borderRightWidth: 3,
                  borderColor: "black",

                }}
              >
                {/* left-side blinking alert overlay (fills entire left half only) */}
                {isAlerting && blinkOn && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      backgroundColor: ALERT_COLOR,
                      zIndex: 0,
                    }}
                  />
                )}

                {/* left-side static hold overlay (after blink timed out) */}
                {isHeldAlert && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      backgroundColor: ALERT_COLOR,
                      zIndex: 0,
                      // optional: make it less intense: opacity: 0.9,
                    }}
                  />
                )}

                {/* content above overlays */}
                <View style={{ zIndex: 1, flex: 3, justifyContent: "center", alignItems: "center", margin: 1, flexDirection: "row" }}>
                  <Text style={{ ...textStyle, fontSize: 12, textAlign: "center" }}>{Math.round(clamped * 100)}%</Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* RIGHT = INPUT */}
          {rightExists && (
            <Pressable
              style={{ flex: rightFlex }}
              onPress={() => {
                if (isAlertingRef.current || isHeldAlertRef.current) {
                      cancelAlert();
                }                
                const ic = inputIntercom!;
                if (ic.latchState) {
                  const modeState = ic.omniState ? ic.omniState : ic.groupState;
                  onToggleLatch(ic.id, ic.port, modeState, ic.type);
                }
              }}
              onPressIn={() => {
                if (isAlertingRef.current || isHeldAlertRef.current) {
                      cancelAlert();
                }
                const ic = inputIntercom!;
                if (!ic.latchState) onToggleUnlatchPress(ic.id, ic.port, ic.type);
              }}
              onPressOut={() => {
                if (isAlertingRef.current || isHeldAlertRef.current) {
                      cancelAlert();
                }
                const ic = inputIntercom!;
                if (!ic.latchState) onToggleUnlatchRelease(ic.id, ic.port, ic.type);
              }}
              delayLongPress={300}
            >
            <View
              style={[
                styles.outputStyles.textContainer,
                inputTileStyle,
                {
                  position: "relative",
                  backgroundColor: "transparent",
                  borderTopRightRadius: 10,
                  borderBottomRightRadius: 10,

                  // IMPORTANT: clip the split background to rounded corners
                  overflow: "hidden",
                },
              ]}
            >
                {/* RIGHT membership background (only when BOTH groups are true) */}
                {inputInBoth && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      zIndex: 0,
                    }}
                  >
                    {inputInOmni && inputInGroup ? (
                      <View style={{ flex: 1, flexDirection: "row" }}>
                        <View style={{ flex: 1, backgroundColor: groupColour }} />
                        <View style={{ flex: 1, backgroundColor: omniColour }} />
                      </View>
                    ) : inputInGroup ? (
                      <View style={{ flex: 1, backgroundColor: groupColour }} />
                    ) : inputInOmni ? (
                      <View style={{ flex: 1, backgroundColor: omniColour }} />
                    ) : (
                      <View style={{ flex: 1, backgroundColor: baseGrey }} />
                    )}
                  </View>
                )}

                {/* right-side green fill overlay that grows from the RIGHT edge inward */}
                {inputIsOn && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.round(clamped * 100)}%`,
                      backgroundColor: fillColor,
                      zIndex: 1,
                    }}
                  />
                )}

                {/* content above overlays */}
                <View style={{ zIndex: 2, flex: 3, justifyContent: "flex-start", alignItems: "flex-start", marginLeft: 10 }}>
                  <Text style={{ ...textStyle, fontSize: isTablet ? 12 : 15 }}>{inputIntercom?.name}</Text>
                </View>
              </View>

            </Pressable>
          )}
        </View>

      </View>

      {/* Shared modal for volume */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
        supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
      >
        <View style={localstyles.modalOverlay}>
          <View style={localstyles.modalContent}>
            <Text style={localstyles.modalTitle}>{Math.round(sliderValue * 100)}%</Text>
            <Slider
              style={localstyles.slider}
              minimumValue={0}
              maximumValue={1}
              value={sliderValue}
              onValueChange={(v) => {
                setSliderValue(v);
                const port = modalSide === "output" ? outputIntercom?.port : inputIntercom?.port;
                if (port !== undefined && port !== null) db.sendOnChangeVolume(port, v);
              }}
              step={0.01}
            />
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </View>

      </Modal>
      
    </>
    
  );
  else return (
        <>
      {/* Outer wrapper — we draw the shared background + left→right fill here */}
      <View style={[outerViewStyle, { borderRadius: 10 }]}>
        <View
          style={[
            textViewStyle,
            {
              // combined container background (shared by both halves)
              backgroundColor: displayBaseColor,
              borderRadius: 10,
              borderColor: "black",
              borderWidth: 2,
              position: "relative",
              overflow: "hidden",
              flexDirection: "row",
              height: "100%",
            },
          ]}
        >
          {/* LEFT = OUTPUT */}
          {leftExists && (
            <Pressable
              style={{ flex: leftFlex, backgroundColor:"rgba(66, 63, 63, 0.75)" }}
              onLongPress={() => openModalFor("output", sliderValue)}
              delayLongPress={300}
            >
              <View
                style={{
                  ...styles.outputStyles.textContainer,
                  position: "relative",
                  borderTopLeftRadius: 10,
                  borderBottomLeftRadius: 10,
                  borderRightWidth: 3,
                  borderColor: "black",
                }}
              >
              {isAlerting && blinkOn && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: ALERT_COLOR,
                    zIndex: 0,
                  }}
                />
              )}

              {/* left-side static hold overlay (after blink timed out) */}
              {isHeldAlert && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: ALERT_COLOR,
                    zIndex: 0,
                    // optional: make it less intense: opacity: 0.9,
                  }}
                />
              )}

                <View style={{ zIndex: 1, flex: 3, justifyContent: "center", alignItems: "center", margin: 1, flexDirection: "row" }}>
                  <Text style={{ ...textStyle, fontSize: 10, textAlign: "center" }}>{Math.round(clamped * 100)}%</Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* RIGHT = INPUT */}
          {rightExists && (
            <Pressable
              style={{ flex: rightFlex }}
              onPress={() => {
                  if (isAlertingRef.current || isHeldAlertRef.current) {
                    cancelAlert();
                  }
                const ic = inputIntercom!;
                if (ic.latchState) {

                  const modeState = ic.omniState ? ic.omniState : ic.groupState;
                  onToggleLatch(ic.id, ic.port, modeState, ic.type);
                }
              }}
              onPressIn={() => {
                if (isAlertingRef.current || isHeldAlertRef.current) {
                    cancelAlert();
                }
                const ic = inputIntercom!;
                if (!ic.latchState) onToggleUnlatchPress(ic.id, ic.port, ic.type);
              }}
              onPressOut={() => {
                if (isAlertingRef.current || isHeldAlertRef.current) {
                    cancelAlert();
                }
                const ic = inputIntercom!;
                if (!ic.latchState) onToggleUnlatchRelease(ic.id, ic.port, ic.type);
              }}
              delayLongPress={300}
            >
            <View
              style={[
                styles.outputStyles.textContainer,
                inputTileStyle,
                {
                  position: "relative",
                  backgroundColor: "transparent",
                  borderTopRightRadius: 10,
                  borderBottomRightRadius: 10,

                  // IMPORTANT: clip the split background to rounded corners
                  overflow: "hidden",
                },
              ]}
            >
              {/* RIGHT membership background (only when BOTH groups are true) */}
              {inputInBoth && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  zIndex: 0,
                }}
              >
                {inputInOmni && inputInGroup ? (
                  <View style={{ flex: 1, flexDirection: "row" }}>
                    <View style={{ flex: 1, backgroundColor: groupColour }} />
                    <View style={{ flex: 1, backgroundColor: omniColour }} />
                  </View>
                ) : inputInGroup ? (
                  <View style={{ flex: 1, backgroundColor: groupColour }} />
                ) : inputInOmni ? (
                  <View style={{ flex: 1, backgroundColor: omniColour }} />
                ) : (
                  <View style={{ flex: 1, backgroundColor: baseGrey }} />
                )}
              </View>
              )}

              {/* right-side green fill overlay that grows from the RIGHT edge inward */}
              {inputIsOn && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: `${Math.round(clamped * 100)}%`,
                    backgroundColor: fillColor,
                    zIndex: 1,
                  }}
                />
              )}

              {/* content above overlays */}
              <View style={{ zIndex: 2, flex: 3, justifyContent: "flex-start", alignItems: "flex-start", marginLeft: 10 }}>
                <Text style={{ ...textStyle, fontSize: isTablet ? 12 : 15 }}>{inputIntercom?.name}</Text>
              </View>
            </View>

            </Pressable>
          )}
        </View>
      </View>

      {/* Shared modal for volume */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
        supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
      >
        <View style={localstyles.modalOverlay}>
          <View style={localstyles.modalContent}>
            <Text style={localstyles.modalTitle}>{Math.round(sliderValue * 100)}%</Text>
            <Slider
              style={localstyles.slider}
              minimumValue={0}
              maximumValue={1}
              value={sliderValue}
              onValueChange={(v) => {
                setSliderValue(v);
                const port = modalSide === "output" ? outputIntercom?.port : inputIntercom?.port;
                if (port !== undefined && port !== null) db.sendOnChangeVolume(port, v);
              }}
              step={0.01}
            />
            <Button title="Close" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </>

  )
};

export default InfoOutputView;

const localstyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  slider: {
    width: "100%",
    height: 40,
    marginBottom: 20,
  },
});
