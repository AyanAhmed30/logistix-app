import { ReactNode, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleProp,
  TextProps,
  TextStyle,
} from 'react-native';

type FloatTextProps = TextProps & {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  /** How far the text lifts on hover (px). */
  lift?: number;
};

/**
 * Text that gently floats upward on hover (web) / press-in (native).
 */
export function FloatText({ children, style, lift = 5, ...rest }: FloatTextProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const setFloating = (floating: boolean) => {
    Animated.spring(translateY, {
      toValue: floating ? -lift : 0,
      friction: 7,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.Text
      {...rest}
      {...(Platform.OS === 'web'
        ? {
            onMouseEnter: () => setFloating(true),
            onMouseLeave: () => setFloating(false),
          }
        : {
            onPressIn: () => setFloating(true),
            onPressOut: () => setFloating(false),
          })}
      style={[
        style,
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as TextStyle) : null,
        { transform: [{ translateY }] },
      ]}
    >
      {children}
    </Animated.Text>
  );
}
