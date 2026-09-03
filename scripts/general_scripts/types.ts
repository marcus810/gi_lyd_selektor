import type Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'
import { ViewStyle, TextStyle, StyleProp } from 'react-native'

type IconName = ComponentProps<typeof Ionicons>['name']

export type ButtonProps = {
    title: string
    /* the pressable component shares viewstyle with the view component*/
    buttonStyle: StyleProp<ViewStyle>
    textStyle: StyleProp<TextStyle>
    pDefaultButtonBgColor?: string
    pPressedButtonBgColor?: string
    onPress?: () => void
    isDisabled?: boolean
    iconName?: IconName
    iconColor?: string
    iconSize?: number
}
