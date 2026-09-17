import { Platform, type TextStyle } from 'react-native';

/** Removes browser default black focus outline on web inputs. */
export const webNoFocusRing: TextStyle | undefined =
  Platform.OS === 'web'
    ? ({
        // RN Web accepts these; cast keeps TS happy with TextStyle.
        outlineWidth: 0,
        outlineColor: 'transparent',
      } as TextStyle)
    : undefined;
