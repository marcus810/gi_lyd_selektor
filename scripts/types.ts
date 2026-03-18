
import { ImageSourcePropType, ViewStyle, TextStyle, ImageStyle, StyleProp} from 'react-native'

//also known as outputInfo
export type IntercomInfo = {
  id: number
  port: number
  name: string
  omniState: boolean
  groupState: boolean
  latchState: boolean
  type: string
}

export type InputInfo = {
  port: number
  name: string
  picturePath: string
}

export type ActivatedInputInfo = {
  id: number
  port: number
  name: string
  isActive: boolean
}

export type TemplateInfo = {
  id: number
  name: string
  noDelayPort: number
  delayPort: number
  micPort: number
  intercomOutputPort: number
  intercomInfo: IntercomInfo[]
  delay: number
  omniState: boolean
  omniName: string
  groupState: boolean
  groupName: string
  deviceUuid: string | null
  deviceExpiryDate: string | null
  lastActivationUtc: string
  autoDuck: boolean
  autoDuckGain: number
  isMaster: boolean
  isSlave: boolean
  slaveColor: string
}

export type TemplateViewProps = {
  name: string
  templateInfo: TemplateInfo
  onPress: (template: TemplateInfo) => void
  isTablet: boolean
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
  onToggleLatch: (id: number, port: number, groupState: boolean, type: string) => void
  onToggleUnlatchPress: (id: number, port: number, type: string) => void
  onToggleUnlatchRelease: (id: number, port: number, type: string) => void
}

export type InfoInputViewProps = BaseInfoViewProps & {
    port: number
    imagePath: string
    name: string
    imageStyle: StyleProp<ImageStyle>
    imageViewStyle: StyleProp<ViewStyle>
    width: number
    inputAmount: number
    parentWidth: number
    parentHeight: number
    templateInfo: TemplateInfo
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
