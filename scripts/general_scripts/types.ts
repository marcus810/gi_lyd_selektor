import { ViewStyle, TextStyle, StyleProp } from 'react-native'

export type ButtonProps = {
    title: string
    /* the pressable component shares viewstyle with the view component*/
    buttonStyle: StyleProp<ViewStyle>
    textStyle: StyleProp<TextStyle>
    pDefaultButtonBgColor?: string
    pPressedButtonBgColor?: string
    onPress?: () => void
    isDisabled?: boolean
}

