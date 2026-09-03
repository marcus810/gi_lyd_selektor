import { StyleSheet, Platform, ViewStyle } from 'react-native'
import * as misc from './misc'

export const palette = {
  appBg: '#050507',
  groupedBg: '#0b0d12',
  panel: '#171922',
  panelRaised: '#242735',
  panelDeep: '#0f1118',
  chrome: 'rgba(16,18,26,0.94)',
  control: '#272a38',
  controlPressed: '#35394a',
  controlSoft: '#141722',
  controlDisabled: '#101219',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.18)',
  separator: 'rgba(255,255,255,0.16)',
  highlight: 'rgba(255,255,255,0.28)',
  text: '#f5f5f7',
  textMuted: '#b7bac7',
  textSubtle: '#848999',
  primary: '#0a84ff',
  primaryPressed: '#006edb',
  primarySoft: 'rgba(10,132,255,0.30)',
  green: 'rgba(48, 209, 88, 0.76)',
  greenSolid: '#30d158',
  cyan: 'rgba(100, 210, 255, 0.78)',
  cyanBase: 'rgba(100, 210, 255, 0.25)',
  magenta: 'rgba(255, 55, 95, 0.76)',
  magentaBase: 'rgba(255, 55, 95, 0.25)',
  violet: '#bf5af2',
  violetSoft: 'rgba(191,90,242,0.28)',
  coral: '#ff6b4a',
  coralSoft: 'rgba(255,107,74,0.28)',
  amber: '#ff9f0a',
  amberSoft: 'rgba(255,159,10,0.28)',
  danger: '#ff453a',
  dangerActive: '#ff6961',
  warning: 'rgba(255, 214, 10, 0.92)',
}

const surfaceShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  android: {
    elevation: 5,
  },
  default: {},
}) ?? {}

const controlShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  android: {
    elevation: 2,
  },
  default: {},
}) ?? {}

const topChromeShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  android: {
    elevation: 6,
  },
  default: {},
}) ?? {}

const tactileShadow = (
  color: string,
  opacity: number,
  radius: number,
  height: number,
  elevation: number
): ViewStyle => Platform.select<ViewStyle>({
  ios: {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height },
  },
  android: {
    elevation,
  },
  default: {},
}) ?? {}

export const getTactileShadowStyle = (
  color: string = '#000',
  strength: 'soft' | 'medium' | 'strong' = 'medium'
): ViewStyle => {
  if (strength === 'strong') {
    return tactileShadow(color, 0.42, 18, 9, 8)
  }

  if (strength === 'soft') {
    return tactileShadow(color, 0.18, 9, 4, 3)
  }

  return tactileShadow(color, 0.28, 14, 7, 5)
}

const getSignalPressableShadow = (
  isOn: boolean,
  activeColor: string,
  isArmed: boolean = false,
  armedColor: string = activeColor
): ViewStyle => {
  if (isOn) {
    return tactileShadow(activeColor, 0.44, 18, 8, 8)
  }

  if (isArmed) {
    return tactileShadow(armedColor, 0.26, 13, 6, 5)
  }

  return tactileShadow('#000', 0.22, 10, 4, 3)
}

const systemText = {
  fontFamily: Platform.select({ ios: 'System', default: undefined }),
  letterSpacing: 0,
} as const

export const templateSelectorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.appBg,
  },
  header: {
    height: 72,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: palette.chrome,
    borderBottomWidth: 1,
    borderBottomColor: palette.separator,
  },
  headerSide: {
    flex: 0.9,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  linkContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  infoContainer: {
    width: '100%',
    height: misc.getLandscapeHeight() / 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    ...getTactileShadowStyle('#000', 'soft'),
  },
  scrollObjectContainer: {
    width: misc.getLandscapeWidth(),
    flexDirection: 'column',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textContainer: {
    justifyContent: 'center',
    flexGrow: 1,
    backgroundColor: palette.panelRaised,
    borderColor: palette.highlight,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    overflow: 'hidden',
    ...controlShadow,
    ...getTactileShadowStyle('#000', 'soft'),
  },
  button: {
    marginLeft: 0,
    width: 92,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: palette.control,
    ...controlShadow,
    ...getTactileShadowStyle('#000', 'medium'),
  },
  title: {
    color: palette.text,
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    ...systemText,
  },
  scrollview: {
    justifyContent: 'center',
  },
  text: {
    color: palette.text,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
    ...systemText,
  },
})

export const outputStyles = StyleSheet.create({
  container: {
    flex: 2,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    display: 'flex',
  },
  infoContainer: {
    flexDirection: 'row',
    padding: 4,
    minHeight: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.018)',
    ...getTactileShadowStyle('#000', 'soft'),
  },
  textContainer: {
    justifyContent: 'center',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
})

export const getInfoViewPressableStyleInput = (isOn: boolean) => ({
  backgroundColor: isOn ? palette.green : palette.controlSoft,
  borderColor: isOn ? palette.greenSolid : palette.border,
  ...getSignalPressableShadow(isOn, palette.greenSolid),
})

