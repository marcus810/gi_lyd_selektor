

import { View, Text, StyleSheet, Image, StatusBar, SafeAreaView, Platform, Dimensions, Pressable, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import React, {useState, useEffect} from 'react'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';




const selektor = () => {
  /* everything below here are custom react-native props */

  /*Needs to be capitalised because it is a custom react-native prop (not just for cleancode reasons, if it is uncapitalised it will throw an error)*/ 
  const SelectorLineBreak = () =>{
    return(
      <View style={{ height: 3, backgroundColor: 'black', marginHorizontal: 5 }} />
    )
  }

  type FlashButtonProps = {
    title: string;
    onPress?: () => void;
  }
  const SelectorButton = ({title, onPress }: FlashButtonProps) =>{
    const defaultButtonBgColor = 'rgba(0,0,0,0.5)'
    const [buttonBgColor, setButtonBgColor] = useState(defaultButtonBgColor);
    return(
      <Pressable style={[styles.button, {backgroundColor: buttonBgColor}]} onPressIn={() => setButtonBgColor('rgba(0,0,0,0.2)')} onPressOut={() => setButtonBgColor(defaultButtonBgColor)} onPress={onPress}>
        <Text style={styles.buttonText}>{title}</Text>
      </Pressable>
    )
  }

  /* Everything below here is selector functionality (js) */
  const router = useRouter()
  const goToIndexScreen = () => {
    router.push('/')
  };


  const testCount = 50
  const test = [];

  for (let i = 1; i <= testCount; i++) {

    test.push(
      <View key={`item-${i}`} style={styles.outputInfoContainer}>
        <View style={styles.outputImageContainer}>
          <Image source={require('@/assets/images/selfportrait.jpg')} style={styles.outputImage}>
          </Image>
        </View>

        <View style={styles.outputTextContainer}>
          <Text style={styles.outputText}>{i.toString()}</Text>
          <Text style={styles.outputText}>{"jørgen"}</Text>
        </View>
      </View>
    )
  }

  const inputCount = 15
  const input = [];
  for (let i = 1; i <= inputCount; i++) {
    input.push(
      <View key={`item-${i}`} style={styles.inputInfoContainer}>
        <View style={styles.inputMicImageContainer}>
          <Image source={require('@/assets/images/inputmic.png')} style={styles.outputImage}>
          </Image>
        </View>
        <View style={styles.inputTextContainer}>
          <Text style={styles.inputText} >{i.toString()}</Text>
          <Text style={styles.inputText} >stuen</Text>
        </View>
      </View>
    )
  }
  return (
    <GestureHandlerRootView>
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>


          <View style={styles.outputContainer}>
            <ScrollView 
              horizontal={true}
              bounces={false}
            >
              <View style={styles.scrollObjectContainer}>
                {test}
              </View>
            </ScrollView>
          </View>
          
          <SelectorLineBreak/>

          <View style={styles.inputContainer}>
            <ScrollView 
              horizontal={true}
              bounces={false}
            >
              <View style={styles.scrollObjectContainer}>
                {input}
              </View>
            </ScrollView>
          </View>

          <SelectorLineBreak/>
          
          <View style={styles.buttonContainer}>
    

            <SelectorButton title="Exit" onPress={goToIndexScreen}>
            </SelectorButton>

            <SelectorButton title="Clear All">
            </SelectorButton>

            <SelectorButton title="Listen">
            </SelectorButton>

          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default selektor

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');


const styles = StyleSheet.create({

  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0
  },
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: 'rgb(128,128,128)'
  },  
  scrollObjectContainer: {
    flexDirection: "column",
    justifyContent: 'space-evenly',
    flexWrap: "wrap",
  },

  inputContainer: {
    flex: 1,
  },
  inputInfoContainer: {
    /* we time the screen width with 0.2 to make sure inputinfocontainer fits at the minimum 20% of the screen*/
    minWidth: screenWidth * 0.2,
    /* here we write 50% to make the minimum height 50% of the parent object*/
    minHeight: 50,
    maxWidth: screenWidth * 0.2,
    flexDirection: "row",
    flex: 1,
    padding:5,
  },
  inputMicImageContainer:{
    justifyContent: "center",
    flexGrow: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: "black",
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10
  },
  inputTextContainer:{
    justifyContent: "center",
    flexGrow: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: "black",
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10
  },
  inputText: {
    color: "white",
    flexShrink: 1,
    textAlign: "center"
  },
  inputImage:{
    resizeMode: "cover"
  },

  outputContainer:{
    flex: 5,
  },
  outputInfoContainer:{
    maxWidth: screenWidth/2,
    minWidth: screenWidth/8,
    flexDirection: "column",
    padding: 5,
    marginBottom: 5,
    flexBasis: 160
  },
  outputTextContainer:{
    /*  'hsla(133, 70.60%, 50.60%, 0.5)' for activation*/
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: "black",
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10
  },
  outputImageContainer:{
    height: "80%",
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: "black",
    borderWidth: 2,

  },
  outputImage:{
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  outputText:{
    fontWeight: "bold",
    color: "white",
    flexWrap: "wrap",
    textAlign: "center",
  },

  buttonContainer: {
    flex: 0.40,
    flexDirection: 'row',
    justifyContent: "space-evenly",
    alignItems: "center",
    borderColor: "black",
    margin: 10
  },
  button:{
    flex: 1,
    maxWidth: "25%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderColor: "black",
    borderWidth: 2,
    borderRadius: 10,
  },
  buttonText:{
    color: "white",
  }



})