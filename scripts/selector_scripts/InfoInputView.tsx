import { View, Text, Image, Pressable } from 'react-native'
import { StyleSheet, useWindowDimensions } from "react-native";
import React, { forwardRef, useRef, useState, useImperativeHandle, useMemo } from 'react'
import * as types from '../types'
import * as misc from '../misc'



/* all components needs to be capitalised because they are custom react-native components 
(not just for cleancode reasons, if it is uncapitalised it will throw an error)*/ 

  /* Components */
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
    templateInfo,
    isToggled,
    onToggle,
    width,
    inputAmount,
    parentWidth,
    parentHeight
  }: types.InfoInputViewProps & { isToggled: boolean, onToggle: (port: number) => void }) =>{
      const [minWidth, setMinWidth] = useState(8)
      // Extract maxWidth from outerViewStyle
      const resolvedStyle = StyleSheet.flatten(outerViewStyle)
      const maxWidth = typeof resolvedStyle?.maxWidth === "number" ? resolvedStyle.maxWidth : 0;
          
      const imageSource = { uri: imagePath}

      const CW = parentWidth;
      const CH = 320


      const ASPECT_RATIO = 2
      // 1) clamp to MAX_ITEMS  

      const N = inputAmount;

      // 2) find best (r, c)
      const { bestW, bestH } = useMemo(() => {
        let maxArea = 0;
        let bestW = 0;
        let bestH = 0;

        // Start from 2 columns and increment by 2 to ensure even number of columns
        for (let c = 1; c <= N; c += 1) {
          const r = Math.ceil(N / c);

          // Max width by columns; max width by rows + aspect ratio
          const wByCols = CW / c;
          const wByRows = ASPECT_RATIO * (CH / r);
          const w = Math.min(wByCols, wByRows);
          const h = w / ASPECT_RATIO;

          const area = w * h;
          if (area > maxArea) {
            maxArea = area;
            bestW = w;
            bestH = h;
          }
        }

        return { bestW, bestH };
      }, [N, CW, CH]);
      return(
      <Pressable style={[outerViewStyle, {width: bestW, height: bestH, aspectRatio: 1.1}]} onPress={() => onToggle(port)}>
        <View style={[imageViewStyle, selectedStyle(isToggled)]}>
          <Image source={imageSource} style={imageStyle}>
          </Image>
        </View>

        <View style={[textViewStyle, selectedStyle(isToggled)]}>
          <Text style={textStyle}>{name}</Text>
        </View>
      </Pressable>
      )
    })

export default InfoInputView

  