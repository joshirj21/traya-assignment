

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../types/navigation';
import {
  getUserDetailsFromStorage,
  saveUserDetailsToStorage,
} from '../lib/storage';
import { fitnessRepository } from '../repositories/fitnessRepository';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { shadow } from '../theme/shadow';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';

type WeightUnit = 'kg' | 'lbs';

export const LogWeightScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();

  const storedUser = getUserDetailsFromStorage();
  const profileWeightKg = Number(storedUser?.user?.weight);
  const [heightCm, setHeightCm] = useState<number>(() => {
    return storedUser?.user?.height ? Number(storedUser.user.height) : 180;
  });

  const [weightKg, setWeightKg] = useState<number>(() => {
    return storedUser?.user?.weight ? Number(storedUser.user.weight) : 0;
  });
  const weightKgRef = useRef(weightKg);
  const [weightText, setWeightText] = useState<string>(() => {
    const initial = Number(storedUser?.user?.weight);
    return Number.isFinite(initial) && initial > 0 ? initial.toFixed(1) : '';
  });
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isLoadingWeightForDate, setIsLoadingWeightForDate] = useState(false);
  const weightLoadRequestId = useRef(0);
  const [isWeightEditorVisible, setIsWeightEditorVisible] = useState(false);
  const [weightDraft, setWeightDraft] = useState('');
  const [weightInputError, setWeightInputError] = useState<string | null>(null);

  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const [isHeightModalVisible, setIsHeightModalVisible] =
    useState<boolean>(false);
  const [tempHeightInput, setTempHeightInput] = useState<string>(
    String(heightCm),
  );
  const [heightError, setHeightError] = useState<string | null>(null);

  const [isDatePickerModalVisible, setIsDatePickerModalVisible] =
    useState<boolean>(false);

  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDate]);

  const isToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);

  const loadWeightForDate = useCallback(async (date: Date) => {
    const requestId = ++weightLoadRequestId.current;
    setIsLoadingWeightForDate(true);
    setEditingEntryId(null);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingRecords = await fitnessRepository.getMetricHistory(
        'weight',
        {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
        },
      );
      if (requestId !== weightLoadRequestId.current) return;

      if (existingRecords && existingRecords.length > 0) {
        const latestForDay = existingRecords[0];
        const value = Number(latestForDay.value);
        weightKgRef.current = value;
        setWeightKg(value);
        setWeightText(value.toFixed(1));
        setEditingEntryId(latestForDay.source === 'app' ? latestForDay.id : null);
      } else {
        setEditingEntryId(null);
        const suggestedWeight =
          Number.isFinite(profileWeightKg) && profileWeightKg > 0
            ? profileWeightKg
            : 0;
        weightKgRef.current = suggestedWeight;
        setWeightKg(suggestedWeight);
        setWeightText(
          suggestedWeight > 0 ? suggestedWeight.toFixed(1) : '',
        );
      }
    } catch (err) {
      console.warn('Error loading weight for date:', err);
    } finally {
      if (requestId === weightLoadRequestId.current) {
        setIsLoadingWeightForDate(false);
      }
    }
  }, [profileWeightKg]);

  useEffect(() => {
    loadWeightForDate(selectedDate);
  }, [selectedDate, loadWeightForDate]);

  const formatWeightForUnit = (valueKg: number, nextUnit: WeightUnit) =>
    (nextUnit === 'kg' ? valueKg : valueKg * 2.20462).toFixed(1);

  const changeWeightUnit = (nextUnit: WeightUnit) => {
    setUnit(nextUnit);
    const currentWeight = weightKgRef.current;
    setWeightText(
      currentWeight > 0 ? formatWeightForUnit(currentWeight, nextUnit) : '',
    );
  };

  const updateWeightKg = (nextWeight: number) => {
    weightKgRef.current = nextWeight;
    setWeightKg(nextWeight);
    setWeightText(nextWeight > 0 ? formatWeightForUnit(nextWeight, unit) : '');
  };

  const openWeightEditor = () => {
    setWeightDraft(weightText);
    setWeightInputError(null);
    setIsWeightEditorVisible(true);
  };

  const commitWeightDraft = () => {
    const displayedValue = Number(weightDraft);
    const valueKg = unit === 'kg' ? displayedValue : displayedValue / 2.20462;
    if (!Number.isFinite(valueKg) || valueKg <= 0 || valueKg > 300) {
      setWeightInputError('Enter a valid weight between 0 and 300 kg.');
      return;
    }
    weightKgRef.current = valueKg;
    setWeightKg(valueKg);
    setWeightText(displayedValue.toFixed(1));
    setIsWeightEditorVisible(false);
  };

  const bmiData = useMemo(() => {
    if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) {
      return {
        bmi: '—',
        category: 'Enter weight',
        textColor: Colors.muted,
        bgColor: Colors.surfaceContainer,
      };
    }
    const heightInMeters = heightCm / 100;
    const bmiVal = weightKg / (heightInMeters * heightInMeters);
    const roundedBmi = (Math.round(bmiVal * 10) / 10).toFixed(1);

    if (bmiVal < 18.5) {
      return {
        bmi: roundedBmi,
        category: 'Underweight',
        textColor: '#0284C7',
        bgColor: '#E0F2FE',
      };
    } else if (bmiVal < 25) {
      return {
        bmi: roundedBmi,
        category: 'Normal',
        textColor: Colors.onSuccessContainer,
        bgColor: Colors.successContainer,
      };
    } else if (bmiVal < 30) {
      return {
        bmi: roundedBmi,
        category: 'Overweight',
        textColor: Colors.onWarningContainer,
        bgColor: Colors.warningContainer,
      };
    } else {
      return {
        bmi: roundedBmi,
        category: 'Obese',
        textColor: Colors.onErrorContainer,
        bgColor: Colors.errorContainer,
      };
    }
  }, [weightKg, heightCm]);

  const handleDecrement = () => {
    if (unit === 'kg') {
      const next = Math.max(
        20,
        Math.round((weightKgRef.current - 0.5) * 10) / 10,
      );
      updateWeightKg(next);
    } else {
      const currentLbs = weightKgRef.current * 2.20462;
      const newLbs = Math.max(44, currentLbs - 1);
      const next = Math.round((newLbs / 2.20462) * 10) / 10;
      updateWeightKg(next);
    }
  };

  const handleIncrement = () => {
    if (unit === 'kg') {
      const next = Math.min(
        300,
        Math.round((weightKgRef.current + 0.5) * 10) / 10,
      );
      updateWeightKg(next);
    } else {
      const currentLbs = weightKgRef.current * 2.20462;
      const newLbs = Math.min(660, currentLbs + 1);
      const next = Math.round((newLbs / 2.20462) * 10) / 10;
      updateWeightKg(next);
    }
  };

  const handlePrevDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const handleSetToday = () => {
    setSelectedDate(new Date());
    setIsDatePickerModalVisible(false);
  };

  const handleSaveWeight = async () => {
    if (isLoadingWeightForDate) return;
    if (
      !Number.isFinite(Number(weightText)) ||
      !Number.isFinite(weightKg) ||
      weightKg <= 0 ||
      weightKg > 300
    ) {
      Alert.alert('Enter a valid weight before saving.');
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const targetWeightKg = Math.round(weightKg * 10) / 10;
      const isoTimestamp = selectedDate.toISOString();

      if (editingEntryId) {
        await fitnessRepository.updateWeight(
          editingEntryId,
          targetWeightKg,
          isoTimestamp,
        );
      } else {
        await fitnessRepository.addWeight(targetWeightKg, 'kg', isoTimestamp);
      }

      const user = getUserDetailsFromStorage()?.user;
      if (user) {
        saveUserDetailsToStorage({
          user: { ...user, weight: targetWeightKg, height: heightCm },
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save weight');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveHeight = () => {
    const parsed = parseFloat(tempHeightInput);
    if (isNaN(parsed) || parsed < 50 || parsed > 250) {
      setHeightError('Please enter a valid height between 50 and 250 cm');
      return;
    }

    setHeightCm(parsed);
    const user = getUserDetailsFromStorage()?.user;
    if (user) {
      saveUserDetailsToStorage({ user: { ...user, height: parsed } });
    }
    setIsHeightModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back to Home"
        >
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>

        <View style={styles.syncBadge}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>Synced</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.titleSection}>
          <View style={styles.titleLeft}>
            <Text style={styles.screenTitle}>Log Weight</Text>
            <Text style={styles.screenSubtitle}>
              Record weight and auto-track BMI
            </Text>
          </View>

          <TouchableOpacity
            style={styles.heightBadge}
            onPress={() => {
              setTempHeightInput(String(heightCm));
              setHeightError(null);
              setIsHeightModalVisible(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Height: ${heightCm} cm. Tap to edit.`}
          >
            <Text style={styles.heightLabel}>Height:</Text>
            <Text style={styles.heightValue}>{heightCm} cm</Text>
            <View style={styles.editPill}>
              <Text style={styles.editPillText}>Edit</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.mainCard}>

          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderTitle}>RECORD WEIGHT</Text>
          </View>

          <View style={styles.labelAndUnitRow}>
            <Text style={styles.targetWeightLabel}>MEASUREMENT VALUE</Text>

            <View style={styles.unitToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.unitPill,
                  unit === 'kg' && styles.unitPillActive,
                ]}
                onPress={() => changeWeightUnit('kg')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.unitPillText,
                    unit === 'kg' && styles.unitPillTextActive,
                  ]}
                >
                  kg
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.unitPill,
                  unit === 'lbs' && styles.unitPillActive,
                ]}
                onPress={() => changeWeightUnit('lbs')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.unitPillText,
                    unit === 'lbs' && styles.unitPillTextActive,
                  ]}
                >
                  lbs
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={handleDecrement}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Decrease weight"
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>

            <View style={styles.weightValueContainer}>
              <TouchableOpacity
                onPress={openWeightEditor}
                accessibilityRole="button"
                accessibilityLabel={`Edit weight, ${weightText || 'not set'} ${unit}`}
              >
                <Text style={styles.weightValueBig}>{weightText || '—'}</Text>
              </TouchableOpacity>
              <Text style={styles.weightUnitText}>{unit}</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperButton}
              onPress={handleIncrement}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Increase weight"
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.baselineText}>Baseline: {heightCm} cm</Text>

          <View style={styles.bmiCard}>
            <View
              style={[
                styles.bmiStatusDot,
                { backgroundColor: bmiData.textColor },
              ]}
            />
            <Text style={styles.bmiLabelText}>
              Calculated BMI:{' '}
              <Text
                style={[styles.bmiValueHighlight, { color: bmiData.textColor }]}
              >
                {bmiData.bmi}
              </Text>
            </Text>
            <View
              style={[
                styles.bmiCategoryBadge,
                { backgroundColor: bmiData.bgColor },
              ]}
            >
              <Text
                style={[styles.bmiCategoryText, { color: bmiData.textColor }]}
              >
                {bmiData.category}
              </Text>
            </View>
          </View>

          <View style={styles.dateSection}>
            <Text style={styles.dateSectionLabel}>DATE OF MEASUREMENT</Text>

            <View style={styles.dateCard}>
              <TouchableOpacity
                style={styles.dateArrowButton}
                onPress={handlePrevDay}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Previous day"
              >
                <Text style={styles.dateArrowText}>‹</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateCenterContent}
                onPress={() => setIsDatePickerModalVisible(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Selected date: ${formattedDate}. Tap to change.`}
              >
                <Text style={styles.dateStringText}>{formattedDate}</Text>
                {isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Today</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateArrowButton}
                onPress={handleNextDay}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Next day"
              >
                <Text style={styles.dateArrowText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saveSuccess && styles.saveButtonSuccess]}
            onPress={handleSaveWeight}
            disabled={isSaving || isLoadingWeightForDate}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Save weight measurement"
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : isLoadingWeightForDate ? (
              <Text style={styles.saveButtonText}>Loading measurement…</Text>
            ) : saveSuccess ? (
              <Text style={styles.saveButtonText}>Saved</Text>
            ) : (
              <Text style={styles.saveButtonText}>Save Weight</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isWeightEditorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsWeightEditorVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsWeightEditorVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit weight</Text>
                <Text style={styles.modalSubtitle}>
                  Enter the measurement for {formattedDate}.
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={weightDraft}
                    onChangeText={setWeightDraft}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    accessibilityLabel={`Weight in ${unit}`}
                    selectTextOnFocus
                    autoFocus
                  />
                  <Text style={styles.inputUnit}>{unit}</Text>
                </View>
                {weightInputError ? (
                  <Text style={styles.errorText}>{weightInputError}</Text>
                ) : null}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsWeightEditorVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={commitWeightDraft}
                    accessibilityRole="button"
                    accessibilityLabel="Save weight value"
                  >
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isHeightModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsHeightModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsHeightModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Update Baseline Height</Text>
                <Text style={styles.modalSubtitle}>
                  Set your height in centimeters (cm) for accurate BMI tracking.
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={tempHeightInput}
                    onChangeText={val => {
                      setTempHeightInput(val);
                      if (heightError) setHeightError(null);
                    }}
                    keyboardType="numeric"
                    placeholder="180"
                    placeholderTextColor={Colors.muted}
                    autoFocus
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>

                {heightError ? (
                  <Text style={styles.errorText}>{heightError}</Text>
                ) : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsHeightModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveModalBtn}
                    onPress={handleSaveHeight}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveModalBtnText}>Save Height</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isDatePickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDatePickerModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsDatePickerModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Measurement Date</Text>
                <Text style={styles.modalSubtitle}>
                  Choose a date to record or view your weight measurement.
                </Text>

                <View style={styles.quickDateList}>
                  <TouchableOpacity
                    style={styles.quickDateButton}
                    onPress={handleSetToday}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickDateText}>Today</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickDateButton}
                    onPress={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      setSelectedDate(y);
                      setIsDatePickerModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickDateText}>Yesterday</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickDateButton}
                    onPress={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 2);
                      setSelectedDate(d);
                      setIsDatePickerModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickDateText}>2 Days Ago</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickDateButton}
                    onPress={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      setSelectedDate(d);
                      setIsDatePickerModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickDateText}>1 Week Ago</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setIsDatePickerModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.spaceSm,
    paddingBottom: spacing.spaceXs,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: rounded.base,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
    gap: 6,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  syncText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 11,
    color: Colors.onSuccessContainer,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceLg,
  },
  titleLeft: {
    flex: 1,
  },
  screenTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  heightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.base,
    gap: 5,
    ...shadow.subtle,
  },
  heightLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  heightValue: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 12,
    color: Colors.onSurface,
  },
  editPill: {
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.xs,
    marginLeft: 2,
  },
  editPillText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 10,
    color: Colors.onSurface,
  },

  mainCard: {
    backgroundColor: Colors.surface,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.spaceLg,
    ...shadow.subtle,
  },
  cardHeader: {
    marginBottom: spacing.spaceSm,
  },
  cardHeaderTitle: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  labelAndUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceMd,
  },
  targetWeightLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  unitToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: rounded.full,
    padding: 2,
  },
  unitPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  unitPillActive: {
    backgroundColor: Colors.primary,
  },
  unitPillText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  unitPillTextActive: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: Colors.onPrimary,
  },

  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.spaceLg,
    marginVertical: spacing.spaceSm,
  },
  stepperButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperButtonText: {
    color: Colors.onSurface,
    fontSize: 22,
    fontWeight: fontWeight.bold,
    lineHeight: 26,
  },
  weightValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  weightValueBig: {
    width: 132,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 48,
    color: Colors.onSurface,
    letterSpacing: -1,
    textAlign: 'center',
  },
  weightUnitText: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 18,
    color: Colors.onSurfaceVariant,
  },
  baselineText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: spacing.spaceMd,
  },

  bmiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: rounded.base,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: spacing.spaceLg,
  },
  bmiStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bmiLabelText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    color: Colors.onSurface,
  },
  bmiValueHighlight: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 13,
  },
  bmiCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
  },
  bmiCategoryText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 11,
  },

  dateSection: {
    marginBottom: spacing.spaceLg,
  },
  dateSectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: spacing.spaceXs,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: rounded.base,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  dateArrowButton: {
    width: 32,
    height: 32,
    borderRadius: rounded.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowText: {
    fontSize: 22,
    color: Colors.onSurface,
    fontWeight: fontWeight.bold,
    lineHeight: 24,
  },
  dateCenterContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dateStringText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  todayBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.xs,
  },
  todayBadgeText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 10,
    color: Colors.onSurface,
  },

  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: rounded.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonSuccess: {
    backgroundColor: Colors.success,
  },
  saveButtonText: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 14,
    color: Colors.onPrimary,
    letterSpacing: 0.2,
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
  saveModalBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: rounded.base,
  },
  saveModalBtnText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  quickDateList: {
    gap: 8,
    marginBottom: spacing.spaceMd,
  },
  quickDateButton: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: rounded.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickDateText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 13,
    color: Colors.onSurface,
  },
  closeModalBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});

export default LogWeightScreen;
