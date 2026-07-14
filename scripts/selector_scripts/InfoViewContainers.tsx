import { View, Modal, Button, Text } from "react-native";
import InfoInputView from "./InfoInputView";
import InfoOutputView from "./InfoOutputView";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import * as styles from "../styles";
import { IntercomInfo, InputInfo, TemplateInfo } from "../types";
import { DatabaseHandler } from "@/scripts/database/database";
import * as misc from "../misc";
import * as generalComponent from "../general_scripts/custom_components";
import Slider from "@react-native-community/slider";
import { StyleSheet } from "react-native";
import * as Device from "expo-device";
import {
  DropProvider,
  SortableGrid,
  SortableGridItem,
  GridOrientation,
  GridStrategy,
  SortableGridRenderItemProps,
} from "react-native-reanimated-dnd";
/** -------------------- OUTPUT -------------------- */

type OutputProps = {
  intercomInfo: IntercomInfo[];
  chosenTemplate: TemplateInfo;
  outputToggleStates: { [port: number]: { toggled: boolean; activated: boolean } };
  onToggleLatch: (id: number, port: number, groupState: boolean, type: string) => void;
  onToggleUnlatchPress: (id: number, port: number, type: string) => void;
  onToggleUnlatchRelease: (id: number, port: number, type: string) => void;
  isAppActive?: boolean;
  pageIndex?: number; // 0-based “which phone page”
  pageSize?: number;  // how many tiles per page (ex: 12)
};

export const InfoViewOuputContainer: React.FC<OutputProps> = ({
  intercomInfo,
  chosenTemplate,
  outputToggleStates,
  onToggleLatch,
  onToggleUnlatchPress,
  onToggleUnlatchRelease,
  isAppActive = true,
  pageIndex = 0,
  pageSize,
}) => {
  const db = DatabaseHandler.getInstance();

  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const type = await Device.getDeviceTypeAsync();
      if (mounted) setIsTablet(type === Device.DeviceType.TABLET);
    })();
    return () => { mounted = false; };
  }, []);

  // Optional: skip all heavy rendering when backgrounded
  if (!isAppActive) {
    return null;
  }

  const outputIntercoms = useMemo(
    () => intercomInfo.filter((ic) => ic.type === "output"),
    [intercomInfo]
  );
  const inputIntercoms = useMemo(
    () => intercomInfo.filter((ic) => ic.type === "input"),
    [intercomInfo]
  );

  const hasInput = inputIntercoms.length > 0;
  const hasOutput = outputIntercoms.length > 0;

  if (isTablet) {
      const tabletOuterStyle = {

      height: "100%",
      flexDirection: "row",
      padding:5,
      // IMPORTANT: do NOT set minHeight here
    };
    const CHUNK = 16;
    const outputBlocks = Math.ceil(outputIntercoms.length / CHUNK);
    const inputBlocks = Math.ceil(inputIntercoms.length / CHUNK);
    const blocks = Math.max(outputBlocks, inputBlocks);

    const basePerBlock =
      hasInput && hasOutput ? 0.9 :
      (hasInput || hasOutput) ? 0.9 :
      0;

    const containerFlex = basePerBlock * blocks;

    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    const BASE = 45;
    const STEP = 40;

    return (
      <View
        style={{
          flex: containerFlex,
          flexDirection: "column",
          justifyContent: "flex-start",
          display: "flex",
          width: "100%",
        }}
      >
        {Array.from({ length: blocks }).map((_, blockIdx) => {
          const outSlice = outputIntercoms.slice(blockIdx * CHUNK, blockIdx * CHUNK + CHUNK);
          const inSlice = inputIntercoms.slice(blockIdx * CHUNK, blockIdx * CHUNK + CHUNK);

          const val = clamp(BASE + blockIdx * STEP);
          const chunkBg = `rgb(${val}, ${val}, ${val})`;
          const addLineBreak = blockIdx < blocks - 1;

          return (
            <View
              key={`block-container-${blockIdx}`}
              style={{
                flex: 1,
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "flex-start",
              }}
            >
              {Array.from({ length: CHUNK }).map((__, idx) => {
                const outputIntercom = outSlice[idx];
                const inputIntercom = inSlice[idx];
                if (!outputIntercom && !inputIntercom) return null;

                return (
                  <InfoOutputView
                    key={`slot-${blockIdx}-${idx}`}
                    inputIntercom={inputIntercom}
                    outputIntercom={outputIntercom}
                    outerViewStyle={tabletOuterStyle}   // ✅ no tileStyle on tablet
                    textViewStyle={styles.outputStyles.textContainer}
                    textStyle={styles.generalStyles.text}
                    selectedStyleForOutput={
                      outputIntercom
                        ? !outputIntercom.omniState && outputIntercom.groupState
                          ? styles.getInfoViewPressableStyleOutputGroup
                          : !outputIntercom.omniState && !outputIntercom.groupState
                          ? styles.getInfoViewPressableStyleOutput
                          : styles.getInfoViewPressableStyleOutputOmni
                        : styles.getInfoViewPressableStyleOutput
                    }
                    selectedStyleForInput={
                        inputIntercom
                          ? inputIntercom.omniState && inputIntercom.groupState
                            ? styles.getInfoViewPressableStyleOutput // neutral base (or transparent)
                            : inputIntercom.omniState && !inputIntercom.groupState
                            ? styles.getInfoViewPressableStyleOutputOmni
                            : !inputIntercom.omniState && !inputIntercom.groupState
                            ? styles.getInfoViewPressableStyleOutput
                            : styles.getInfoViewPressableStyleOutputGroup
                          : styles.getInfoViewPressableStyleInput
                      }
                    isToggledLookup={outputToggleStates}
                    onToggleLatch={onToggleLatch}
                    onToggleUnlatchPress={onToggleUnlatchPress}
                    onToggleUnlatchRelease={onToggleUnlatchRelease}
                    templateInfo={chosenTemplate}
                    isTablet={true}
                  />
                );
              })}

              {addLineBreak ? generalComponent.getSelectorLineBreak() : null}
            </View>
          );
        })}
      </View>
    );
  }


  const pagedMode = !isTablet && typeof pageSize === "number" && pageSize > 0;
  const CHUNK = pagedMode ? pageSize : (isTablet ? 16 : 32);
  const outputBlocks = Math.ceil(outputIntercoms.length / CHUNK);
  const inputBlocks = Math.ceil(inputIntercoms.length / CHUNK);
  const computedBlocks = Math.max(outputBlocks, inputBlocks);
  const blocks = pagedMode ? 1 : computedBlocks;

  const basePerBlock =
    hasInput && hasOutput ? 0.9 :
    (hasInput || hasOutput) ? 0.9 :
    0;

  const containerFlex = isTablet ? basePerBlock * blocks : 1;

