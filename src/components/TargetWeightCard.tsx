import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { shadow } from '../theme/shadow';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';
import { WeightGoal } from '../types/metrics';

interface TargetWeightCardProps {
  goal: WeightGoal;
  onUpdateTarget?: (newTarget: number) => void;
}

export const TargetWeightCard: React.FC<TargetWeightCardProps> = ({
  goal,
  onUpdateTarget,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [targetInput, setTargetInput] = useState(goal.targetWeight.toString());
  const [inputError, setInputError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setTargetInput(goal.targetWeight.toString());
    setInputError(null);
    setModalVisible(true);
  };

  const handleSave = () => {
    const parsed = parseFloat(targetInput);
    if (isNaN(parsed) || parsed < 20 || parsed > 300) {
      setInputError('Please enter a valid weight between 20 and 300 kg');
      return;
    }

    if (onUpdateTarget) {
      onUpdateTarget(Math.round(parsed * 10) / 10);
    }
    setModalVisible(false);
  };

  return (
    <>
      <View style={styles.card}>

        <View style={styles.header}>
          <Text style={styles.sectionLabel}>TARGET WEIGHT</Text>
          <View style={styles.activeBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.activeBadgeText}>Active Target</Text>
          </View>
        </View>

        <View style={styles.contentRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Target Value</Text>
            <View style={styles.valueRow}>
              <Text style={styles.targetValue}>
                {goal.targetWeight.toFixed(1)}
              </Text>
              <Text style={styles.unitText}>kg</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Target Set Date</Text>
            <Text style={styles.dateValue}>{goal.targetSetDate}</Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={handleOpenModal}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Edit target weight"
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Update Target Weight</Text>
                <Text style={styles.modalSubtitle}>
                  Set your desired target weight in kilograms (kg).
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={targetInput}
                    onChangeText={val => {
                      setTargetInput(val);
                      if (inputError) setInputError(null);
                    }}
                    keyboardType="decimal-pad"
                    placeholder="70.0"
                    placeholderTextColor={Colors.muted}
                    autoFocus
                  />
                  <Text style={styles.inputUnit}>kg</Text>
                </View>

                {inputError ? (
                  <Text style={styles.errorText}>{inputError}</Text>
                ) : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveBtnText}>Save Target</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: spacing.spaceMd,
    ...shadow.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
  },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  activeBadgeText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 11,
    color: Colors.onSuccessContainer,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  targetValue: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.onSurface,
  },
  unitText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginHorizontal: spacing.spaceSm,
  },
  dateValue: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 13,
    lineHeight: 24,
    color: Colors.onSurface,
  },
  editButton: {
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editButtonText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 12,
    color: Colors.onSurface,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: rounded.xl,
    padding: spacing.spaceLg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadow.medium,
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 18,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginBottom: spacing.spaceMd,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: rounded.base,
    paddingHorizontal: spacing.spaceMd,
    height: 48,
    marginBottom: spacing.spaceSm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 18,
    color: Colors.onSurface,
  },
  inputUnit: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginLeft: 4,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: Colors.error,
    marginBottom: spacing.spaceSm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceSm,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: rounded.base,
  },
  cancelBtnText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: rounded.base,
  },
  saveBtnText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
});

export default TargetWeightCard;
