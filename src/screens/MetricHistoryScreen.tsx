

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { RootNavigationProp, RootStackParamList } from '../types/navigation';
import { fitnessRepository } from '../repositories/fitnessRepository';
import { metricsService } from '../services/metricsService';
import { DailyAggregateResult, FitnessMetricEntity } from '../database/types';
import { MetricType } from '../mockHealthKit/types';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { shadow } from '../theme/shadow';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';

type MetricHistoryRouteProp = RouteProp<RootStackParamList, 'MetricHistory'>;

type Period = '7_days' | '30_days' | '3_months';

const PERIOD_OPTIONS: { label: string; value: Period; days: number }[] = [
  { label: '7D', value: '7_days', days: 7 },
  { label: '30D', value: '30_days', days: 30 },
  { label: '3M', value: '3_months', days: 90 },
];

const MAX_BAR_HEIGHT = 120;
const BAR_WIDTH = 28;
const BAR_GAP = 6;

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const formatIso = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatValue = (value: number, unit: string, metricId: string): string => {
  if (metricId === 'sleep') {
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }
  if (metricId === 'water') return `${value.toFixed(1)} ${unit}`;
  if (metricId === 'weight') return `${value.toFixed(1)} ${unit}`;
  return `${Math.round(value)} ${unit}`;
};