const columns = isTablet ? 8 : (pagedMode ? 2 : 3);

// ✅ How many tiles are laid out per “page area”
// - phone paged mode: exactly one page slice (pageSize tiles)
// - tablet: we keep CHUNK=16 and allow multiple blocks; total visible tiles = CHUNK * blocks
const tilesPerArea = pagedMode ? CHUNK : (CHUNK * blocks);

// ✅ rows = tiles / columns (rounded up just in case)
const totalRows = Math.ceil(tilesPerArea / columns);

const heightPct = 100 / totalRows;

const tileStyle = {
  flexGrow: 0,
  flexShrink: 0,
  width: `${100 / columns}%`,
  height: `${heightPct}%`,
  padding: 5,
};


 return (
      <View
        style={
          isTablet
            ? {
                flex: containerFlex,
                flexDirection: "column",
                justifyContent: "flex-start",
                display: "flex",
                width: "100%",
              }
            : { flex: containerFlex, width: "100%" } // phone: unchanged behavior
        }
      >
      {Array.from({ length: blocks }).map((_, blockIdx0) => {
        // ✅ Choose which slice to show
        const sliceIndex = pagedMode ? pageIndex : blockIdx0;

        const outSlice = outputIntercoms.slice(sliceIndex * CHUNK, sliceIndex * CHUNK + CHUNK);
        const inSlice = inputIntercoms.slice(sliceIndex * CHUNK, sliceIndex * CHUNK + CHUNK);

        // ✅ In pagedMode, no internal “line break” between blocks (there is only one)
        const addLineBreak = !pagedMode && blockIdx0 < blocks - 1;

        return (
          <View
            key={`block-${pagedMode ? `page-${pageIndex}` : blockIdx0}`}
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "flex-start",
              width: "100%",
            }}
          >
            {Array.from({ length: CHUNK }).map((__, idx) => {
              const outputIntercom = outSlice[idx];
              const inputIntercom = inSlice[idx];
              if (!outputIntercom && !inputIntercom) return null;

              return (
                <InfoOutputView
                  key={`slot-${pagedMode ? `page-${pageIndex}` : blockIdx0}-${idx}`}
                  inputIntercom={inputIntercom}
                  outputIntercom={outputIntercom}
                  outerViewStyle={
                    isTablet
                      ? styles.outputStyles.infoContainer
                      : [styles.outputStyles.infoContainer, tileStyle]
                  }
                  textViewStyle={styles.outputStyles.textContainer}
                  textStyle={styles.generalStyles.text}
                  selectedStyleForOutput={
                    outputIntercom
                      ? !outputIntercom.omniState && outputIntercom.groupState
                        ? styles.getInfoViewPressableStyleOutputGroup
                        : !outputIntercom.omniState && !outputIntercom.groupState
                        ? styles.getInfoViewPressableStyleOutput
                        : styles.getInfoViewPressableStyleOutputOmni
                      : styles.getInfoViewPressableStyleOutput
                  }
                  selectedStyleForInput={
                    inputIntercom
                      ? inputIntercom.omniState && !inputIntercom.groupState
                        ? styles.getInfoViewPressableStyleOutputOmni
                        : !inputIntercom.omniState && !inputIntercom.groupState
                        ? styles.getInfoViewPressableStyleOutput
                        : styles.getInfoViewPressableStyleOutputGroup
                      : styles.getInfoViewPressableStyleInput
                  }
                  isToggledLookup={outputToggleStates}
                  onToggleLatch={onToggleLatch}
                  onToggleUnlatchPress={onToggleUnlatchPress}
                  onToggleUnlatchRelease={onToggleUnlatchRelease}
                  templateInfo={chosenTemplate}
                  isTablet={isTablet}
                />
              );
            })}

            {addLineBreak ? generalComponent.getSelectorLineBreak() : null}
          </View>
        );
      })}
    </View>
  );
};

