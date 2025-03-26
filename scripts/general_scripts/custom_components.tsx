import { View, Text, Pressable } from 'react-native'
import React, { useState } from 'react'
import * as types from './types'
/* all components needs to be capitalised because they are custom react-native components 
(not just for cleancode reasons, if it is uncapitalised it will throw an error)*/ 

  /*  */
  const Button =({ 
    title, 
    buttonStyle, 
    textStyle, 
    pDefaultButtonBgColor, 
    pPressedButtonBgColor,
    onPress
    }: 
    types.ButtonProps) =>{
      const defaultButtonBgColor = pDefaultButtonBgColor || 'rgba(0,0,0,0.5)'
      const pressedButtonBgColor = pPressedButtonBgColor || 'rgba(0,0,0,0.2)'
      const [buttonBgColor, setButtonBgColor] = useState(defaultButtonBgColor);
      return(
        <Pressable 
        style={[buttonStyle, {backgroundColor: buttonBgColor}]} 
        onPressIn={() => setButtonBgColor(pressedButtonBgColor)} 
        onPressOut={() => setButtonBgColor(defaultButtonBgColor)} 
        onPress={onPress}>
          <Text style={textStyle}>{title}</Text>
        </Pressable>
      )
  }
  /* */
  const LineBreak = () => {
    return(
      <View style={{ height: 3, backgroundColor: 'black', marginHorizontal: 5 }}/>
    )
  }
  
  const VerticalLineBreak = () => {
    return (
      <View style={{ width: 3 , height: '100%', backgroundColor: 'black', marginHorizontal: 10 }} />
    )
  }


// getters

  export const getButton =({
    title, 
    buttonStyle, 
    textStyle, 
    pDefaultButtonBgColor, 
    pPressedButtonBgColor, 
    onPress
    }: 
    types.ButtonProps) => {
      return(
        <Button
        title={title} 
        buttonStyle={buttonStyle} 
        textStyle={textStyle} 
        pDefaultButtonBgColor={pDefaultButtonBgColor} 
        pPressedButtonBgColor={pPressedButtonBgColor} 
        onPress={onPress}>
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