import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, ImageSourcePropType, StyleSheet, View } from 'react-native';

const cargoShip = require('../../../assets/backgrounds/auth-cargo-ship.jpg');

type AuthLogisticsBackgroundProps = {
  /** Defaults to cargo ship (auth). Home can pass the port truck image. */
  source?: ImageSourcePropType;
};

/**
 * Logistics photo backdrop with soft overlays for readable UI.
 */
export function AuthLogisticsBackground({
  source = cargoShip,
}: AuthLogisticsBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={source}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.photo}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(12, 40, 70, 0.45)', 'rgba(12, 40, 70, 0.18)', 'transparent']}
          locations={[0, 0.22, 0.42]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', 'rgba(8, 28, 48, 0.25)', 'rgba(8, 28, 48, 0.5)']}
          locations={[0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', 'rgba(255, 170, 80, 0.12)', 'transparent']}
          start={{ x: 0, y: 0.15 }}
          end={{ x: 1, y: 0.85 }}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: '100%',
  },
});
