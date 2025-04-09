

/* libraries */
import { View, Text, SafeAreaView, AppState, AppStateStatus } from 'react-native'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
/* our files */
import * as styles from '../scripts/styles'
import * as containers from '../scripts/selector_scripts/InfoViewContainers'
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter, useGlobalSearchParams } from 'expo-router'
import React, { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';


const selektor = () => {
  /*routing*/
  const router = useRouter()
  const db = DatabaseHandler.getInstance()
  const { template } = useGlobalSearchParams(); // Access the 'template' query parameter

  const [inputInfoList, setInputInfoList] = useState<types.InputInfo[]>([])
  const [templateInfoList, setTemplateInfoList] = useState<types.TemplateInfo[]>([]);
  const [intercomInfoList, setIntercomInfoList] = useState<types.IntercomInfo[]>([]);
  const [chosenTemplate, setChosenTemplate] = useState<types.TemplateInfo>();



  const goToIndexScreen = (chosenTemplate: types.TemplateInfo) => {
    console.log(chosenTemplate)
    db.playerExit(chosenTemplate)
    router.push('/')
  };

  useEffect(() => {

    // Function to run when app goes to the background or is closed
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'inactive') {
        // Call your function here
        console.log('App is closed.');
        // You can perform your cleanup or save state here
        appStateListener.remove()
      }
    };

    // Add event listener to listen for changes in app state
    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    console.log("selektor loaded")
    const fetchData = async () => {
        try {
            

            let parsedTemplate = null;
            if (template) {
              try {
                // Parse the template data from the query string
                parsedTemplate = JSON.parse(decodeURIComponent(template as string));
              } catch (error) {
                console.error("Error parsing template data:", error);
              }
            }
            
            console.log(parsedTemplate)
            setChosenTemplate(parsedTemplate)
            const inputs = await db.fetchInputs();  // Await the promise to get the actual data
            db.playerJoin(parsedTemplate)
            setInputInfoList(inputs)
            setIntercomInfoList(parsedTemplate.intercomInfo)
            
            

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

  const outputInfoArr = containers.InfoViewOuputContainer(intercomInfoList, chosenTemplate as types.TemplateInfo)

  const inputInfoArr = containers.InfoViewInputContainer(inputInfoList, chosenTemplate as types.TemplateInfo)

  return (
    <GestureHandlerRootView>
      <SafeAreaView style={styles.generalStyles.safeContainer}>

        <View style={styles.generalStyles.container}>
        
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
              onPress: () => goToIndexScreen(chosenTemplate as types.TemplateInfo)
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