

/* libraries */
import { View, SafeAreaView } from 'react-native'
import React from 'react'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
/* our files */
import * as styles from '../styles/selektor_styles'
import * as customComponent from '../scripts/selector_scripts/custom_components'
import * as handler from '../scripts/selector_scripts/handler'

const selektor = () => {
  /* Everything below here is selector functionality (js) */


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

              {customComponent.getSelektorInfoViews({
                outerViewStyle: styles.outputStyles.infoContainer, 
                imageViewStyle: styles.outputStyles.imageContainer, 
                textViewStyle: styles.outputStyles.textContainer, 
                imageStyle: styles.generalStyles.image,
                textStyle: styles.outputStyles.text, 
                dataType: "output"})}

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

                {customComponent.getSelektorInfoViews({
                outerViewStyle: styles.inputStyles.infoContainer, 
                imageViewStyle: styles.inputStyles.imageContainer, 
                textViewStyle: styles.inputStyles.textContainer, 
                imageStyle: styles.generalStyles.image,
                textStyle: styles.inputStyles.text, 
                dataType: "input"})}

              </View>
            </ScrollView>
          </View>

          {customComponent.getSelectorLineBreak()}
          
          <View style={styles.generalStyles.buttonContainer}>

            {customComponent.getSelectorButton({
              title: "Exit",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.buttonText,
              onPress: () => handler.goToIndexScreen()
            })}

            {customComponent.getSelectorButton({
              title: "Clear All",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.buttonText
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