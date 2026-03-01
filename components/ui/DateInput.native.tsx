import { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/constants/theme';

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  style?: object;
};

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DateInput({ value, onChange, style }: Props) {
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState(new Date(2000, 0, 1));

  return (
    <>
      <TouchableOpacity style={[styles.input, style]} onPress={() => setShow(true)}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDate(value) : 'Date of birth'}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={value ?? temp}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_, date) => {
            setShow(false);
            if (date) onChange(date);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.done}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value ?? temp}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  if (date) {
                    onChange(date);
                    setTemp(date);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.divider,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  value: { fontSize: 16, color: colors.ink },
  placeholder: { fontSize: 16, color: colors.inkGhost },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  done: { color: colors.purple, fontSize: 17, fontWeight: '600' },
});
