import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import * as types from '../types'
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
        <TouchableOpacity
          activeOpacity={0.78}
          style={styles.templateSelectorStyles.infoContainer}
          onPress={() => {onPress(template)}}
        >
            <View style={[styles.templateSelectorStyles.textContainer]}>
            <Text style={styles.templateSelectorStyles.text} numberOfLines={2}>{name}</Text>
            </View>
        </TouchableOpacity>

      )
  
    else return(
        <TouchableOpacity
          activeOpacity={0.78}
          style={{...styles.templateSelectorStyles.infoContainer, justifyContent:"center", alignContent:"center", alignItems:"center"}}
          onPress={() => {onPress(template)}}
        >
            <View style={{...styles.templateSelectorStyles.textContainer, width:"70%"}}>
            <Text style={{...styles.templateSelectorStyles.text, fontSize: 28}} numberOfLines={2}>{name}</Text>
            </View>
        </TouchableOpacity>

      )
    })
export default TemplateView