/** -------------------- INPUT -------------------- */

type InputProps = {
  inputInfo: InputInfo[];
  chosenTemplate: TemplateInfo;
  inputToggleStates: { [port: number]: boolean };
  onToggleInput: (port: number) => void;
  isInputGroupingEditMode?: boolean;
  isInputReorderMode?: boolean;
  onReorderInputs?: (newInputInfo: InputInfo[]) => void;
  editingGroupPorts?: number[];
  parentWidth: number;
  parentHeight: number;
  inputVolumes: { [port: number]: number };
  onInputVolumeChange: (port: number, value: number) => void;
  onInputVolumeLongPress: (port: number) => void;
  isAppActive?: boolean;
  isInputDeleteMode?: boolean;
  hiddenInputPorts?: number[];
  onToggleInputHidden?: (port: number) => void;
};

type DndInputInfo = InputInfo & {
  id: string;
};

export const InfoViewInputContainer: React.FC<InputProps> = ({
  inputInfo,
  chosenTemplate,
  inputToggleStates,
  onToggleInput,
  isInputGroupingEditMode = false,
  isInputReorderMode = false,
  isInputDeleteMode = false,
  hiddenInputPorts = [],
  onToggleInputHidden,
  onReorderInputs,
  editingGroupPorts = [],
  parentWidth,
  parentHeight,
  inputVolumes,
  onInputVolumeChange,
  onInputVolumeLongPress,
  isAppActive = true,
}) => {
  const db = DatabaseHandler.getInstance();

  // Optional: skip all heavy rendering when backgrounded
  if (!isAppActive) {
    return null;
  }

  const inputAmount = inputInfo.length;
  const hiddenInputPortSet = useMemo(
  () => new Set(hiddenInputPorts),
  [hiddenInputPorts]
  );
  const windowWidth = misc.getLandscapeWidth();

  const [selectedVolumePort, setSelectedVolumePort] = useState<number | null>(null);
  const selectedInput = useMemo(
    () => inputInfo.find((input) => input.port === selectedVolumePort) ?? null,
    [inputInfo, selectedVolumePort]
  );
  const selectedInputVolume = selectedVolumePort != null
    ? (inputVolumes[selectedVolumePort] ?? 1)
    : 1;

  const handleOpenVolumeModal = useCallback((port: number) => {
    setSelectedVolumePort(port);
    onInputVolumeLongPress(port);
  }, [onInputVolumeLongPress]);

  const handleVolumeChange = useCallback((value: number) => {
    if (selectedVolumePort == null) return;
    onInputVolumeChange(selectedVolumePort, value);
  }, [onInputVolumeChange, selectedVolumePort]);

  const handleCloseModal = useCallback(() => {
    setSelectedVolumePort(null);
  }, []);

  const [slavePorts, setSlavePorts] = useState<number[][]>([[], [], [], []]);
  const [slaveColors, setSlaveColors] = useState<(string | null)[]>([null, null, null, null]);

  useEffect(() => {
    if (!chosenTemplate || !chosenTemplate.isMaster) {
      setSlavePorts([[], [], [], []]);
      setSlaveColors([null, null, null, null]);
      return;
    }

    const unsub = db.subscribeToPlayers((players) => {
      const slaves = players
        .filter((p: any) => !!p.isSlave)
        .slice(0, 4)
        .sort((a: any, b: any) => Number(a.id) - Number(b.id));

      const arr: number[][] = slaves.map((s: any) => {
        if (Array.isArray(s.active_ports)) {
          return s.active_ports.map((x: any) => Number(x)).filter((x: number) => !Number.isNaN(x));
        } else if (s.active_port != null) {
          const v = Number(s.active_port);
          return Number.isNaN(v) ? [] : [v];
        }
        return [];
      });

      const colors = slaves.map((s: any) => (s.slaveColor ?? s.slave_color ?? s.color ?? null));

      while (arr.length < 4) arr.push([]);
      while (colors.length < 4) colors.push(null);

      setSlavePorts(arr.slice(0, 4));
      setSlaveColors(colors.slice(0, 4));
    });

    return () => unsub();
  }, [chosenTemplate, db]);

  const visibleCount = Math.min(inputAmount);

  const reorderInputInfo = useMemo<DndInputInfo[]>(
    () =>
      inputInfo.map((input) => ({
        ...input,
        id: String(input.port),
      })),
    [inputInfo]
  );

  const gridColumns = useMemo(() => {
    if (!parentWidth || !parentHeight || inputAmount <= 0) return 1;

    const effectiveN = Math.max(inputAmount, 32);
    let bestCols = 1;
    let bestArea = -1;

    for (let c = 1; c <= 32; c++) {
      const rows = Math.ceil(effectiveN / c);
      const width = parentWidth / c;
      const height = parentHeight / rows;
      const size = Math.min(width, height);
      const area = size * size;

      if (area > bestArea) {
        bestArea = area;
        bestCols = c;
      }
    }

    return bestCols;
  }, [parentWidth, parentHeight, inputAmount]);

  const gridItemSize = useMemo(() => {
    if (!parentWidth || !parentHeight) return 80;

    const effectiveN = Math.max(inputAmount, 32);
    const rows = Math.ceil(effectiveN / gridColumns);

    return Math.floor(Math.min(parentWidth / gridColumns, parentHeight / rows));
  }, [parentWidth, parentHeight, inputAmount, gridColumns]);

const renderInputTile = (input: InputInfo) => {
  const isDeleted = hiddenInputPortSet.has(input.port);

  return (
    <InfoInputView
      port={input.port}
      imagePath={input.picturePath}
      name={input.name}
      outerViewStyle={styles.inputStyles.infoContainer}
      imageViewStyle={styles.inputStyles.imageContainer}
      textViewStyle={styles.inputStyles.textContainer}
      imageStyle={styles.generalStyles.image}
      textStyle={styles.generalStyles.text}
      selectedStyle={styles.getInfoViewPressableStyleInput}
      templateInfo={chosenTemplate}
      slaveActivePorts={slavePorts}
      slaveColors={slaveColors}
      isToggled={!!inputToggleStates[input.port]}
      isEditingMode={
        isInputGroupingEditMode ||
        isInputReorderMode
      }
      isEditSelected={
        editingGroupPorts.includes(input.port)
      }
      isDeleted={
        isInputReorderMode && isDeleted
      }
      onToggle={
        isInputDeleteMode
          ? () => onToggleInputHidden?.(input.port)
          : isInputReorderMode
            ? () => {}
            : onToggleInput
      }
      width={windowWidth}
      inputAmount={visibleCount}
      parentWidth={parentWidth}
      parentHeight={parentHeight}
      inputInfoList={inputInfo}
      onLongPress={() => {
        if (
          !isInputReorderMode &&
          !isInputDeleteMode
        ) {
          handleOpenVolumeModal(input.port);
        }
      }}
    />
  );
};

  const renderSortableInput = useCallback(
    ({
      item,
      id,
      positions,
      ...props
    }: SortableGridRenderItemProps<DndInputInfo>) => (
      <SortableGridItem
        key={id}
        id={id}
        data={item}
        positions={positions}
        {...props}
        onDrop={(id: string, position: number, allPositions?: any) => {
          if (!allPositions) return;

          const reordered = Object.entries(allPositions)
            .sort((a, b) => (a[1] as { index: number }).index - (b[1] as { index: number }).index)
            .map(([itemId]) => inputInfo.find((input) => String(input.port) === itemId))
            .filter(Boolean) as InputInfo[];

          onReorderInputs?.(reordered);
        }}
      >
<View
  style={{
    width: gridItemSize,
    height: gridItemSize,
    backgroundColor: "rgba(255, 0, 0, 0.18)",
    borderWidth: 2,
    borderColor: "rgba(255, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  }}
>
  {renderInputTile(item)}
</View>
      </SortableGridItem>
    ),
    [
      inputInfo,
      onReorderInputs,
      gridItemSize,
      inputToggleStates,
      isInputGroupingEditMode,
      isInputReorderMode,
      isInputDeleteMode,
      hiddenInputPorts,
      onToggleInputHidden,
      editingGroupPorts,
      parentWidth,
      parentHeight,
      slavePorts,
      slaveColors,
    ]
  );

  return (
    <>
{isInputReorderMode ? (
  isInputDeleteMode ? (
    /*
     * Delete mode uses the ordinary input grid instead of SortableGrid.
     * This makes pressing toggle deletion instead of beginning a drag.
     */
    inputInfo.map(input => (
      <View key={`delete-${input.port}`}>
        {renderInputTile(input)}
      </View>
    ))
  ) : (
    <DropProvider>
      <SortableGrid
        data={reorderInputInfo}
        renderItem={renderSortableInput}
        dimensions={{
          columns: gridColumns,
          itemWidth: gridItemSize,
          itemHeight: gridItemSize,
          columnGap: 0,
          rowGap: 0,
        }}
        orientation={GridOrientation.Vertical}
        strategy={GridStrategy.Insert}
        scrollEnabled={false}
        style={{
          width: "100%",
          height: "100%",
        }}
        contentContainerStyle={{
          width: "100%",
          height: "100%",
        }}
      />
    </DropProvider>
  )
) : (
  inputInfo.map(input => (
    <View key={input.port}>
      {renderInputTile(input)}
    </View>
  ))
)}

      <Modal
        transparent
        visible={selectedVolumePort !== null}
        animationType="none"
        onRequestClose={handleCloseModal}
        supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
      >
        <View style={localstyles.modalOverlay}>
          <View style={localstyles.modalContent}>
            <Text style={localstyles.modalTitle}>
              {selectedInput ? `${selectedInput.name} Volume: ${(selectedInputVolume * 100).toFixed(0)}%` : "Volume"}
            </Text>
            <Slider
              style={localstyles.slider}
              minimumValue={0}
              maximumValue={2}
              value={selectedInputVolume}
              onValueChange={handleVolumeChange}
              step={0.01}
            />
            <Button title="Close" onPress={handleCloseModal} />
          </View>
        </View>
      </Modal>
    </>
  );
};

const localstyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "40%",
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
