import { View } from 'react-native'
import React, { useRef } from 'react'
import * as styles from '../styles'
import { TemplateInfo } from '../types';
import { template } from '@babel/core'
import { DatabaseHandler } from '@/scripts/database/database'
import TemplateView from './TemplateView'
import { Link, router } from 'expo-router'

export const TemplateContainer = ( templateInfo: TemplateInfo[] ) => {
    const db = DatabaseHandler.getInstance()
    const onPress = (template: TemplateInfo) => {
            const templateData = JSON.stringify(template); // Serialize the object to pass as a string
            db.updateUuid(template)
            router.push(`/selektor?template=${encodeURIComponent(templateData)}`)
          }

    return (
        templateInfo.map((template, index) => (
          <TemplateView
            key={index}
            name={template.name.toString()}
            outerViewStyle={styles.templateSelectorStyles.infoContainer}
            textViewStyle={styles.templateSelectorStyles.textContainer}
            textStyle={styles.templateSelectorStyles.text}
            templateInfo={template}
            onPress={onPress}
          />
        ))
  
    );
  };