export const getInfoViewPressableStyleOutput = (
  isOn: boolean,
  omniOrGroupState: boolean,
  colour: string = palette.controlSoft
) => ({
  backgroundColor: isOn
    ? palette.green
    : omniOrGroupState
      ? colour
      : palette.controlSoft,
  borderColor: isOn ? palette.greenSolid : palette.border,
  ...getSignalPressableShadow(isOn, palette.greenSolid, omniOrGroupState, colour),
})

export const getInfoViewPressableStyleIntercomInput = (
  isOn: boolean,
  type: string
) => ({
  backgroundColor: isOn ? palette.green : palette.controlSoft,
  borderColor: isOn ? palette.greenSolid : palette.border,
  ...getSignalPressableShadow(isOn, palette.greenSolid),
})

export const getInfoViewPressableStyleOutputOmni = (isOn: boolean, omniState: boolean) => ({
  backgroundColor: isOn
    ? palette.cyan
    : omniState
      ? palette.cyanBase
      : palette.controlSoft,
  borderColor: isOn ? palette.cyan : palette.border,
  ...getSignalPressableShadow(isOn, palette.cyan, omniState, palette.cyan),
})

export const getInfoViewPressableStyleOutputGroup = (isOn: boolean, groupState: boolean) => ({
  backgroundColor: isOn
    ? palette.magenta
    : groupState
      ? palette.magentaBase
      : palette.controlSoft,
  borderColor: isOn ? palette.magenta : palette.border,
  ...getSignalPressableShadow(isOn, palette.magenta, groupState, palette.magenta),
})

export const getInfoViewPressableStyleGroup = (isOn: boolean) => ({
  backgroundColor: isOn ? palette.magenta : palette.magentaBase,
  borderColor: isOn ? palette.magenta : palette.border,
  ...getSignalPressableShadow(isOn, palette.magenta, true, palette.magenta),
})

export const getInfoViewPressableStyleOmni = (isOn: boolean) => ({
  backgroundColor: isOn ? palette.cyan : palette.cyanBase,
  borderColor: isOn ? palette.cyan : palette.border,
  ...getSignalPressableShadow(isOn, palette.cyan, true, palette.cyan),
})

export const inputStyles = StyleSheet.create({
  container: {
    flex: 5,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    flexWrap: 'wrap',
    overflow: 'visible',
    backgroundColor: palette.groupedBg,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    margin: 7,
  },
  infoContainer: {
    flexDirection: 'column',
    padding: 6,
    marginBottom: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.025)',
    ...getTactileShadowStyle('#000', 'soft'),
  },
  textContainer: {
    minHeight: 20,
    justifyContent: 'center',
    borderColor: palette.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 5,
  },
  imageContainer: {
    height: '80%',
    borderColor: palette.border,
    borderWidth: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
    backgroundColor: palette.panel,
    borderTopColor: palette.highlight,
  },
})

export const generalStyles = StyleSheet.create({
  indexButton: {
    minWidth: 190,
    width: '72%',
    maxWidth: 440,
    minHeight: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderWidth: 0,
    borderColor: palette.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...controlShadow,
    ...getTactileShadowStyle(palette.primary, 'strong'),
  },
  indexButtonText: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    ...systemText,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: palette.appBg,
  },
  container: {
    flex: 1,
    height: '100%',
    flexDirection: 'column',
    backgroundColor: palette.groupedBg,
    padding: 7,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  scrollObjectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    flexWrap: 'wrap',
  },
  scrollOutputContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  buttonContainer: {
    flex: 0.55,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: palette.chrome,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    marginHorizontal: 7,
    marginBottom: 7,
    ...topChromeShadow,
  },
  button: {
    flex: 1,
    maxWidth: '15%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: palette.panelRaised,
    paddingHorizontal: 7,
    ...controlShadow,
    ...getTactileShadowStyle('#000', 'medium'),
  },
  tabButtonPressed: {
    flex: 1,
    maxWidth: '15%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.primary,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: palette.panelRaised,
    paddingHorizontal: 6,
    ...getTactileShadowStyle(palette.primary, 'medium'),
  },
  buttonPressed: {
    flex: 1,
    maxWidth: '15%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: palette.controlPressed,
    paddingHorizontal: 6,
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
    ...getTactileShadowStyle('#000', 'soft'),
  },
  zoomBtn: {
    flex: 1,
    maxWidth: '5%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: palette.control,
    ...getTactileShadowStyle('#000', 'soft'),
  },
  timecode: {
    flex: 1,
    maxWidth: '25%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: palette.panelDeep,
    paddingHorizontal: 6,
    overflow: 'hidden',
    ...controlShadow,
    ...getTactileShadowStyle('#000', 'medium'),
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    ...systemText,
  },
  mutedText: {
    color: palette.textMuted,
    textAlign: 'center',
    ...systemText,
  },
})

export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    maxWidth: 520,
    padding: 20,
    backgroundColor: palette.panel,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...surfaceShadow,
  },
  compactContent: {
    width: '68%',
    maxWidth: 520,
    padding: 20,
    backgroundColor: palette.panel,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...surfaceShadow,
  },
  title: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
    ...systemText,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
