/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#007aff';
const tintColorDark = '#0a84ff';

export const Colors = {
  light: {
    text: '#1d1d1f',
    background: '#f2f2f7',
    tint: tintColorLight,
    icon: '#8e8e93',
    tabIconDefault: '#8e8e93',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#f5f5f7',
    background: '#000000',
    tint: tintColorDark,
    icon: '#8e8e93',
    tabIconDefault: '#8e8e93',
    tabIconSelected: tintColorDark,
  },
};
