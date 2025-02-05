import {StyleSheet, StatusBar, Platform, Dimensions} from 'react-native'


/*get screen height and width*/
const { width: screenWidth, height: screenHeight } = Dimensions.get('screen')
/*get landscape height and width*/
const landscapeWidth = Math.max(screenWidth, screenHeight);
const landscapeHeight = Math.min(screenWidth, screenHeight);

export const inputStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    infoContainer: {
        /* we time the screen width with 0.2 to make sure inputinfocontainer fits at the minimum 20% of the screen*/
        minWidth: landscapeWidth / 8,
        /* here we write 50% to make the minimum height 50% of the parent object*/
        minHeight: 50,
        maxWidth: landscapeWidth / 5,
        flexDirection: "row",
        flex: 1,
        padding:5,
    },
    imageContainer:{
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
    textContainer:{
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
    text: {
        color: "white",
        flexShrink: 1,
        textAlign: "center"
    },
})

export const outputStyles = StyleSheet.create({
    container:{
        flex: 5,
    },
    infoContainer:{
        maxWidth: landscapeWidth/3,
        minWidth: landscapeWidth/8,
        flexDirection: "column",
        padding: 5,
        marginBottom: 5,

        flexBasis: 190
    },
    textContainer:{
        /*  'hsla(133, 70.60%, 50.60%, 0.5)' for activation*/
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderColor: "black",
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10
    },
    imageContainer:{
        height: "80%",
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderColor: "black",
        borderWidth: 2,
    },
    text:{
        fontWeight: "bold",
        color: "white",
        flexWrap: "wrap",
        textAlign: "center",
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
        justifyContent: 'space-evenly',
        flexWrap: "wrap",
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