export const MetricHistoryScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<MetricHistoryRouteProp>();
  const { metricId, metricTitle, unit = '' } = route.params;
  const metricType = metricId.replace(/^metric_/, '') as MetricType;
  const isWeight = metricType === 'weight';

  const [period, setPeriod] = useState<Period>('30_days');
  const [aggregates, setAggregates] = useState<DailyAggregateResult[]>([]);
  const [weightEntries, setWeightEntries] = useState<FitnessMetricEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const loadRequestId = useRef(0);

  const loadData = useCallback(async (p: Period) => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setSelectedBar(null);
    setHistoryError(null);

    const days = PERIOD_OPTIONS.find(o => o.value === p)!.days;
    const endDate = new Date().toISOString();
    const startDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    try {
      const cached = await fitnessRepository.getDailyAggregates(
        metricType,
        startDate,
        endDate,
      );
      if (requestId !== loadRequestId.current) return;
      setAggregates(cached);

      if (isWeight) {
        const entries = await fitnessRepository.getMetricHistory('weight', {
          limit: 60,
        });
        if (requestId !== loadRequestId.current) return;
        setWeightEntries(
          [...entries].sort(
            (a, b) =>
              new Date(b.start_time).getTime() -
              new Date(a.start_time).getTime(),
          ),
        );
      }
    } catch (cacheErr) {
      console.warn('MetricHistoryScreen SQLite read error:', cacheErr);
      if (requestId === loadRequestId.current) {
        setHistoryError('Saved history could not be read.');
      }
    } finally {

      if (requestId === loadRequestId.current) setLoading(false);
    }

    metricsService
      .getMetricHistory(metricType, p)
      .then(async freshAggs => {

        fitnessRepository
          .persistHistoryFromBackend(metricType, freshAggs)
          .catch(err => console.warn('History persist error:', err));

        if (requestId !== loadRequestId.current) return;

        setAggregates(freshAggs);
        setHistoryError(null);

        if (isWeight) {
          try {
            const refreshed = await fitnessRepository.getMetricHistory(
              'weight',
              { limit: 60 },
            );
            if (requestId !== loadRequestId.current) return;
            setWeightEntries(
              [...refreshed].sort(
                (a, b) =>
                  new Date(b.start_time).getTime() -
                  new Date(a.start_time).getTime(),
              ),
            );
          } catch (err) {
            console.warn('Weight entries refresh error:', err);
          }
        }
      })
      .catch(err => {

        console.warn(
          'MetricHistoryScreen background backend fetch failed (offline?):',
          err?.message ?? err,
        );
        if (requestId === loadRequestId.current) {
          setHistoryError('Could not refresh history. Showing saved data.');
        }
      });
  }, [metricId, metricType, isWeight]);

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  const handleDeleteWeight = useCallback(
    (entry: FitnessMetricEntity) => {
      Alert.alert(
        'Delete Entry',
        `Remove ${entry.value.toFixed(1)} kg on ${formatIso(entry.start_time)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await fitnessRepository.deleteWeight(entry.id);

                await loadData(period);
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Could not delete entry');
              }
            },
          },
        ],
      );
    },
    [loadData, period],
  );

  const maxValue = aggregates.reduce(
    (m, a) => Math.max(m, a.value),
    0,
  );

  const barHeight = (value: number): number => {
    if (maxValue <= 0 || value <= 0) return 0;
    return (value / maxValue) * MAX_BAR_HEIGHT;
  };

  const formatAxisDate = (dateStr: string, index: number): string => {
    const date = new Date(`${dateStr}T00:00:00`);
    const previous =
      index > 0 ? new Date(`${aggregates[index - 1].date}T00:00:00`) : null;
    const showMonth =
      !previous ||
      date.getMonth() !== previous.getMonth() ||
      date.getFullYear() !== previous.getFullYear();
    return showMonth
      ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : String(date.getDate());
  };

  const renderEmpty = () => (
    <View style={styles.emptyChart}>
      <Text style={styles.emptyText}>
        {historyError || 'No data for this period'}
      </Text>
      {historyError ? (
        <TouchableOpacity
          onPress={() => loadData(period)}
          accessibilityRole="button"
          accessibilityLabel="Retry loading history"
        >
          <Text style={styles.retryHistoryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderWeightEntry = ({ item, index }: { item: FitnessMetricEntity; index: number }) => (
    <View style={[styles.entryRow, index === 0 && styles.entryRowFirst]}>
      <View style={styles.entryLeft}>
        <Text style={styles.entryDate}>{formatIso(item.start_time)}</Text>
        <Text style={styles.entrySource}>{item.source}</Text>
      </View>
      <Text style={styles.entryValue}>
        {item.value.toFixed(1)} {item.unit}
      </Text>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDeleteWeight(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Delete weight entry ${item.value.toFixed(1)} kg`}
      >
        <Text style={styles.deleteBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.screenTitle} numberOfLines={1}>
          {metricTitle}
        </Text>

        {isWeight ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('LogWeight')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Log or edit weight"
          >
            <Text style={styles.editIcon}>✎</Text>
          </TouchableOpacity>
        ) : (
          null
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.periodTab,
                period === opt.value && styles.periodTabActive,
              ]}
              onPress={() => setPeriod(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodTabText,
                  period === opt.value && styles.periodTabTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {metricTitle.toUpperCase()} HISTORY
          </Text>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : aggregates.length === 0 ? (
            renderEmpty()
          ) : (
            <>

              {selectedBar !== null && aggregates[selectedBar] && (
                <View style={styles.selectedLabel}>
                  <Text style={styles.selectedLabelDate}>
                    {formatDate(aggregates[selectedBar].date)}
                  </Text>
                  <Text style={styles.selectedLabelValue}>
                    {formatValue(
                      aggregates[selectedBar].value,
                      aggregates[selectedBar].unit,
                      metricType,
                    )}
                  </Text>
                </View>
              )}
              {historyError ? (
                <View style={styles.historyNoticeRow}>
                  <Text style={styles.historyNotice}>{historyError}</Text>
                  <TouchableOpacity
                    onPress={() => loadData(period)}
                    accessibilityRole="button"
                    accessibilityLabel="Retry refreshing history"
                  >
                    <Text style={styles.retryHistoryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.barsContainer}
              >
                {aggregates.map((agg, i) => (
                  <TouchableOpacity
                    key={agg.date}
                    style={styles.barColumn}
                    onPress={() =>
                      setSelectedBar(prev => (prev === i ? null : i))
                    }
                    activeOpacity={0.8}
                  >

                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: barHeight(agg.value),
                            backgroundColor:
                              selectedBar === i
                                ? Colors.primary
                                : Colors.primaryContainer,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.barLabel} numberOfLines={1}>
                      {formatAxisDate(agg.date, i)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.yAxisHint}>
                0 baseline · Max: {formatValue(maxValue, aggregates[0]?.unit ?? unit, metricType)}
              </Text>
            </>
          )}
        </View>

        {isWeight && (
          <View style={styles.entriesCard}>
            <Text style={styles.chartTitle}>WEIGHT LOG</Text>

            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : weightEntries.length === 0 ? (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyText}>No weight entries yet</Text>
                <TouchableOpacity
                  style={styles.addFirstBtn}
                  onPress={() => navigation.navigate('LogWeight')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addFirstBtnText}>Log First Entry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={weightEntries}
                keyExtractor={item => item.id}
                renderItem={renderWeightEntry}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View style={styles.separator} />
                )}
              />
            )}
          </View>
        )}
      </ScrollView>
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
  screenTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 17,
    color: Colors.onSurface,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: rounded.base,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: 17,
    color: Colors.onSurface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
    gap: spacing.spaceMd,
  },

  periodRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: rounded.full,
    padding: 3,
    alignSelf: 'center',
  },
  periodTab: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: rounded.full,
  },
  periodTabActive: {
    backgroundColor: Colors.surface,
    ...shadow.subtle,
  },
  periodTabText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  periodTabTextActive: {
    color: Colors.onSurface,
    fontWeight: fontWeight.semiBold,
  },

  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.spaceLg,
    ...shadow.subtle,
  },
  chartTitle: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: spacing.spaceMd,
  },
  loaderWrap: {
    height: MAX_BAR_HEIGHT + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChart: {
    height: MAX_BAR_HEIGHT + 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.spaceSm,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: Colors.muted,
  },
  retryHistoryText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  historyNotice: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  historyNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
    gap: spacing.spaceSm,
  },
  addFirstBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: rounded.base,
    marginTop: spacing.spaceXs,
  },
  addFirstBtnText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 13,
    color: Colors.onPrimary,
  },

  selectedLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 6,
    marginBottom: spacing.spaceMd,
  },
  selectedLabelDate: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  selectedLabelValue: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 14,
    color: Colors.primary,
  },

  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: spacing.spaceXs,
    minHeight: MAX_BAR_HEIGHT + 24,
  },
  barColumn: {
    width: BAR_WIDTH + 14,
    marginRight: BAR_GAP - 2,
    alignItems: 'center',
  },
  barTrack: {
    width: BAR_WIDTH,
    height: MAX_BAR_HEIGHT,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: rounded.xs,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: rounded.xs,
  },
  barLabel: {
    width: BAR_WIDTH + 14,
    fontFamily: fontFamily.regular,
    fontSize: 9,
    color: Colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  yAxisHint: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: Colors.muted,
    marginTop: spacing.spaceSm,
    textAlign: 'right',
  },

  entriesCard: {
    backgroundColor: Colors.surface,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.spaceLg,
    ...shadow.subtle,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.spaceSm,
  },
  entryRowFirst: {
    paddingTop: 0,
  },
  entryLeft: {
    flex: 1,
  },
  entryDate: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 13,
    color: Colors.onSurface,
  },
  entrySource: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  entryValue: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 15,
    color: Colors.onSurface,
    marginRight: spacing.spaceMd,
  },
  deleteBtn: {
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.sm,
  },
  deleteBtnText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 11,
    color: Colors.onErrorContainer,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
});

export default MetricHistoryScreen;
