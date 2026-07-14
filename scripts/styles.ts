import {StyleSheet, StatusBar, Platform, Dimensions} from 'react-native'
import * as misc from './misc'

export const templateSelectorStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgb(36, 34, 34)'
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
        backgroundColor: 'rgba(66, 63, 63, 0.75)',
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
        flex: 2,
        flexDirection: "column",
        justifyContent: 'flex-start',
        display: "flex",
    },
    infoContainer: {
        flexDirection: "row",
        padding: 5,
        minHeight: 90,
    },
    textContainer:{
        justifyContent: "center",
        flexGrow: 1,
        flexDirection: "row",
        alignItems:"center",
    }
})

export const getInfoViewPressableStyleInput = (isOn: boolean) => ({
    backgroundColor: isOn ? 'hsla(133, 70.60%, 50.60%, 0.5)' : 'rgba(66, 63, 63, 0.75)'
  });

export const getInfoViewPressableStyleOutput = (isOn: boolean, omniOrGroupState: boolean, colour: string) => ({
    backgroundColor: isOn
    ? 'hsla(133, 70.60%, 50.60%, 0.5)'
    : omniOrGroupState
    ? colour
    : 'rgba(66, 63, 63, 0.75)'
});

export const getInfoViewPressableStyleIntercomInput = (
  isOn: boolean,
  type: string
) => ({
  backgroundColor: isOn
    ? 'hsla(133, 70.60%, 50.60%, 0.5)'
    : 'rgba(66, 63, 63, 0.75)'
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
        justifyContent: 'flex-start',
        alignContent: 'flex-start',
        flexWrap: "wrap",
        overflow: "hidden"
    },
    infoContainer:{
        flexDirection: "column",
        padding: 5,
        marginBottom: 0,
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
        height: "100%",
        flexDirection: "column",
        backgroundColor: 'rgb(36, 34, 34)'
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
        flex: 0.5,
        flexDirection: 'row',
        justifyContent: "space-evenly",
        alignItems: "center",
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
        backgroundColor: 'rgba(66, 63, 63, 0.75)'
    },
    tabButtonPressed:{
        flex: 1,
        maxWidth: "15%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        borderColor: "black",
        borderWidth: 2,
        borderRadius: 10,
        backgroundColor: 'hsla(133, 70.60%, 50.60%, 0.5)'
    },
    buttonPressed:{
        flex: 1,
        maxWidth: "15%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        borderColor: "black",
        borderWidth: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(97, 93, 93, 0.75)'
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
        backgroundColor: 'rgba(66, 63, 63, 0.75)'
    },
    text:{
        fontWeight: "bold",
        color: "white",
        textAlign: "center",
        fontVariant: ["tabular-nums"],
    },
})