import { View } from 'react-native'
import InfoInputView from './InfoInputView'
import InfoOutputView from './InfoOutputView'
import React, { useRef } from 'react'
import * as styles from './styles'
import { IntercomInfo, InputInfo } from './types';

export const InfoViewOuputContainer = ( intercomInfo: IntercomInfo[] ) => {

  const handleToggle = (setToggle: React.Dispatch<React.SetStateAction<boolean>>) => {
    setToggle((prev) => !prev);
  };
  return (
      intercomInfo.map((intercom, index) => (
        <InfoOutputView
          key={index}
          port={intercom.port}
          name={intercom.name}
          outerViewStyle={styles.outputStyles.infoContainer}
          textViewStyle={styles.outputStyles.textContainer}
          textStyle={styles.generalStyles.text}
          selectedStyle={styles.getInfoViewPressableStyle}
          onToggle={handleToggle}
        />
      ))

  );
};

export const InfoViewInputContainer = ( inputInfo: InputInfo[] ) => {


  const handleToggle = (setToggle: React.Dispatch<React.SetStateAction<boolean>>) => {
    setToggle((prev) => !prev);
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
          selectedStyle={styles.getInfoViewPressableStyle}
          onToggle={handleToggle}
        />
      ))
  );
};