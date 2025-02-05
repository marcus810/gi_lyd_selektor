

/* libraries */
import { View, SafeAreaView } from 'react-native'
import React, { useState } from 'react'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
/* our files */
import * as styles from '../styles/selektor_styles'
import * as customComponent from '../scripts/selector_scripts/custom_components'
import * as handler from '../scripts/selector_scripts/handler'
import { useRouter } from 'expo-router'


const selektor = () => {
  /* Everything below here is selector functionality (js) */

  /*routing*/
  const router = useRouter()
  
  const goToIndexScreen = () => {
    router.push('/')
  };
  /*routing*/
  


  const [inputInfoArr, inputIsOnArr] = customComponent.getSelektorInfoViews({
    outerViewStyle: styles.inputStyles.infoContainer, 
    imageViewStyle: styles.inputStyles.imageContainer, 
    textViewStyle: styles.inputStyles.textContainer, 
    imageStyle: styles.generalStyles.image,
    textStyle: styles.inputStyles.text, 
    selectedStyle: styles.getInfoViewPressableStyle,
    dataType: "input"
    })

  const [outputInfoArr, outputIsOnArr] = customComponent.getSelektorInfoViews({
    outerViewStyle: styles.outputStyles.infoContainer, 
    imageViewStyle: styles.outputStyles.imageContainer, 
    textViewStyle: styles.outputStyles.textContainer,
    imageStyle: styles.generalStyles.image,
    textStyle: styles.outputStyles.text,
    selectedStyle: styles.getInfoViewPressableStyle,
    dataType: "output"})

  return (
    <GestureHandlerRootView>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        <View style={styles.generalStyles.container}>

          <View style={styles.outputStyles.container}>
            <ScrollView 
              horizontal={true}
              bounces={false}
            >
              <View style={styles.generalStyles.scrollObjectContainer}>

                {outputInfoArr}

              </View>
            </ScrollView>
          </View>
          
          {customComponent.getSelectorLineBreak()}

          <View style={styles.inputStyles.container}>
            <ScrollView 
              horizontal={true}
              bounces={false}
              >
              <View style={styles.generalStyles.scrollObjectContainer}>

                {inputInfoArr}

              </View>
            </ScrollView>
          </View>

          {customComponent.getSelectorLineBreak()}
          
          <View style={styles.generalStyles.buttonContainer}>

            {customComponent.getSelectorButton({
              title: "Exit",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.buttonText,
              onPress: () => goToIndexScreen()
            })}

            {customComponent.getSelectorButton({
              title: "Clear All",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.buttonText,
              onPress: () => handler.clearAllInfoViews(outputIsOnArr,inputIsOnArr,)
            })}

            {customComponent.getSelectorButton({
              title: "Listen",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.buttonText
              
            })}

          </View>

        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default selektor