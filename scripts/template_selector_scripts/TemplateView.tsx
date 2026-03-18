import { View, Text, Image, Pressable } from 'react-native'
import { StyleSheet } from "react-native";
import React, { forwardRef, useRef, useState, useImperativeHandle, } from 'react'
import * as types from '../types'
import * as misc from '../misc'
import { TouchableOpacity } from 'react-native';
import * as styles from '../styles'
/* all components needs to be capitalised because they are custom react-native components 
(not just for cleancode reasons, if it is uncapitalised it will throw an error)*/ 

  /* Components */
  const TemplateView = (({
    name, 
    templateInfo,
    onPress,
    isTablet
  }: types.TemplateViewProps) =>{
      // Extract maxWidth from outerViewStyle
      const template = templateInfo

      if (isTablet)return(
        <TouchableOpacity style={[styles.templateSelectorStyles.infoContainer]} onPress={() => {onPress(template)}}>
            <View style={[styles.templateSelectorStyles.textContainer]}>
            <Text style={styles.templateSelectorStyles.text}>{name}</Text>
            </View>
        </TouchableOpacity>

      )
  
    else return(
        <TouchableOpacity style={{...styles.templateSelectorStyles.infoContainer, height: misc.getLandscapeHeight()/4, justifyContent:"center", alignContent:"center", alignItems:"center"}} onPress={() => {onPress(template)}}>
            <View style={{...styles.templateSelectorStyles.textContainer, width:"50%"}}>
            <Text style={{...styles.templateSelectorStyles.text, fontSize: 30}}>{name}</Text>
            </View>
        </TouchableOpacity>

      )
    })
export default TemplateView

  