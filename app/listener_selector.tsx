import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Alert } from 'react-native'
import { BlurView } from 'expo-blur'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as styles from '../scripts/styles'
import DropDownPicker from 'react-native-dropdown-picker'
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import * as Device from 'expo-device'

const ListenerSelector = () => {
  const router = useRouter()
  const db = DatabaseHandler.getInstance()

  const [templateInfoList, setTemplateInfoList] = useState<types.TemplateInfo[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<types.TemplateInfo>()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<number | null>(null)
  const [items, setItems] = useState<Array<{ label: string; value: number }>>([])
  const [isListening, setIsListening] = useState(!db.isMuted)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | null = null

    const fetchDeviceType = async () => {
      const type = await Device.getDeviceTypeAsync()
      setIsTablet(type === Device.DeviceType.TABLET)
    }

    fetchDeviceType()

    const fetchData = async () => {
      try {
        const templates = await db.fetchTemplates()
        setTemplateInfoList(templates)

        const ddItems = templates.map((t) => ({
          label: t.name,
          value: t.id,
        }))
        const programItem = { label: "PGM", value: -1 }
        setItems([programItem, ...ddItems])

        if (ddItems.length > 0) {
          setValue(-1)
          console.log(
            `Default template selected on load: ID=${ddItems[0].value}, name=${ddItems[0].label}`
          )
        }
      } catch (error) {
        console.warn('Error fetching templates:', error)
      }
    }
    fetchData()

    const goToIndexScreen = () => router.dismissTo('/')

    const handleSocketDisconnect = () => {
      redirectTimer = setTimeout(() => {
        Alert.alert(
          'Failed to Reconnect',
          'The connection could not be restored. You will be redirected to the main screen.',
          [{ text: 'OK', onPress: () => goToIndexScreen() }]
        )
      }, 500)
    }
    const removeDisconnectHandler = db.onSocketDisconnect(handleSocketDisconnect)

    return () => {
      removeDisconnectHandler()
      if (redirectTimer !== null) {
        clearTimeout(redirectTimer)
      }
      db.closeSocket()
    }
  }, [])

  const goToIndexScreen = () => {
    db.listenerExit(currentTemplate)
    router.dismissTo('/')
  }

  const onValueChange = async (selectedId: number | null) => {
    setValue(selectedId)
    if (selectedId === null) {
      console.log('No template selected')
      return
    }
    const chosenTemplate = templateInfoList.find((t) => t.id === selectedId)
    if (chosenTemplate) {
      console.log(`Template picked: ID=${chosenTemplate.id}, name=${chosenTemplate.name}`)
      setCurrentTemplate(chosenTemplate)
      await db.listenerJoin(chosenTemplate)
    } else if (selectedId === -1) {
      const fakeTemplate = {
        id: -1,
        name: "",
        noDelayPort: 0,
        delayPort: 0,
        micPort: 0,
        intercomOutputPort: 0,
        intercomInfo: [],
        delay: 0,
        omniState: false,
        omniName: "",
        groupState: false,
        groupName: "",
        deviceUuid: "",
        deviceExpiryDate: "",
        lastActivationUtc: "",
        autoDuck: false,
        autoDuckGain: 1,
        autoDuckThreshold: 0,
        autoDuckRelease: 0,
        isMaster: false,
        isTabMaster: false,
        isSlave: false,
        slaveColor: "",
      }
      setCurrentTemplate(fakeTemplate)
      await db.listenerJoin(fakeTemplate)
    } else {
      console.log(`Template picked: ID=${selectedId}`)
    }
  }

  const handleToggle = () => {
    setIsListening((prev) => {
      const next = !prev
      if (next) {
        db.isMuted = false
        db.playRemoteStream()
        console.log('Now Listening')
      } else {
        db.isMuted = true
        db.playRemoteStream()
        console.log('Muted')
      }
      return next
    })
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        <View style={localStyles.screen}>
          <View pointerEvents="none" style={localStyles.backdropLayer}>
            <View style={localStyles.primaryBand} />
            <View style={localStyles.coralBand} />
            <View style={localStyles.amberBand} />
          </View>

          <BlurView intensity={44} tint="dark" style={localStyles.topBar}>
            <View style={localStyles.topBarSide}>
              {generalComponent.getButton({
                title: 'Back',
                pDefaultButtonBgColor: styles.palette.controlSoft,
                pPressedButtonBgColor: styles.palette.controlPressed,
                buttonStyle: styles.templateSelectorStyles.button,
                textStyle: styles.generalStyles.text,
                iconName: "chevron-back",
                iconSize: 17,
                onPress: () => goToIndexScreen(),
              })}
            </View>
            <View style={localStyles.topBarCenter}>
              <Text style={[localStyles.topTitle, { fontSize: isTablet ? 32 : 23 }]}>
                Listener
              </Text>
            </View>
            <View style={localStyles.topBarSide} />
          </BlurView>

          <View style={localStyles.body}>
            <BlurView
              intensity={36}
              tint="dark"
              style={[localStyles.listenerDeck, { width: isTablet ? '62%' : '90%' }]}
            >
              <View style={[localStyles.statusBadge, { borderColor: isListening ? styles.palette.greenSolid : styles.palette.danger }]}>
                <Ionicons
                  name={isListening ? "volume-high-outline" : "volume-mute-outline"}
                  size={isTablet ? 48 : 38}
                  color={isListening ? styles.palette.greenSolid : styles.palette.danger}
                />
              </View>

              <Text
                style={[localStyles.deckTitle, { fontSize: isTablet ? 48 : 34 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.74}
              >
                Select Template
              </Text>

              <View style={localStyles.dropdownShell}>
                <DropDownPicker
                  open={open}
                  value={value}
                  items={items}
                  setOpen={setOpen}
                  setValue={setValue}
                  setItems={setItems}
                  onChangeValue={onValueChange}
                  placeholder="Pick a template..."
                  showTickIcon={false}
                  itemSeparator
                  scrollViewProps={{
                    nestedScrollEnabled: true,
                  }}
                  showArrowIcon={false}
                  style={localStyles.dropdown}
                  dropDownContainerStyle={localStyles.dropdownList}
                  labelStyle={[
                    localStyles.dropdownText,
                    { fontSize: isTablet ? 28 : 19 },
                  ]}
                  placeholderStyle={[
                    localStyles.dropdownText,
                    { color: styles.palette.textMuted, fontSize: isTablet ? 28 : 19 },
                  ]}
                  textStyle={[
                    styles.generalStyles.text,
                    { color: styles.palette.text, textAlign: 'center', fontSize: isTablet ? 28 : 19 },
                  ]}
                  listItemLabelStyle={localStyles.listItemLabel}
                  selectedItemContainerStyle={localStyles.selectedItem}
                  itemSeparatorStyle={localStyles.itemSeparator}
                />
              </View>

              <View style={localStyles.actionRow}>
                {generalComponent.getButton({
                  title: isListening ? 'Mute' : 'Listen',
                  pDefaultButtonBgColor: isListening ? styles.palette.danger : styles.palette.primary,
                  pPressedButtonBgColor: isListening ? styles.palette.dangerActive : styles.palette.primaryPressed,
                  iconName: isListening ? "volume-mute-outline" : "volume-high-outline",
                  iconSize: 21,
                  buttonStyle: localStyles.listenButton,
                  textStyle: localStyles.listenButtonText,
                  onPress: handleToggle,
                })}
              </View>
            </BlurView>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default ListenerSelector

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: styles.palette.appBg,
    overflow: 'hidden',
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  primaryBand: {
    position: 'absolute',
    left: -52,
    top: 92,
    width: '66%',
    height: 70,
    borderRadius: 8,
    backgroundColor: styles.palette.primarySoft,
    transform: [{ rotate: '-12deg' }],
  },
  coralBand: {
    position: 'absolute',
    right: -34,
    top: '34%',
    width: '54%',
    height: 70,
    borderRadius: 8,
    backgroundColor: styles.palette.coralSoft,
    transform: [{ rotate: '15deg' }],
  },
  amberBand: {
    position: 'absolute',
    left: '12%',
    bottom: '15%',
    width: '76%',
    height: 52,
    borderRadius: 8,
    backgroundColor: styles.palette.amberSoft,
    transform: [{ rotate: '6deg' }],
  },
  topBar: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: styles.palette.separator,
    backgroundColor: styles.palette.chrome,
    overflow: 'hidden',
  },
  topBarSide: {
    width: 104,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: styles.palette.text,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  listenerDeck: {
    maxWidth: 620,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,25,34,0.86)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: styles.palette.highlight,
    paddingHorizontal: 18,
    paddingVertical: 24,
    overflow: 'visible',
    shadowColor: styles.palette.primary,
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  statusBadge: {
    width: 82,
    height: 82,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: styles.palette.panelDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deckTitle: {
    color: styles.palette.text,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 18,
  },
  dropdownShell: {
    width: '100%',
    zIndex: 10,
  },
  dropdown: {
    borderColor: styles.palette.highlight,
    backgroundColor: styles.palette.panelDeep,
    width: '100%',
    minHeight: 58,
    borderRadius: 8,
  },
  dropdownList: {
    borderColor: styles.palette.highlight,
    backgroundColor: styles.palette.panelDeep,
    width: '100%',
    borderRadius: 8,
  },
  dropdownText: {
    color: styles.palette.text,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 0,
  },
  listItemLabel: {
    color: styles.palette.text,
    textAlign: 'center',
  },
  selectedItem: {
    backgroundColor: styles.palette.primarySoft,
  },
  itemSeparator: {
    backgroundColor: styles.palette.separator,
  },
  actionRow: {
    width: '100%',
    marginTop: 18,
  },
  listenButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    paddingHorizontal: 18,
    shadowColor: styles.palette.primary,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  listenButtonText: {
    color: styles.palette.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0,
  },
})
