import { StyleSheet, Platform } from 'react-native'
import * as misc from './misc'

export const palette = {
  appBg: '#0d1013',
  panel: '#161a1e',
  panelRaised: '#1d2328',
  control: '#242a30',
  controlPressed: '#303841',
  controlSoft: '#20262c',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.2)',
  text: '#f3f6f8',
  textMuted: '#a6b0ba',
  green: 'rgba(41, 205, 111, 0.68)',
  greenSolid: '#29cd6f',
  cyan: 'rgba(22, 190, 216, 0.62)',
  cyanBase: 'rgba(31, 87, 159, 0.58)',
  magenta: 'rgba(210, 66, 128, 0.62)',
  magentaBase: 'rgba(117, 50, 78, 0.58)',
  danger: '#b93232',
  dangerActive: '#ff5a52',
  warning: 'rgba(232, 195, 47, 0.88)',
}

const surfaceShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  android: {
    elevation: 4,
  },
  default: {},
}) ?? {}

export const templateSelectorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.appBg,
  },
  header: {
    height: 82,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: palette.panel,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
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
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  linkContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  infoContainer: {
    width: '100%',
    height: misc.getLandscapeHeight() / 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  scrollObjectContainer: {
    width: misc.getLandscapeWidth(),
    flexDirection: 'column',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textContainer: {
    justifyContent: 'center',
    flexGrow: 1,
    backgroundColor: palette.panelRaised,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
    ...surfaceShadow,
  },
  button: {
    marginLeft: 5,
    width: 84,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: palette.control,
    overflow: 'hidden',
  },
  title: {
    color: palette.text,
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
  },
  scrollview: {
    justifyContent: 'center',
  },
  text: {
    color: palette.text,
    textAlign: 'center',
    fontSize: 42,
    fontWeight: '800',
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
})

export const getInfoViewPressableStyleIntercomInput = (
  isOn: boolean,
  type: string
) => ({
  backgroundColor: isOn ? palette.green : palette.controlSoft,
})

export const getInfoViewPressableStyleOutputOmni = (isOn: boolean, omniState: boolean) => ({
  backgroundColor: isOn
    ? palette.cyan
    : omniState
      ? palette.cyanBase
      : palette.controlSoft,
})

export const getInfoViewPressableStyleOutputGroup = (isOn: boolean, groupState: boolean) => ({
  backgroundColor: isOn
    ? palette.magenta
    : groupState
      ? palette.magentaBase
      : palette.controlSoft,
})

export const getInfoViewPressableStyleGroup = (isOn: boolean) => ({
  backgroundColor: isOn ? palette.magenta : palette.magentaBase,
})

export const getInfoViewPressableStyleOmni = (isOn: boolean) => ({
  backgroundColor: isOn ? palette.cyan : palette.cyanBase,
})

export const inputStyles = StyleSheet.create({
  container: {
    flex: 5,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    flexWrap: 'wrap',
    overflow: 'hidden',
    backgroundColor: palette.appBg,
  },
  infoContainer: {
    flexDirection: 'column',
    padding: 4,
    marginBottom: 0,
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
    paddingHorizontal: 4,
  },
  imageContainer: {
    height: '80%',
    borderColor: palette.border,
    borderWidth: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
})

export const generalStyles = StyleSheet.create({
  indexButton: {
    minWidth: 190,
    width: '72%',
    maxWidth: 440,
    minHeight: 58,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.control,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...surfaceShadow,
  },
  indexButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: palette.appBg,
  },
  container: {
    flex: 1,
    height: '100%',
    flexDirection: 'column',
    backgroundColor: palette.appBg,
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
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: palette.panel,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  button: {
    flex: 1,
    maxWidth: '15%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: palette.control,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  tabButtonPressed: {
    flex: 1,
    maxWidth: '15%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.greenSolid,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: palette.green,
    paddingHorizontal: 6,
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
  },
  zoomBtn: {
    flex: 1,
    maxWidth: '5%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: palette.control,
  },
  timecode: {
    flex: 1,
    maxWidth: '25%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: palette.borderStrong,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: palette.controlSoft,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  text: {
    fontWeight: '800',
    color: palette.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  mutedText: {
    color: palette.textMuted,
    textAlign: 'center',
  },
})

export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    maxWidth: 520,
    padding: 20,
    backgroundColor: palette.panelRaised,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    ...surfaceShadow,
  },
  compactContent: {
    width: '68%',
    maxWidth: 520,
    padding: 20,
    backgroundColor: palette.panelRaised,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    ...surfaceShadow,
  },
  title: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
    color: palette.text,
    textAlign: 'center',
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
