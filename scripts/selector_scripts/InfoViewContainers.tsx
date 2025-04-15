import { View } from 'react-native'
import InfoInputView from './InfoInputView'
import InfoOutputView from './InfoOutputView'
import React, { useRef } from 'react'
import * as styles from '../styles'
import { IntercomInfo, InputInfo, TemplateInfo } from '../types';
import { template } from '@babel/core'
import { DatabaseHandler } from '@/scripts/database/database'

export const InfoViewOuputContainer = ( intercomInfo: IntercomInfo[], chosenTemplate: TemplateInfo ) => {


  const db = DatabaseHandler.getInstance()

  const handleToggleLatch = (setToggle: React.Dispatch<React.SetStateAction<boolean>>, toggle: boolean, chosenTemplate: TemplateInfo, port: number) => {
      setToggle((prev) => !prev);
      if (toggle){
        db.sendOutputOff(chosenTemplate, port)
      }
      else{
        db.sendOutputOn(chosenTemplate, port)
      }
    };
  
  const handleToggleUnlatchPress = (setToggle: React.Dispatch<React.SetStateAction<boolean>>, chosenTemplate: TemplateInfo, port: number) => {
    setToggle((prev) => !prev);
    db.sendOutputOn(chosenTemplate, port)   
  };
  
  const handleToggleUnlatchRelease = (setToggle: React.Dispatch<React.SetStateAction<boolean>>, chosenTemplate: TemplateInfo, port: number) => {
    setToggle((prev) => !prev);
    db.sendOutputOff(chosenTemplate, port)   
  };
  
  
  return (
      intercomInfo.map((intercom, index) => (

        <InfoOutputView
          key={index}
          port={intercom.port}
          name={intercom.name}
          intercomInfo={intercom}
          outerViewStyle={styles.outputStyles.infoContainer}
          textViewStyle={styles.outputStyles.textContainer}
          textStyle={styles.generalStyles.text}
          selectedStyle={styles.getInfoViewPressableStyleOutput}
          templateInfo={chosenTemplate}
          onToggleLatch={handleToggleLatch}
          onToggleUnlatchPress={handleToggleUnlatchPress}
          onToggleUnlatchRelease={handleToggleUnlatchRelease}
        />
      ))

  );
};

export const InfoViewInputContainer = ( inputInfo: InputInfo[], chosenTemplate: TemplateInfo ) => {
  const db = DatabaseHandler.getInstance()
  const handleToggle = (setToggle: React.Dispatch<React.SetStateAction<boolean>>, toggle: boolean, chosenTemplate: TemplateInfo, port: number) => {
    setToggle((prev) => !prev);
    if (toggle){
      db.sendInputOff(chosenTemplate, port)
    }
    else{
      db.sendInputOn(chosenTemplate, port)
    }

  };

  
  return (
      inputInfo.map((input, index) => (
        <InfoInputView
          key={index}
          port={input.port}
          imagePath={input.picturePath}
          name={input.name}
          outerViewStyle={styles.inputStyles.infoContainer}
          imageViewStyle={styles.inputStyles.imageContainer}
          textViewStyle={styles.inputStyles.textContainer}
          imageStyle={styles.generalStyles.image}
          textStyle={styles.generalStyles.text}
          selectedStyle={styles.getInfoViewPressableStyleInput}
          templateInfo={chosenTemplate}
          onToggle={handleToggle}
        />
      ))
  );
};