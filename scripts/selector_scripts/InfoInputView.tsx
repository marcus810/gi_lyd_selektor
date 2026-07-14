import { View, Text, Image, Pressable, Dimensions, StyleSheet, ViewStyle } from 'react-native';
import React, { useMemo } from 'react'
import * as types from '../types'
import { DatabaseHandler } from '@/scripts/database/database'

const InfoInputView = (({
  port,
  imagePath,
  name,
  outerViewStyle,
  imageViewStyle,
  textViewStyle,
  imageStyle,
  textStyle,
  selectedStyle,
  isToggled,
  isEditingMode,
  isEditSelected,
  isDeleted = false,
  onToggle,
  inputAmount,
  parentWidth,
  parentHeight,
  inputInfoList,
  onLongPress,
  templateInfo,
  slaveActivePorts,
  slaveColors
}: types.InfoInputViewProps & {
  isToggled: boolean
  isEditingMode?: boolean
  isDeleted?: boolean
  isEditSelected?: boolean
  onToggle: (port: number) => void
  inputInfoList: types.InputInfo[]
  onLongPress: () => void
  slaveActivePorts?: number[][]
  slaveColors?: (string | null)[]
}) => {
  const imageSource = { uri: imagePath }

  const win = Dimensions.get('window')
  const CW = (parentWidth && parentWidth > 0) ? parentWidth : win.width
  const CH = (parentHeight && parentHeight > 0) ? parentHeight : win.height

  const horizontalGutter = 0

  // actual number of items
  const N = Math.max(1, inputAmount || (Array.isArray(inputInfoList) ? inputInfoList.length : 1))

  // compute single shared tile size + chosen columns (memoized)
  const { bestW, bestH, bestCols } = useMemo(() => {
    if (!CW || CW <= 0 || !CH || CH <= 0) return { bestW: 0, bestH: 0, bestCols: 1 }

    // use an effective N that's at least 32 so sizing is computed as if there were 32 items
    const effectiveN = Math.max(N, 32)

    // candidate column counts 1..32 (we cap candidates at 32)
    const maxCandidates = 32

    let bestArea = -1
    let bestW = 0
    let bestH = 0
    let bestCols = 1

    for (let c = 1; c <= maxCandidates; c++) {
      const r = Math.ceil(effectiveN / c)            // NOTE: use effectiveN here
      const totalGutters = Math.max(0, (c - 1) * horizontalGutter)
      const wByCols = (CW - totalGutters) / c
      const hByRows = CH / r
      // same constraint logic as before
      const w = Math.min(wByCols, hByRows)
      const h = Math.min(hByRows, w)
      const area = w * h
      if (Number.isFinite(area) && area > bestArea) {
        bestArea = area
        bestW = w
        bestH = h
        bestCols = c
      }
    }

    if (!Number.isFinite(bestW) || bestW <= 0) return { bestW: 0, bestH: 0, bestCols: 1 }

    return { bestW: Math.floor(bestW), bestH: Math.floor(bestH), bestCols }
  }, [CW, CH, N, horizontalGutter]) // keep dependencies minimal and correct

  // helper to render 4 faded circles for the "slave" column
  const resolvedSelectedStyle = () => {
    if (isEditingMode) {
      if (isDeleted) {
        return {
          backgroundColor: '#d62828',
        };
      }

      return {
        backgroundColor: isEditSelected
          ? '#2f80ff'
          : '#6b7280',
      };
    }

    return selectedStyle(isToggled);
  };

const SlaveColumn = ({
  slaveActivePortsLocal,
  slaveColorsLocal
}: {
  slaveActivePortsLocal?: number[][]
  slaveColorsLocal?: (string | null)[]
}) => {
  const portsBySlave = Array.isArray(slaveActivePortsLocal)
    ? slaveActivePortsLocal
    : [[], [], [], []]

  const colorsBySlave = Array.isArray(slaveColorsLocal)
    ? slaveColorsLocal
    : [null, null, null, null]

  return (
    <View style={styles.slaveColumn} pointerEvents="none">
      {[0, 1, 2, 3].map((i) => {
        const ports =
          Array.isArray(portsBySlave[i])
            ? portsBySlave[i].map(Number).filter(n => !Number.isNaN(n))
            : []

        const isLit = ports.includes(port)

        const baseColor = colorsBySlave[i] ?? 'rgba(180,180,180,1)'
        const alpha = isLit ? 0.95 : 0.28

        // convert rgba(x,x,x,1) → rgba(x,x,x,ALPHA)
        const color = baseColor.replace(/rgba\(([^)]+),\s*1\)/, `rgba($1,${alpha})`)

        const extraStyle = isLit
          ? { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2, elevation: 3 }
          : {}

        return (
          <View
            key={i}
            style={[
              styles.slaveCircle,
              { backgroundColor: color },
              extraStyle
            ]}
          />
        )
      })}
    </View>
  )
}

  if (bestW === 0 || bestH === 0) {
    return (
      <Pressable style={[outerViewStyle]} onPress={() => onToggle(port)} onLongPress={onLongPress} delayLongPress={300}>
        <View style={[imageViewStyle, resolvedSelectedStyle()] }>
          <Image source={imageSource} style={imageStyle} />
        </View>
        <View style={[textViewStyle, resolvedSelectedStyle()] }>
          <Text style={textStyle}>{name}</Text>
        </View>
        {templateInfo && templateInfo.isMaster ? (
          <SlaveColumn
            slaveActivePortsLocal={slaveActivePorts}
            slaveColorsLocal={slaveColors}
          />
        ) : null}
      </Pressable>
    )
  }

  // compute index of this item in the provided list (real index among actual N items)
  const index = (() => {
    if (!Array.isArray(inputInfoList) || inputInfoList.length === 0) return 0
    const idx = inputInfoList.findIndex(it => it.port === port)
    return idx >= 0 ? idx : 0
  })()

  // cols is chosen based on effectiveN but we use it for actual layout too
  const cols = Math.max(1, bestCols)
  const rowsCount = Math.ceil(N / cols) // rows for actual N
  const rowIndex = Math.floor(index / cols)
  const positionInRow = index % cols
  const itemsInThisRow = (rowIndex === rowsCount - 1) ? (N - (rowsCount - 1) * cols) : cols

  // grid widths (we center using the width the grid *would* take with `cols` columns)
  const usedFullWidth = cols * bestW + Math.max(0, (cols - 1) * horizontalGutter)
  const usedThisRowWidth = itemsInThisRow * bestW + Math.max(0, (itemsInThisRow - 1) * horizontalGutter)

  const paddingSide = Math.max(0, Math.floor((CW - usedFullWidth) / 2))
  const halfGutter = horizontalGutter / 2

  const marginLeft = (positionInRow === 0) ? paddingSide + halfGutter : halfGutter
  const marginRight = halfGutter

  const tileStyle: ViewStyle = {
    width: bestW,
    height: bestH,
    marginLeft,
    marginRight,
    marginBottom: horizontalGutter,
    // ensure the tile is a row so we can put the slave column to the right
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start'
  }

  return (
    <Pressable
      style={[outerViewStyle, tileStyle]}
      onPress={() => onToggle(port)}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      {templateInfo && templateInfo.isMaster ? (
        <SlaveColumn
          slaveActivePortsLocal={slaveActivePorts}
          slaveColorsLocal={slaveColors}
        />
      ) : null}


      <View style={{ flex: 1, flexDirection: 'column' }}>
        <View style={[imageViewStyle, resolvedSelectedStyle()] }>
          <Image source={imageSource} style={imageStyle} />
        </View>

        <View style={[textViewStyle, resolvedSelectedStyle()] }>
          <Text style={textStyle} numberOfLines={1}>{name}</Text>
        </View>
      </View>
    </Pressable>
  )
})

export default InfoInputView

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '40%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 20,
  },

  // slave column styles
  slaveColumn: {
    width: 15,
    // keep circles vertically stacked and centered in tile
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 4,
  },
  slaveCircle: {
    width: 10,
    height: 10,
    borderRadius: 12,
    marginVertical: 4,
    // default faded look — backgroundColor provided inline
    opacity: 1,
  }
});
