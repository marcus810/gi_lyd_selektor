import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
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
      const iconName: React.ComponentProps<typeof Ionicons>['name'] =
        template.isFloorPlan
          ? 'map-outline'
          : template.isTabMaster
            ? 'albums-outline'
            : 'radio-outline'
      const accentColor = template.isFloorPlan
        ? styles.palette.warning
        : template.isTabMaster
          ? styles.palette.magenta
          : styles.palette.primary

      if (isTablet)return(
        <TouchableOpacity
          activeOpacity={0.78}
          accessibilityRole="button"
          style={styles.templateSelectorStyles.infoContainer}
          onPress={() => {onPress(template)}}
        >
            <View style={[styles.templateSelectorStyles.textContainer, { flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ width: 4, height: '66%', borderRadius: 8, backgroundColor: accentColor, marginRight: 14 }} />
              <View style={{ width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: styles.palette.primarySoft, marginRight: 14 }}>
                <Ionicons name={iconName} size={24} color={styles.palette.text} />
              </View>
              <Text style={[styles.templateSelectorStyles.text, { flex: 1, textAlign: 'left' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>{name}</Text>
            </View>
        </TouchableOpacity>

      )
  
    else return(
        <TouchableOpacity
          activeOpacity={0.78}
          accessibilityRole="button"
          style={{...styles.templateSelectorStyles.infoContainer, justifyContent:"center", alignContent:"center", alignItems:"center"}}
          onPress={() => {onPress(template)}}
        >
            <View style={{...styles.templateSelectorStyles.textContainer, width:"78%", minHeight: 68, flexDirection: 'row', alignItems: 'center'}}>
              <View style={{ width: 4, height: '62%', borderRadius: 8, backgroundColor: accentColor, marginRight: 10 }} />
              <View style={{ width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: styles.palette.primarySoft, marginRight: 10 }}>
                <Ionicons name={iconName} size={20} color={styles.palette.text} />
              </View>
              <Text style={{...styles.templateSelectorStyles.text, flex: 1, textAlign: 'left', fontSize: 24}} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>{name}</Text>
            </View>
        </TouchableOpacity>

      )
    })
export default TemplateView
