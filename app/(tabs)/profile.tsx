import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE } from '../../constants/theme';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
});
