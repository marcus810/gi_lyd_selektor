import { View, Text, Image, Pressable } from 'react-native'
import { StyleSheet } from "react-native";
import React, { forwardRef, useRef, useState, useImperativeHandle, } from 'react'
import * as types from './types'
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
    onToggle
  }: types.InfoInputViewProps) =>{

      const [toggleState, setToggleState] = useState(false)
      const [minWidth, setMinWidth] = useState(8)
      // Extract maxWidth from outerViewStyle
      const resolvedStyle = StyleSheet.flatten(outerViewStyle)
      const maxWidth = typeof resolvedStyle?.maxWidth === "number" ? resolvedStyle.maxWidth : 0;
          
      const imageSource = { uri: imagePath}
      return(
      <Pressable style={[outerViewStyle, {minWidth: misc.getLandscapeWidth() / minWidth}]} onPress={() => onToggle(setToggleState, toggleState, templateInfo, port)}>
        <View style={[imageViewStyle, selectedStyle(toggleState)]}>
          <Image source={imageSource} style={imageStyle}>
          </Image>
        </View>

        <View style={[textViewStyle, selectedStyle(toggleState)]}>
          <Text style={textStyle}>{port.toString()}</Text>
          <Text style={textStyle}>{name}</Text>
        </View>
      </Pressable>
      )
    })

export default InfoInputView

  