import * as types from './types'


const zoomIn = (
  ref: types.InfoViewRef | null
  ) => {
    if (ref) {
      const newMinWidth = ref.minWidth-1
      if (newMinWidth >= 5){
        ref.setMinWidth(newMinWidth)
      }
    }
  }

export const zoomInfoViewIn = (
    outputViewRefs: React.MutableRefObject<(types.InfoViewRef | null)[]>, 
    inputViewRefs: React.MutableRefObject<(types.InfoViewRef | null)[]>
  ) => {
    outputViewRefs.current.forEach((ref) => {
      zoomIn(ref)
    })

    inputViewRefs.current.forEach((ref) => {
      zoomIn(ref)
    })
  }

const zoomOut = (
  ref: types.InfoViewRef | null
  ) => {
    if (ref) {
      const newMinWidth = ref.minWidth+1
      if (newMinWidth <= 14){
        ref.setMinWidth(newMinWidth)
      }
    }
  }

export const zoomInfoViewOut = (
    outputViewRefs: React.MutableRefObject<(types.InfoViewRef | null)[]>, 
    inputViewRefs: React.MutableRefObject<(types.InfoViewRef | null)[]>
  ) => {
    outputViewRefs.current.forEach((ref) => {
      zoomOut(ref)
    })

    inputViewRefs.current.forEach((ref) => {
      zoomOut(ref)
    })
  }

export const handleInfoViewToggle = (
    setIsOn: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    /*logic to turn on dante soundcard goes below here*/ 

    /*logic to turn on dante soundcard goes above here*/ 
    setIsOn((prev) => !prev);
  };

export const clearAllInfoViews = (
    outputViewRefs: React.MutableRefObject<(types.InfoViewRef | null)[]>, 
    inputViewRefs: React.MutableRefObject<(types.InfoViewRef | null)[]>
  ) => {
    outputViewRefs.current.forEach((ref) => {
      if (ref) {
        ref.setToggle(false)
      }
    })

    inputViewRefs.current.forEach((ref) => {
      if (ref) {
        ref.setToggle(false)
      }
    })
  }
