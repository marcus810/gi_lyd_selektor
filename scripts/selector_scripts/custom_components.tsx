import { View, Text, Image, Pressable } from 'react-native'
import { StyleSheet } from "react-native";
import React, { forwardRef, useRef, useState, useImperativeHandle, } from 'react'
import * as types from './types'
import * as misc from '../misc'


/* all components needs to be capitalised because they are custom react-native components 
(not just for cleancode reasons, if it is uncapitalised it will throw an error)*/ 

  /* Components */
  const InfoView = forwardRef<types.InfoViewRef, types.InfoViewProps>(({
    index, 
    imageProp, 
    name, 
    outerViewStyle,
    imageViewStyle,
    textViewStyle,
    imageStyle,
    textStyle,
    selectedStyle,
    onToggle}, ref) =>{

      const [toggleState, setToggleState] = useState(false)
      const [minWidth, setMinWidth] = useState(8)
      // Extract maxWidth from outerViewStyle
      const resolvedStyle = StyleSheet.flatten(outerViewStyle)
      const maxWidth = typeof resolvedStyle?.maxWidth === "number" ? resolvedStyle.maxWidth : 0;

      useImperativeHandle(ref, () => ({
            setToggle: setToggleState,
            setMinWidth: setMinWidth,
            minWidth: minWidth,
            maxWidth: maxWidth
          }))
          
      return(
      <Pressable style={[outerViewStyle, {minWidth: misc.getLandscapeWidth() / minWidth}]} onPress={() => onToggle(setToggleState)}>
        <View style={[imageViewStyle, selectedStyle(toggleState)]}>
          <Image source={imageProp} style={imageStyle}>
          </Image>
        </View>

        <View style={[textViewStyle, selectedStyle(toggleState)]}>
          <Text style={textStyle}>{index.toString()}</Text>
          <Text style={textStyle}>{name}</Text>
        </View>
      </Pressable>
      )
    })

  /* Getters */
  export const getInfoViews = ({
    outerViewStyle,
    imageViewStyle,
    textViewStyle,
    imageStyle,
    textStyle,
    selectedStyle,
    dataType,
    onToggle
    }: 
    types.GetInfoViews) => {
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

      const infoViewRefArr = useRef<(types.InfoViewRef | null)[]>([])
      const infoViewArr = []



      for (let i = 1; i <= placeholderCount; i++) {

        infoViewArr.push(
          <InfoView
            key={i}
            index={i}
            imageProp={placeholderImage}
            name={placeholderName}
            outerViewStyle={outerViewStyle}
            imageViewStyle={imageViewStyle}
            textViewStyle={textViewStyle}
            imageStyle={imageStyle}
            textStyle={textStyle}
            selectedStyle={selectedStyle}
            onToggle={onToggle}
            ref={el => infoViewRefArr.current[i] = el}>
          </InfoView>,
        )
      }
      return [infoViewArr, infoViewRefArr] as const
    }

  