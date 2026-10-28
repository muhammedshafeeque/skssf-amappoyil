import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { MEMBER_ID_PREFIX } from '@skamp/shared';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>{MEMBER_ID_PREFIX} — SKSSF Amappoyil</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
