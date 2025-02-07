

/* libraries */
import { View, Text, SafeAreaView } from 'react-native'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
/* our files */
import * as styles from '../scripts/selector_scripts/styles'
import * as selektorComponent from '../scripts/selector_scripts/custom_components'
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as selektorHandler from '../scripts/selector_scripts/handler'
import { useRouter } from 'expo-router'
import React from 'react'

const selektor = () => {
  /*routing*/
  const router = useRouter()
  
  const goToIndexScreen = () => {
    router.push('/')
  };
  /*routing*/

  /* userefs */

  const [inputInfoArr, inputRefArr] = selektorComponent.getInfoViews({
    outerViewStyle: styles.inputStyles.infoContainer, 
    imageViewStyle: styles.inputStyles.imageContainer, 
    textViewStyle: styles.inputStyles.textContainer, 
    imageStyle: styles.generalStyles.image,
    textStyle: styles.generalStyles.text,
    selectedStyle: styles.getInfoViewPressableStyle,
    dataType: "input",
    onToggle: selektorHandler.handleInfoViewToggle
    })

  const [outputInfoArr, outputRefArr] = selektorComponent.getInfoViews({
    outerViewStyle: styles.outputStyles.infoContainer, 
    imageViewStyle: styles.outputStyles.imageContainer, 
    textViewStyle: styles.outputStyles.textContainer,
    imageStyle: styles.generalStyles.image,
    textStyle: styles.generalStyles.text,
    selectedStyle: styles.getInfoViewPressableStyle,
    dataType: "output",
    onToggle: selektorHandler.handleInfoViewToggle
    })

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
          
          {generalComponent.getSelectorLineBreak()}

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

          {generalComponent.getSelectorLineBreak()}
          
          <View style={styles.generalStyles.buttonContainer}>

            {generalComponent.getButton({
              title: "Exit",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.text,
              onPress: () => goToIndexScreen()
            })}

            {generalComponent.getButton({
              title: "+",
              buttonStyle: styles.generalStyles.zoomBtn,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.zoomInfoViewIn(outputRefArr, inputRefArr)
            })}

            <View style={styles.generalStyles.timecode}>
              <Text style={styles.generalStyles.text}>11:24:05:23</Text>
            </View>

            {generalComponent.getButton({
              title: "-",
              buttonStyle: styles.generalStyles.zoomBtn,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.zoomInfoViewOut(outputRefArr, inputRefArr)
            })}

            {generalComponent.getButton({
              title: "Clear All",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.clearAllInfoViews(outputRefArr,inputRefArr)
            })}

          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default selektor