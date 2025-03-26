

/* libraries */
import { View, Text, SafeAreaView, AppState, AppStateStatus } from 'react-native'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
/* our files */
import * as styles from '../scripts/styles'
import { TemplateContainer } from '@/scripts/template_selector_scripts/TemplateContainer';
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';

const template_selektor = () => {
  /*routing*/
  const router = useRouter()
  const db = DatabaseHandler.getInstance()
  
  const [templateInfoList, setTemplateInfoList] = useState<types.TemplateInfo[]>([]);


  useEffect(() => {

    const fetchData = async () => {
        try {
            const templates = await db.fetchTemplates();  // Await the promise to get the actual data
            setTemplateInfoList(templates)  // Set the state with the resolved data
        } catch (error) {
            console.error('Error fetching templates:', error);
            console.log('Full error details in fetchData:', JSON.stringify(error, null, 2));
        }
    };

    fetchData();  // Call the async function to fetch the data
  }, []);  // Empty dependency array to run only once when the component mounts

  const TemplateInfoArr = TemplateContainer(templateInfoList)

  return (
    <GestureHandlerRootView>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        
        
            
          <View style={styles.templateSelectorStyles.container}>
 
            <Text style={styles.templateSelectorStyles.title}>Choose template</Text>
            
            <ScrollView 
              horizontal={false}
              bounces={false}
            >
              <View style={styles.templateSelectorStyles.scrollObjectContainer}>

                {TemplateInfoArr}

              </View>
            </ScrollView>

          </View>

      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default template_selektor