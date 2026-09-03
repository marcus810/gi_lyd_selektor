import { View, Text, Pressable } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
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
    isDisabled = false,
    iconName,
    iconColor,
    iconSize = 18
    }: 
    types.ButtonProps){
      const defaultButtonBgColor = pDefaultButtonBgColor || palette.control
      const pressedButtonBgColor = pPressedButtonBgColor || palette.controlPressed

      return(
        <Pressable 
        accessibilityRole="button"
        style={({ pressed }) => [
          buttonStyle,
          {
            backgroundColor: isDisabled
              ? palette.controlDisabled
              : pressed
                ? pressedButtonBgColor
                : defaultButtonBgColor,
            opacity: isDisabled ? 0.55 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
          },
        ]}
        onPress={onPress}
        disabled={isDisabled}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: iconName ? 7 : 0,
              maxWidth: '100%',
            }}
          >
            {iconName ? (
              <Ionicons
                name={iconName}
                size={iconSize}
                color={iconColor ?? palette.text}
              />
            ) : null}
            <Text
              style={textStyle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {title}
            </Text>
          </View>
        </Pressable>
      )
  }
  /* */
  const LineBreak = () => {
    return(
      <View style={{ height: 1, backgroundColor: palette.separator, marginHorizontal: 8, opacity: 0.72 }}/>
    )
  }
  
  const VerticalLineBreak = () => {
    return (
      <View style={{ width: 1 , height: '100%', backgroundColor: palette.separator, marginHorizontal: 10, opacity: 0.72 }} />
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
    isDisabled,
    iconName,
    iconColor,
    iconSize
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
        isDisabled={isDisabled}
        iconName={iconName}
        iconColor={iconColor}
        iconSize={iconSize}>
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
