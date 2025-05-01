
import { ImageSourcePropType, ViewStyle, TextStyle, ImageStyle, StyleProp} from 'react-native'

//also known as outputInfo
export type IntercomInfo = {
  port: number
  name: string
  omniState: boolean
  groupState: boolean
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
  groupState: boolean
  deviceUuid: string | null
  deviceExpiryDate: string | null
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
  onToggleLatch: (port: number, groupState: boolean) => void
  onToggleUnlatchPress: (port: number) => void
  onToggleUnlatchRelease: (port: number) => void
}

export type InfoInputViewProps = BaseInfoViewProps & {
    port: number
    imagePath: string
    name: string
    imageStyle: StyleProp<ImageStyle>
    imageViewStyle: StyleProp<ViewStyle>
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
