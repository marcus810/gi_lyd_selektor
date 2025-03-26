import { View, Text, Image, Pressable } from 'react-native'
import { StyleSheet } from "react-native";
import React, { forwardRef, useRef, useState, useImperativeHandle, } from 'react'
import * as types from '../types'
import * as misc from '../misc'
import { TouchableOpacity } from 'react-native';

/* all components needs to be capitalised because they are custom react-native components 
(not just for cleancode reasons, if it is uncapitalised it will throw an error)*/ 

  /* Components */
  const TemplateView = (({
    name, 
    outerViewStyle,
    textViewStyle,
    textStyle,
    templateInfo,
    onPress
  }: types.TemplateViewProps) =>{
      // Extract maxWidth from outerViewStyle
      const template = templateInfo

      

      return(

        <TouchableOpacity style={[outerViewStyle]} onPress={() => {onPress(template)}}>
            <View style={[textViewStyle]}>
            <Text style={textStyle}>{name}</Text>
            </View>
        </TouchableOpacity>

      )
    })

export default TemplateView

  