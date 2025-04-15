import {StyleSheet, StatusBar, Platform, Dimensions} from 'react-native'
import * as misc from './misc'

export const templateSelectorStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgb(128,128,128)'
    },
    infoContainer: {
        width: "100%",
        height: misc.getLandscapeHeight()/4.7,
        padding:5,
    },
    scrollObjectContainer: {
        width: misc.getLandscapeWidth(),
        flexDirection: "column",
        justifyContent: 'space-evenly',
        flexWrap: "wrap",
    },
    textContainer:{
        justifyContent: "center",
        flexGrow: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderColor: "black",
        borderWidth: 2,
        borderRadius: 10,
    },
    title: {
        alignSelf: "center",
        color: "white",
        fontSize: 50,
        fontWeight: "bold",
        textAlign: "center",
        paddingTop: 40
      },
    scrollview: {
        justifyContent: "center"
    },
    text:{
      
        color: "white",
        textAlign: "center",
        fontSize: 75
    },
    
})

export const outputStyles = StyleSheet.create({
    container: {
        flex: 1,
        
    },
    infoContainer: {
        minHeight: 50,
        maxHeight: "50%",
        maxWidth: misc.getLandscapeWidth() / 5,
        flexDirection: "row",
        flex: 1,
        padding:5,
    },
    textContainer:{
        justifyContent: "center",
        flexGrow: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderColor: "black",
        borderWidth: 2,
        borderRadius: 10,
    }
})

export const getInfoViewPressableStyleInput = (isOn: boolean) => ({
    backgroundColor: isOn ? 'hsla(133, 70.60%, 50.60%, 0.5)' : 'rgba(0,0,0,0.5)'
  });

export const getInfoViewPressableStyleOutput = (isOn: boolean, omniState: boolean) => ({
    backgroundColor: omniState
        ? 'rgba(9, 9, 99, 0.5)'
        : isOn
        ? 'hsla(133, 70.60%, 50.60%, 0.5)'
        : 'rgba(0,0,0,0.5)',
});

export const getInfoViewPressableStyleOmni = (isOn: boolean) => ({
    backgroundColor: isOn ? 'hsla(133, 70.60%, 50.60%, 0.5)' : 'rgba(9, 9, 99, 0.5)'
  });

export const inputStyles = StyleSheet.create({
    container:{
        flex: 5,
        flexShrink:1,
    },
    infoContainer:{
        maxWidth: misc.getLandscapeWidth()/3,
        flexDirection: "column",
        padding: 5,
        marginBottom: 5,
        flexBasis: 180
    },
    textContainer:{
        borderColor: "black",
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10
    },
    imageContainer:{
        height: "80%",
        borderColor: "black",
        borderWidth: 2,
    },
})

export const generalStyles = StyleSheet.create({

    safeContainer: {
        flex: 1,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0
    },
    container: {
        flex: 1,
        flexDirection: "column",
        backgroundColor: 'rgb(128,128,128)'
    },  
    image:{
        width: "100%",
        height: "100%",
        resizeMode: "cover"
    },
    scrollObjectContainer: {
        flexDirection: "column",
        justifyContent: 'flex-start',
        flexWrap: "wrap",
    },
    buttonContainer: {
        flex: 0.60,
        flexDirection: 'row',
        justifyContent: "space-evenly",
        alignItems: "center",
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
    zoomBtn:{
        flex:1,
        maxWidth: "5%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        borderColor: "black",
        borderWidth: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
    },
    timecode:{
        flex: 1,
        maxWidth: "25%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        borderColor: "black",
        borderWidth: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.25)'
    },
    text:{
        fontWeight: "bold",
        color: "white",
        textAlign: "center",
    },
})