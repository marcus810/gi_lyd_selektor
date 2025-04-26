
import { ImageSourcePropType, ViewStyle, TextStyle, ImageStyle, StyleProp} from 'react-native'

//also known as outputInfo
export type IntercomInfo = {
  port: number
  name: string
  omniState: boolean
  latchState: boolean
}

export type InputInfo = {
  port: number
  name: string
  picturePath: string
}

export type TemplateInfo = {
  id: number
  name: string
  noDelayPort: number
  delayPort: number
  micPort: number
  intercomInfo: IntercomInfo[]
  delay: number
  omniState: boolean
}

export type TemplateViewProps = {
  name: string
  outerViewStyle: StyleProp<ViewStyle>
  textViewStyle: StyleProp<ViewStyle>
  textStyle: StyleProp<TextStyle>
  templateInfo: TemplateInfo
  onPress: (template: TemplateInfo) => void
}


type BaseInfoViewProps = {
  outerViewStyle: StyleProp<ViewStyle>
  textViewStyle: StyleProp<ViewStyle>
  textStyle: StyleProp<TextStyle>
  selectedStyle: Function
  templateInfo: TemplateInfo
}

export type InfoOutputViewProps = BaseInfoViewProps & {
  port: number
  name: string
  intercomInfo: IntercomInfo
  onToggleLatch: (setToggle: React.Dispatch<React.SetStateAction<boolean>>, toggle: boolean, chosenTemplate: TemplateInfo, port: number) => void
  onToggleUnlatchPress: (setToggle: React.Dispatch<React.SetStateAction<boolean>>, chosenTemplate: TemplateInfo, port: number) => void
  onToggleUnlatchRelease: (setToggle: React.Dispatch<React.SetStateAction<boolean>>, chosenTemplate: TemplateInfo, port: number) => void
}

export type InfoInputViewProps = BaseInfoViewProps & {
    port: number
    imagePath: string
    name: string
    imageStyle: StyleProp<ImageStyle>
    imageViewStyle: StyleProp<ViewStyle>
    onToggle: (setToggle: React.Dispatch<React.SetStateAction<boolean>>, toggle: boolean, chosenTemplate: TemplateInfo, port: number) => void
  }

export type InfoViewRef = {
 setToggle: React.Dispatch<React.SetStateAction<boolean>>
 setMinWidth: React.Dispatch<React.SetStateAction<number>>
 minWidth: number
 maxWidth: number
}

export type GetInfoViews = BaseInfoViewProps & {
  dataType: string
  onToggle: (setToggleState: React.Dispatch<React.SetStateAction<boolean>>) => void
}
