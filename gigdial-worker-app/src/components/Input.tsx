import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  error?: string;
}

export default function Input({ label, iconName, error, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
      <View style={[
        styles.inputWrapper,
        error ? styles.inputErrorBorder : null,
        props.multiline ? styles.multilineWrapper : null
      ]}>
        {iconName && !props.multiline ? (
          <Ionicons name={iconName} size={20} color="#9CA3AF" style={styles.icon} />
        ) : null}
        <TextInput
          style={[
            styles.input,
            props.multiline ? styles.multilineInput : null,
            style
          ]}
          placeholderTextColor="#9CA3AF"
          {...props}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F2C59',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8EC',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  multilineWrapper: {
    height: 100,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 15,
    height: '100%',
  },
  multilineInput: {
    height: '100%',
    textAlignVertical: 'top',
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
