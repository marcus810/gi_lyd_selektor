import React from 'react'
import { TemplateInfo } from '../types';
import { DatabaseHandler } from '@/scripts/database/database'
import TemplateView from './TemplateView'
import { router } from 'expo-router'

export const TemplateContainer = ( templateInfo: TemplateInfo[], isTablet: boolean ) => {
    const db = DatabaseHandler.getInstance()
    const onPress = (template: TemplateInfo) => {
            const templateData = JSON.stringify(template); // Serialize the object to pass as a string
            console.log("in onpress in templatecontainer")
            console.log(templateData)
            db.updateUuid(template)
            router.push(`/selektor?template=${encodeURIComponent(templateData)}`)
          }

    return (
        templateInfo.map((template, index) => (
          <TemplateView
            key={index}
            name={template.name.toString()}
            templateInfo={template}
            onPress={onPress}
            isTablet={isTablet}
          />
        ))
  
    );
  };
