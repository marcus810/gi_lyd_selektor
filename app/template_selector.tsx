import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler'
import { Alert } from 'react-native'
import { BlurView } from 'expo-blur'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as styles from '../scripts/styles'
import { TemplateContainer } from '@/scripts/template_selector_scripts/TemplateContainer'
import * as generalComponent from '../scripts/general_scripts/custom_components'
import * as types from '../scripts/types'
import { DatabaseHandler } from '@/scripts/database/database'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import * as Device from 'expo-device'
import * as misc from './../scripts/misc'

const template_selektor = () => {
  const router = useRouter()
  const db = DatabaseHandler.getInstance()

  const [templateInfoList, setTemplateInfoList] = useState<types.TemplateInfo[]>([])
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | null = null

    const fetchData = async () => {
      try {
        const type = await Device.getDeviceTypeAsync()
        const tablet = type === Device.DeviceType.TABLET
        setIsTablet(tablet)

        const templates = await db.fetchTemplates()
        const unclaimed = templates.filter(t => t.deviceUuid === null)

        const allowedTemplates = tablet
          ? unclaimed
          : unclaimed.filter(t => !t.isTabMaster)

        setTemplateInfoList(allowedTemplates)
      } catch (error) {
      }
    }

    fetchData()

    const goToIndexScreen = () => {
      router.dismissTo('/')
    }

    const handleSocketDisconnect = () => {
      redirectTimer = setTimeout(() => {
        Alert.alert(
          "Failed to Reconnect",
          "The connection could not be restored. You will be redirected to the main screen.",
          [{ text: "OK", onPress: () => goToIndexScreen() }]
        )
      }, 500)
    }

    const removeDisconnectHandler = db.onSocketDisconnect(handleSocketDisconnect)

    return () => {
      removeDisconnectHandler()
      if (redirectTimer !== null) {
        clearTimeout(redirectTimer)
      }
    }
  }, [])

  const goToIndexScreen = () => {
    db.closeSocket()
    router.dismissTo('/')
  }

  const TemplateInfoArr = TemplateContainer(templateInfoList, isTablet)
  const listWidth = isTablet ? misc.getLandscapeWidth() : misc.getLandscapeHeight()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.generalStyles.safeContainer}>
        <View style={localStyles.screen}>
          <View pointerEvents="none" style={localStyles.backdropLayer}>
            <View style={localStyles.backdropPrimary} />
            <View style={localStyles.backdropAmber} />
            <View style={localStyles.backdropViolet} />
          </View>

          <BlurView intensity={44} tint="dark" style={localStyles.topBar}>
            <View style={localStyles.topBarSide}>
              {generalComponent.getButton({
                title: "Back",
                buttonStyle: styles.templateSelectorStyles.button,
                textStyle: styles.generalStyles.text,
                pDefaultButtonBgColor: styles.palette.controlSoft,
                pPressedButtonBgColor: styles.palette.controlPressed,
                iconName: "chevron-back",
                iconSize: 17,
                onPress: () => goToIndexScreen()
              })}
            </View>

            <View style={localStyles.topBarCenter}>
              <Text
                style={[localStyles.topTitle, { fontSize: isTablet ? 32 : 23 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                Templates
              </Text>
            </View>

            <View style={localStyles.topBarSide}>
              <View style={localStyles.countPill}>
                <Ionicons name="layers-outline" size={15} color={styles.palette.cyan} />
                <Text style={localStyles.countText}>{templateInfoList.length}</Text>
              </View>
            </View>
          </BlurView>

          <View style={localStyles.heroStrip}>
            <View style={localStyles.heroIcon}>
              <Ionicons name="albums-outline" size={isTablet ? 32 : 25} color={styles.palette.primary} />
            </View>
            <Text
              style={[localStyles.heroTitle, { fontSize: isTablet ? 46 : 32 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.74}
            >
              Choose Template
            </Text>
          </View>

          <ScrollView
            horizontal={false}
            bounces={false}
            style={localStyles.scrollView}
            contentContainerStyle={localStyles.scrollContent}
          >
            <View
              style={[
                styles.templateSelectorStyles.scrollObjectContainer,
                localStyles.templateGrid,
                { width: listWidth },
              ]}
            >
              {TemplateInfoArr}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default template_selektor

const localStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: styles.palette.appBg,
    overflow: 'hidden',
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPrimary: {
    position: 'absolute',
    left: -70,
    top: 120,
    width: '70%',
    height: 70,
    borderRadius: 8,
    backgroundColor: styles.palette.primarySoft,
    transform: [{ rotate: '-12deg' }],
  },
  backdropAmber: {
    position: 'absolute',
    right: -52,
    top: '42%',
    width: '58%',
    height: 70,
    borderRadius: 8,
    backgroundColor: styles.palette.amberSoft,
    transform: [{ rotate: '14deg' }],
  },
  backdropViolet: {
    position: 'absolute',
    left: '16%',
    bottom: '13%',
    width: '72%',
    height: 52,
    borderRadius: 8,
    backgroundColor: styles.palette.violetSoft,
    transform: [{ rotate: '5deg' }],
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
  countPill: {
    alignSelf: 'flex-end',
    minWidth: 54,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: styles.palette.border,
    backgroundColor: styles.palette.panelDeep,
    paddingHorizontal: 9,
  },
  countText: {
    color: styles.palette.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  heroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: styles.palette.panelRaised,
    borderWidth: 1,
    borderColor: styles.palette.highlight,
  },
  heroTitle: {
    flex: 1,
    color: styles.palette.text,
    fontWeight: '800',
    letterSpacing: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 18,
  },
  templateGrid: {
    paddingTop: 2,
    paddingHorizontal: 14,
  },
})
