import { View, Text, Pressable } from 'react-native'
import React, { useState } from 'react'
import * as types from './types'
import { palette } from '../styles'
/* all components needs to be capitalised because they are custom react-native components 
(not just for cleancode reasons, if it is uncapitalised it will throw an error)*/ 

  /*  */  
  export function Button({ 
    title, 
    buttonStyle, 
    textStyle, 
    pDefaultButtonBgColor, 
    pPressedButtonBgColor,
    onPress,
    isDisabled = false
    }: 
    types.ButtonProps){
      const defaultButtonBgColor = pDefaultButtonBgColor || palette.control
      const pressedButtonBgColor = pPressedButtonBgColor || palette.controlPressed
      
      const [buttonBgColor, setButtonBgColor] = useState(defaultButtonBgColor);
      return(
        <Pressable 
        style={[buttonStyle, {backgroundColor: buttonBgColor}]} 
        onPressIn={() => setButtonBgColor(pressedButtonBgColor)} 
        onPressOut={() => setButtonBgColor(defaultButtonBgColor)} 
        onPress={onPress} disabled={isDisabled}>
          <Text style={textStyle}>{title}</Text>
        </Pressable>
      )
  }
  /* */
  const LineBreak = () => {
    return(
      <View style={{ height: 1, backgroundColor: palette.border, marginHorizontal: 6 }}/>
    )
  }
  
  const VerticalLineBreak = () => {
    return (
      <View style={{ width: 1 , height: '100%', backgroundColor: palette.border, marginHorizontal: 10 }} />
    )
  }


// getters

  export const getButton =({
    title, 
    buttonStyle, 
    textStyle, 
    pDefaultButtonBgColor, 
    pPressedButtonBgColor, 
    onPress,
    isDisabled
    }: 
    types.ButtonProps) => {
      return(
        <Button
        title={title} 
        buttonStyle={buttonStyle} 
        textStyle={textStyle} 
        pDefaultButtonBgColor={pDefaultButtonBgColor} 
        pPressedButtonBgColor={pPressedButtonBgColor} 
        onPress={onPress}
        isDisabled={isDisabled}>
        </Button>   
      )
    }

  export const getSelectorLineBreak = () => {
    return(
      <LineBreak></LineBreak>
    )
  }

  export const getSelectorVerticalLineBreak = () => {
    return(
      <VerticalLineBreak></VerticalLineBreak>
    )
  }
