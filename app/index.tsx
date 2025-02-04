
import { View, Text, StyleSheet, Pressable, SafeAreaView, StatusBar, Platform} from 'react-native'
import React, { useState } from 'react'
import { Link } from 'expo-router'

const index = () => {
   
  return (
    <SafeAreaView style={styles.safeContainer}>
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Gi Lyd Selektor</Text>
      </View>
      <View style={styles.linkContainer}>
        <Link href="/selektor" style={{ marginHorizontal: "auto" }} asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Connect</Text>
          </Pressable>
        </Link>
      </View>
    </View>
    </SafeAreaView>
  )
}

export default index

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  titleContainer:{
    flex: 1,
    flexDirection: "column",
    alignSelf: 'center',
  },
  linkContainer:{
    flex: 1,
    alignSelf: 'center'
  },
  title: {
    alignSelf: "flex-start",
    color: "white",
    fontSize: 50,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingTop: 40
  },
  button: {
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    backgroundColor: "rgba(255,250,250,0.25)",
    padding: 6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
})