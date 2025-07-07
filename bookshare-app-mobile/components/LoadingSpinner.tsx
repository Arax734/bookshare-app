import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

export default function LoadingSpinner() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View className="absolute inset-0 flex-1 items-center justify-center bg-white">
      <Animated.View style={[animatedStyle, { width: 96, height: 96 }]}>
        <Image
          source={require('../assets/bookshare-logo2.svg')}
          contentFit="contain"
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}
