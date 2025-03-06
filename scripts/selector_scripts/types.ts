
import { ImageSourcePropType, ViewStyle, TextStyle, ImageStyle, StyleProp} from 'react-native'

//also known as outputInfo
export type IntercomInfo = {
  port: number
  name: string
}

export type InputInfo = {
  port: number
  name: string
  picturePath: string
}

export type TemplateInfo = {
  id: number
  noDelayPort: number
  delayPort: number
  intercomInfo: IntercomInfo[]
}



type BaseInfoViewProps = {
  outerViewStyle: StyleProp<ViewStyle>
  textViewStyle: StyleProp<ViewStyle>
  textStyle: StyleProp<TextStyle>
  selectedStyle: Function
}

export type InfoOutputViewProps = BaseInfoViewProps & {
  port: number
  name: string
  onToggle: (setToggleState: React.Dispatch<React.SetStateAction<boolean>>) => void
}

export type InfoInputViewProps = BaseInfoViewProps & {
    port: number
    imagePath: string
    name: string
    imageStyle: StyleProp<ImageStyle>
    imageViewStyle: StyleProp<ViewStyle>
    onToggle: (setToggleState: React.Dispatch<React.SetStateAction<boolean>>) => void
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
