import { useRouter } from 'expo-router'



export const clearAllInfoViews = (
    outputArr: React.Dispatch<React.SetStateAction<boolean>>[], 
    inputArr: React.Dispatch<React.SetStateAction<boolean>>[]
  ) => {
    outputArr.forEach((output) =>{
      output(false)
    })
    inputArr.forEach((input) =>{
      input(false)
    })
  }

export const handlePress = (
    isOn: boolean,
    setIsOn: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    /*logic to turn on dante soundcard goes below here*/ 

    /*logic to turn on dante soundcard goes above here*/ 
    setIsOn((prev) => !prev);
  };
