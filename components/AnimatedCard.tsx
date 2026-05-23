import React from 'react';
import { TouchableWithoutFeedback, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedCardProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  activeScale?: number;
  disabled?: boolean;
}

export default function AnimatedCard({
  onPress,
  style,
  children,
  activeScale = 0.96,
  disabled = false,
}: AnimatedCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(activeScale, {
      damping: 15,
      stiffness: 300,
      mass: 0.5,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
      mass: 0.5,
    });
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
