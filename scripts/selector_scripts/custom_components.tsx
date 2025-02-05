import { View, Text, Image, Pressable, ImageSourcePropType, ViewStyle, TextStyle, ImageStyle, StyleProp, Dimensions} from 'react-native'
import React, { useState } from 'react'


/* all components needs to be capitalised because they are custom react-native components 
(not just for cleancode reasons, if it is uncapitalised it will throw an error)*/ 
  /* */
  const SelectorLineBreak = () =>{
    return(
      <View style={{ height: 3, backgroundColor: 'black', marginHorizontal: 5 }} />
    )
  }

  /*  */
  type SelectorButtonProps = {
    title: string
    /* the pressable component shares viewstyle with the view component*/
    buttonStyle: StyleProp<ViewStyle>
    textStyle: StyleProp<TextStyle>
    pDefaultButtonBgColor?: string
    pPressedButtonBgColor?: string
    onPress?: () => void
  }

  const SelectorButton =({ 
    title, 
    buttonStyle, 
    textStyle, 
    pDefaultButtonBgColor, 
    pPressedButtonBgColor, 
    onPress
    }: 
    SelectorButtonProps) =>{
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
  type SelektorInfoViewProps = {
    index: number
    imageProp: ImageSourcePropType
    name: string
    outerViewStyle: StyleProp<ViewStyle>
    imageViewStyle: StyleProp<ViewStyle>
    textViewStyle: StyleProp<ViewStyle>
    imageStyle: StyleProp<ImageStyle>
    textStyle: StyleProp<TextStyle>
  }
  const SelektorInfoView = ({
    index, 
    imageProp, 
    name, 
    outerViewStyle,
    imageViewStyle,
    textViewStyle,
    imageStyle,
    textStyle,
    }: 
    SelektorInfoViewProps) =>
    {
      return(
        <View style={outerViewStyle}>
          <View style={imageViewStyle}>
            <Image source={imageProp} style={imageStyle}>
            </Image>
          </View>

          <View style={textViewStyle}>
            <Text style={textStyle}>{index.toString()}</Text>
            <Text style={textStyle}>{name}</Text>
          </View>
        </View>
      )
    }
  
  /* Getters */
  export const getSelectorLineBreak = () => {
    return(
      <SelectorLineBreak></SelectorLineBreak>
    )
  }

  export const getSelectorButton =({
    title, 
    buttonStyle, 
    textStyle, 
    pDefaultButtonBgColor, 
    pPressedButtonBgColor, 
    onPress
    }: 
    SelectorButtonProps) => {
      return(
        <SelectorButton
        title={title} 
        buttonStyle={buttonStyle} 
        textStyle={textStyle} 
        pDefaultButtonBgColor={pDefaultButtonBgColor} 
        pPressedButtonBgColor={pPressedButtonBgColor} 
        onPress={onPress}>
        </SelectorButton>   
      )
    }

  type GetSelektorInfoViews ={
    outerViewStyle: StyleProp<ViewStyle>
    imageViewStyle: StyleProp<ViewStyle>
    textViewStyle: StyleProp<ViewStyle>
    imageStyle: StyleProp<ImageStyle>
    textStyle: StyleProp<TextStyle>
    dataType: string
  }
  export const getSelektorInfoViews = ({
    outerViewStyle,
    imageViewStyle,
    textViewStyle,
    imageStyle,
    textStyle,
    dataType
    }: 
    GetSelektorInfoViews) => {
      /*database data = {getDatabaseData()}
      /*right here run a method that gets all the input views from the database (array or similar)
      run the for loop for all inputviews and get their names*/
      /*for now we use placeholders*/
      let placeholderCount
      let placeholderName
      let placeholderImage
      if (dataType === "output"){
        placeholderCount = 40
        placeholderName = "Jørgen"
        placeholderImage = require('@/assets/images/selfportrait.jpg')
      }
      else{
        placeholderCount = 30
        placeholderName = "Stuen"
        placeholderImage = require('@/assets/images/inputmic.png')
        
      }
      const inputInfoViewArr = [];
    
      for (let i = 1; i <= placeholderCount; i++) {
        inputInfoViewArr.push(
          <SelektorInfoView
            key={i}
            index={i}
            imageProp={placeholderImage}
            name={placeholderName}
            outerViewStyle={outerViewStyle}
            imageViewStyle={imageViewStyle}
            textViewStyle={textViewStyle}
            imageStyle={imageStyle}
            textStyle={textStyle}>
          </SelektorInfoView>
        )
      }
      return inputInfoViewArr
    }

  