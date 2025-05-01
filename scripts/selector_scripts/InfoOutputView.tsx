import { View, Text, Image, Pressable } from 'react-native'
import { StyleSheet } from "react-native";
import React, { forwardRef, useRef, useState, useImperativeHandle, } from 'react'
import * as types from '../types'
import * as misc from '../misc'


/* all components needs to be capitalised because they are custom react-native components 
(not just for cleancode reasons, if it is uncapitalised it will throw an error)*/ 

  /* Components */
  const InfoOutputView = (({
    port, 
    name, 
    intercomInfo,
    outerViewStyle,
    textViewStyle,
    textStyle,
    selectedStyle,
    isToggled,
    onToggleLatch,
    onToggleUnlatchPress,
    onToggleUnlatchRelease,
    templateInfo
  }: types.InfoOutputViewProps & { isToggled: boolean}) =>{
      const [minWidth, setMinWidth] = useState(8)
    
      // Extract maxWidth from outerViewStyle
      const resolvedStyle = StyleSheet.flatten(outerViewStyle)
      const maxWidth = typeof resolvedStyle?.maxWidth === "number" ? resolvedStyle.maxWidth : 0;

      if(!intercomInfo.omniState && intercomInfo.groupState){

      }

          
      return(
      <Pressable style={[outerViewStyle, {minWidth: misc.getLandscapeWidth() / minWidth}]} 
      onPress={() => {
        if (intercomInfo.omniState) return;
    
        if (intercomInfo.latchState || intercomInfo.groupState) {
          onToggleLatch(port, intercomInfo.groupState);
        } 
      }}
      onPressIn={() => {
        if (intercomInfo.omniState || intercomInfo.groupState) return;
        if(!intercomInfo.latchState){
          onToggleUnlatchPress(port);
        }
      }}
      onPressOut={() => {
        if (intercomInfo.omniState || intercomInfo.groupState) return;
        if (!intercomInfo.latchState ) {
          onToggleUnlatchRelease(port)
        }
      }}>

        <View style={[textViewStyle, selectedStyle(isToggled, !intercomInfo.omniState && intercomInfo.groupState
        ? intercomInfo.groupState
        : intercomInfo.omniState)]}>
          <Text style={textStyle}>{port.toString()}</Text>
          <Text style={textStyle}>{name}</Text>
        </View>
      </Pressable>
      )
    })

export default InfoOutputView

  