import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const FilterChip = ({ label, selected, onPress }: FilterChipProps) => {
  return (
    <TouchableOpacity
      style={[styles.container, selected ? styles.selectedContainer : styles.unselectedContainer]}
      onPress={onPress}>
      <Text
        style={[styles.label, selected ? styles.selectedLabel : styles.unselectedLabel]}
        numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  selectedContainer: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unselectedContainer: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectedLabel: {
    color: '#fff',
  },
  unselectedLabel: {
    color: colors.text,
  },
});

export default FilterChip;
