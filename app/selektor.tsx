

/* libraries */
import { View, Text, SafeAreaView } from 'react-native'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
/* our files */
import * as styles from '../scripts/selector_scripts/styles'
import * as containers from '../scripts/selector_scripts/InfoViewContainers'
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/selector_scripts/types'
import * as db from '../scripts/database/database'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'

const selektor = () => {
  /*routing*/
  const router = useRouter()
  
  const goToIndexScreen = () => {
    router.push('/')
  };
  const [inputInfoList, setInputInfoList] = useState<types.InputInfo[]>([])
  const [templateInfoList, setTemplateInfoList] = useState<types.TemplateInfo[]>([]);
  const [intercomInfoList, setIntercomInfoList] = useState<types.IntercomInfo[]>([]);


  useEffect(() => {
    const fetchData = async () => {
        try {
            const templates = await db.fetchTemplates();  // Await the promise to get the actual data
            const inputs = await db.fetchInputs();  // Await the promise to get the actual data

            setTemplateInfoList(templates)  // Set the state with the resolved data
            setInputInfoList(inputs)
            setIntercomInfoList(templates[0].intercomInfo)
        } catch (error) {
            console.error('Error fetching templates:', error);
            console.log('Full error details in fetchData:', JSON.stringify(error, null, 2));
        }
    };

    fetchData();  // Call the async function to fetch the data
  }, []);  // Empty dependency array to run only once when the component mounts



  /* userefs */

  // const [outputInfoArr, outputRefArr] = selektorComponent.getInfoViews({
  //   outerViewStyle: styles.outputStyles.infoContainer, 
  //   imageViewStyle: styles.outputStyles.imageContainer, 
  //   textViewStyle: styles.outputStyles.textContainer, 
  //   imageStyle: styles.generalStyles.image,
  //   textStyle: styles.generalStyles.text,
  //   selectedStyle: styles.getInfoViewPressableStyle,
  //   dataType: "input",
  //   onToggle: selektorHandler.handleInfoViewToggle
  //   })

  const outputInfoArr = containers.InfoViewOuputContainer(intercomInfoList)

  const inputInfoArr = containers.InfoViewInputContainer(inputInfoList)

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

                {inputInfoArr}

              </View>
            </ScrollView>
          </View>
          
          {generalComponent.getSelectorLineBreak()}

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
          
          <View style={styles.generalStyles.buttonContainer}>

            {generalComponent.getButton({
              title: "Exit",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.text,
              onPress: () => goToIndexScreen()
            })}

            {/* {generalComponent.getButton({
              title: "+",
              buttonStyle: styles.generalStyles.zoomBtn,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.zoomInfoViewIn(outputRefArr, inputRefArr)
            })} */}

            <View style={styles.generalStyles.timecode}>
              <Text style={styles.generalStyles.text}>11:24:05:23</Text>
            </View>
{/* 
            {generalComponent.getButton({
              title: "-",
              buttonStyle: styles.generalStyles.zoomBtn,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.zoomInfoViewOut(outputRefArr, inputRefArr)
            })} */}

            {/* {generalComponent.getButton({
              title: "Clear All",
              buttonStyle: styles.generalStyles.button,
              textStyle: styles.generalStyles.text,
              onPress: () => selektorHandler.clearAllInfoViews(outputRefArr,inputRefArr)
            })} */}

          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default selektor