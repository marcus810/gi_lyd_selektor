import {StyleSheet, StatusBar, Platform, Dimensions} from 'react-native'
import * as misc from './misc'

export const templateSelectorStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgb(128,128,128)'
    },
    linkContainer: {
    flex: 1,
    alignSelf: 'center',
    alignContent: 'space-evenly',
    justifyContent: 'space-evenly'

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
    button:{
        marginLeft: 5,
        width: 70,
        height: 70,
        justifyContent: "center",
        alignItems: "center",
        borderColor: "black",
        borderWidth: 2,
        borderRadius: 10,
    },
    title: {
        paddingRight: 50,
        color: "white",
        fontSize: 50,
        fontWeight: "bold",
        textAlign: "center",
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
        flex: 0.9,
        flexDirection: "row",
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        overflow: "hidden"
    },
    infoContainer: {
        height: "50%",
        flexDirection: "row",
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

export const getInfoViewPressableStyleOutput = (isOn: boolean, omniOrGroupState: boolean, colour: string) => ({
    backgroundColor: isOn
    ? 'hsla(133, 70.60%, 50.60%, 0.5)'
    : omniOrGroupState
    ? colour
    : 'rgba(0,0,0,0.5)'
});

export const getInfoViewPressableStyleOutputOmni = (isOn: boolean, omniState: boolean) => ({
    backgroundColor: isOn
    ? 'rgba(22, 190, 216, 0.54)'
    : omniState
    ? 'rgba(22, 22, 168, 0.54)'
    : 'rgba(0,0,0,0.5)'
});

export const getInfoViewPressableStyleOutputGroup = (isOn: boolean, groupState: boolean) => ({
    backgroundColor: isOn
    ? 'rgba(172, 38, 98, 0.5)'
    : groupState
    ? 'rgba(77, 36, 36, 0.54)'
    : 'rgba(0,0,0,0.5)'
});

export const getInfoViewPressableStyleGroup = (isOn: boolean) => ({
    backgroundColor: isOn ? 'rgba(172, 38, 98, 0.5)' : 'rgba(77, 36, 36, 0.54)'
  });


export const getInfoViewPressableStyleOmni = (isOn: boolean) => ({
    backgroundColor: isOn ? 'rgba(22, 190, 216, 0.54)' : 'rgba(22, 22, 168, 0.54)'
  });

export const inputStyles = StyleSheet.create({
    container:{
        flex: 5,
        flexDirection: "row",
        justifyContent: 'space-evenly',
        flexWrap: "wrap",
        overflow: "hidden"
    },
    infoContainer:{
        flexDirection: "column",
        padding: 5,
        marginBottom: 5,
       
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
    indexButton: {
        height: 60,
        borderRadius: 20,
        justifyContent: "center",
        backgroundColor: "rgba(255,250,250,0.25)",
        padding: 6,
    },
    indexButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },
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
        resizeMode: "contain"
    },
    scrollObjectContainer: {
        flexDirection: "row",
        justifyContent: 'space-evenly',
        flexWrap: "wrap",

    },
    scrollOutputContainer: {
        flexDirection: "row",
        justifyContent: 'flex-start',
        flexWrap: "wrap",
    },
    buttonContainer: {
        flex: 0.4,
        flexDirection: 'row',
        justifyContent: "space-evenly",
        alignItems: "center",
        margin: 10
    },
    button:{
        flex: 1,
        maxWidth: "15%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        borderColor: "black",
        borderWidth: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.50)'
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