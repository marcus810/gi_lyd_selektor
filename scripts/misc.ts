import { Dimensions } from 'react-native'

const getScreenDimensions = () => {

    const { width: screenWidth, height: screenHeight } = Dimensions.get('screen')

    return [screenWidth, screenHeight]

}

export const getLandscapeHeight = () => {

    const [screenWidth, screenHeight] = getScreenDimensions()
    const landscapeHeight = Math.min(screenWidth, screenHeight);

    return landscapeHeight

}

export const getLandscapeWidth = () => {

    const [screenWidth, screenHeight] = getScreenDimensions()
    const landscapeWidth = Math.max(screenWidth, screenHeight);

    return landscapeWidth

}
