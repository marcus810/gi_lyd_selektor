
import { ImageSourcePropType, ViewStyle, TextStyle, ImageStyle, StyleProp} from 'react-native'

type BaseInfoViewProps = {
  outerViewStyle: StyleProp<ViewStyle>
  imageViewStyle: StyleProp<ViewStyle>
  textViewStyle: StyleProp<ViewStyle>
  imageStyle: StyleProp<ImageStyle>
  textStyle: StyleProp<TextStyle>
  selectedStyle: Function
}

export type InfoViewProps = BaseInfoViewProps & {
    index: number
    imageProp: ImageSourcePropType
    name: string
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
