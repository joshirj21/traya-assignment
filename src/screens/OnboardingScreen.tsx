import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';
import { RootNavigationProp } from '../types/navigation';
import { userService } from '../services/userService';
import { ApiError } from '../types/api';
import { saveUserDetailsToStorage } from '../lib/storage';

interface FormErrors {
  name?: string;
  age?: string;
  weight?: string;
  height?: string;
}

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bmiInfo = useMemo(() => {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (
      isNaN(weightNum) ||
      isNaN(heightNum) ||
      weightNum <= 0 ||
      heightNum <= 0
    ) {
      return null;
    }

    const heightInMeters = heightNum / 100;
    if (heightInMeters <= 0) return null;

    const bmi = weightNum / (heightInMeters * heightInMeters);

    let category = 'Normal';
    let categoryColor: string = Colors.success;
    let badgeBg: string = Colors.successContainer;

    if (bmi < 18.5) {
      category = 'Underweight';
      categoryColor = Colors.secondary;
      badgeBg = Colors.surfaceContainer;
    } else if (bmi >= 18.5 && bmi < 25) {
      category = 'Normal weight';
      categoryColor = Colors.success;
      badgeBg = Colors.successContainer;
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Overweight';
      categoryColor = Colors.warning;
      badgeBg = Colors.warningContainer;
    } else {
      category = 'Obese';
      categoryColor = Colors.error;
      badgeBg = Colors.errorContainer;
    }

    return {
      bmi: bmi.toFixed(1),
      category,
      categoryColor,
      badgeBg,
    };
  }, [weight, height]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter your name';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const ageNum = parseInt(age.trim(), 10);
    if (!age.trim()) {
      newErrors.age = 'Please enter your age';
    } else if (isNaN(ageNum) || ageNum < 12 || ageNum > 120) {
      newErrors.age = 'Age must be between 12 and 120';
    }

    const weightNum = parseFloat(weight);
    if (!weight.trim()) {
      newErrors.weight = 'Please enter your weight';
    } else if (isNaN(weightNum) || weightNum <= 0) {
      newErrors.weight = 'Please enter a valid weight';
    } else if (weightNum < 20 || weightNum > 400) {
      newErrors.weight = 'Weight must be between 20 kg and 400 kg';
    }

    const heightNum = parseFloat(height);
    if (!height.trim()) {
      newErrors.height = 'Please enter your height';
    } else if (isNaN(heightNum) || heightNum <= 0) {
      newErrors.height = 'Please enter a valid height';
    } else if (heightNum < 60 || heightNum > 260) {
      newErrors.height = 'Height must be between 60 cm and 260 cm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {

      const response = await userService.updateUserDetails({
        name: name.trim(),
        age: parseInt(age.trim(), 10),
        weight: parseFloat(weight.trim()),
        height: parseFloat(height.trim()),
      });

      saveUserDetailsToStorage(response.data);

      navigation.replace('Homepage');
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to save profile details. Please try again.';
      Alert.alert('Onboarding Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 1 of 1</Text>
            <Text style={styles.title}>Basic Information</Text>
            <Text style={styles.subtitle}>
              Enter your details to calculate calorie targets, BMI, and daily
              activity benchmarks.
            </Text>
          </View>

          <View style={styles.card}>

            <AppTextInput
              label="Full Name"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChangeText={text => {
                setName(text);
                if (errors.name)
                  setErrors(prev => ({ ...prev, name: undefined }));
              }}
              error={errors.name}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />

            <AppTextInput
              label="Age"
              placeholder="e.g. 28"
              value={age}
              onChangeText={text => {
                setAge(text);
                if (errors.age)
                  setErrors(prev => ({ ...prev, age: undefined }));
              }}
              error={errors.age}
              keyboardType="number-pad"
              maxLength={3}
              returnKeyType="next"
              rightAccessory={<Text style={styles.unitSuffix}>yrs</Text>}
            />

            <AppTextInput
              label="Weight"
              placeholder="e.g. 70.5"
              value={weight}
              onChangeText={text => {
                setWeight(text);
                if (errors.weight)
                  setErrors(prev => ({ ...prev, weight: undefined }));
              }}
              error={errors.weight}
              keyboardType="decimal-pad"
              returnKeyType="next"
              rightAccessory={<Text style={styles.unitSuffix}>kg</Text>}
            />

            <AppTextInput
              label="Height"
              placeholder="e.g. 175"
              value={height}
              onChangeText={text => {
                setHeight(text);
                if (errors.height)
                  setErrors(prev => ({ ...prev, height: undefined }));
              }}
              error={errors.height}
              keyboardType="decimal-pad"
              returnKeyType="done"
              rightAccessory={<Text style={styles.unitSuffix}>cm</Text>}
            />

            {bmiInfo ? (
              <View style={styles.bmiCard}>
                <View style={styles.bmiHeader}>
                  <Text style={styles.bmiLabel}>Estimated BMI</Text>
                  <View
                    style={[
                      styles.bmiBadge,
                      { backgroundColor: bmiInfo.badgeBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bmiCategoryText,
                        { color: bmiInfo.categoryColor },
                      ]}
                    >
                      {bmiInfo.category}
                    </Text>
                  </View>
                </View>
                <View style={styles.bmiValueRow}>
                  <Text style={styles.bmiValue}>{bmiInfo.bmi}</Text>
                  <Text style={styles.bmiSubtext}>
                    kg/m² • Healthy range 18.5 – 24.9
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <AppButton
              title="Continue"
              onPress={handleSubmit}
              loading={isSubmitting}
            />
            <Text style={styles.disclaimer}>
              You can adjust your profile information anytime in Settings.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.spaceLg,
    paddingBottom: spacing.spaceXl,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: spacing.spaceLg,
  },
  stepLabel: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginBottom: spacing.spaceXs,
    letterSpacing: -0.1,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 26,
    lineHeight: 32,
    color: Colors.onSurface,
    marginBottom: spacing.spaceXs + 2,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: spacing.spaceLg,
  },
  unitSuffix: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 4,
  },
  bmiCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: rounded.base,
    padding: spacing.spaceMd,
    marginTop: spacing.spaceXs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bmiLabel: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  bmiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.sm,
  },
  bmiCategoryText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
  },
  bmiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.spaceSm,
    marginTop: 2,
  },
  bmiValue: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 22,
    color: Colors.onSurface,
  },
  bmiSubtext: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  footer: {
    marginTop: spacing.spaceMd,
  },
  disclaimer: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: spacing.spaceSm + 4,
  },
});

export default OnboardingScreen;
