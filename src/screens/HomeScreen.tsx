import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ExternalSourcesCard,
  GoalProgressCard,
  MetricCard,
  TargetWeightCard,
  TimelineFilter,
} from '../components';
import {
  getUserDetailsFromStorage,
  isHealthKitConnectedInStorage,
  setHealthKitConnectedInStorage,
} from '../lib/storage';
import { healthSyncManager } from '../health';
import { fitnessRepository } from '../repositories/fitnessRepository';
import { metricsService } from '../services/metricsService';
import { syncQueueProcessor } from '../sync/syncQueueProcessor';
import { Colors } from '../theme/colors';
import { rounded } from '../theme/rounded';
import { spacing } from '../theme/spacing';
import { fontFamily, fontWeight } from '../theme/typography';
import { DashboardMetricsData, TimelinePeriod } from '../types/metrics';
import { RootNavigationProp } from '../types/navigation';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const [selectedPeriod, setSelectedPeriod] =
    useState<TimelinePeriod>('7_days');
  const [dashboardData, setDashboardData] =
    useState<DashboardMetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isHealthKitConnected, setIsHealthKitConnected] = useState<boolean>(
    () => isHealthKitConnectedInStorage(),
  );
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState({ pending: 0, failed: 0 });
  const [retryingSync, setRetryingSync] = useState(false);
  const [syncQueueError, setSyncQueueError] = useState<string | null>(null);
  const [healthSyncError, setHealthSyncError] = useState<string | null>(null);
  const metricsRequestId = useRef(0);

  const storedUser = getUserDetailsFromStorage();
  const userName = storedUser?.user?.name || 'Rahul';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const fetchMetrics = useCallback(
    async (period: TimelinePeriod, showLoader: boolean = true) => {
      const requestId = ++metricsRequestId.current;
      if (showLoader) setLoading(true);
      setError(null);
      try {
        const data = await fitnessRepository.getDashboardData(period);
        if (requestId !== metricsRequestId.current) return;
        if (data) {
          setDashboardData(data);
        } else {
          setError('Failed to load fitness metrics');
        }
      } catch (err: any) {
        if (requestId === metricsRequestId.current) {
          setError(err?.message || 'Error loading metrics');
        }
      } finally {
        if (requestId === metricsRequestId.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const refreshSyncSummary = useCallback(async () => {
    try {
      setSyncSummary(await fitnessRepository.getSyncQueueSummary());
    } catch (summaryError) {
      console.warn('Could not load sync queue status:', summaryError);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(selectedPeriod);
    refreshSyncSummary();
    fitnessRepository.refreshFromBackend(selectedPeriod).catch(err => {
      console.warn('Screen landing backend refresh error:', err);
    });

    const unsubscribeRepo = fitnessRepository.subscribeToChanges(() => {
      fetchMetrics(selectedPeriod, false);
      refreshSyncSummary();
    });
    const unsubscribeQueue = syncQueueProcessor.subscribe(refreshSyncSummary);

    const unsubscribeHealth = healthSyncManager.subscribeToSyncStatus(
      syncStatus => {
        setHealthSyncError(syncStatus.lastError);
        if (syncStatus.state === 'success' && syncStatus.lastSyncedAt) {
          fetchMetrics(selectedPeriod, false);
        }
      },
    );

    return () => {
      unsubscribeRepo();
      unsubscribeQueue();
      unsubscribeHealth();
    };
  }, [fetchMetrics, refreshSyncSummary, selectedPeriod]);

  useEffect(() => {
    syncQueueProcessor
      .processPendingQueue()
      .catch(err => console.warn('Sync queue processing error:', err));
    if (isHealthKitConnectedInStorage()) {
      healthSyncManager.initialize().then(() =>
        healthSyncManager
          .sync({ trigger: 'app_startup' })
          .catch(err => console.warn('Health data startup sync failed:', err)),
      );
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        fitnessRepository.refreshFromBackend(selectedPeriod),
        healthSyncManager.sync({ trigger: 'pull_to_refresh' }),
        syncQueueProcessor.processPendingQueue(),
      ]);
      await Promise.all([
        fetchMetrics(selectedPeriod, false),
        refreshSyncSummary(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetrySync = async () => {
    setRetryingSync(true);
    setSyncQueueError(null);
    try {
      await fitnessRepository.retryFailedSyncItems();
      await syncQueueProcessor.processPendingQueue();
      await refreshSyncSummary();
    } catch (retryError: any) {
      setSyncQueueError(retryError?.message || 'Could not retry pending changes.');
    } finally {
      setRetryingSync(false);
    }
  };

  const handlePeriodChange = (period: TimelinePeriod) => {
    setSelectedPeriod(period);
  };

  const handleUpdateTarget = (newTarget: number) => {
    if (!dashboardData) return;
    if (
      dashboardData.weightGoal.currentWeight > 0 &&
      newTarget >= dashboardData.weightGoal.currentWeight
    ) {
      Alert.alert('Please select a target below your current weight.');
      return;
    }
    const updatedGoal = metricsService.updateTargetWeight(
      newTarget,
      dashboardData.weightGoal,
    );
    setDashboardData({
      ...dashboardData,
      weightGoal: updatedGoal,
    });
  };

  const handleConnectHealthKit = async () => {
    setIsConnecting(true);
    setHealthSyncError(null);
    try {

      setHealthKitConnectedInStorage(true);
      setIsHealthKitConnected(true);

      const initialized = await healthSyncManager.initialize();
      if (!initialized) throw new Error('Apple Health is unavailable.');
      const syncStatus = await healthSyncManager.sync({
        trigger: 'manual_connect',
        forceFullSync: true,
      });

      if (dashboardData && syncStatus.lastSyncedAt) {
        setDashboardData({
          ...dashboardData,
          lastSyncedAt: syncStatus.lastSyncedAt,
        });
      }
      if (syncStatus.lastError) setHealthSyncError(syncStatus.lastError);
    } catch (e: any) {
      console.error('Failed to connect and sync health data:', e);
      setHealthKitConnectedInStorage(false);
      setIsHealthKitConnected(false);
      setHealthSyncError(e?.message || 'Could not connect to Apple Health.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >

        <View style={styles.header}>
          <Text style={styles.dateText}>{getFormattedDate()}</Text>
          <Text style={styles.greetingText}>
            {getGreeting()}, {userName}
          </Text>
        </View>

        <TimelineFilter
          selectedPeriod={selectedPeriod}
          onSelectPeriod={handlePeriodChange}
        />

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading metrics...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to load metrics</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchMetrics(selectedPeriod)}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : dashboardData ? (
          <>

            <ExternalSourcesCard
              isConnected={isHealthKitConnected}
              isConnecting={isConnecting}
              lastSyncedAt={dashboardData.lastSyncedAt}
              onConnect={handleConnectHealthKit}
            />
            {syncSummary.pending > 0 || syncSummary.failed > 0 ? (
              <View style={styles.syncStatusRow}>
                <Text style={styles.syncStatusText}>
                  {syncSummary.pending > 0
                    ? `${syncSummary.pending} change${syncSummary.pending === 1 ? '' : 's'} waiting to sync`
                    : ''}
                  {syncSummary.pending > 0 && syncSummary.failed > 0 ? ' · ' : ''}
                  {syncSummary.failed > 0 ? `${syncSummary.failed} failed` : ''}
                </Text>
                {syncSummary.failed > 0 ? (
                  <TouchableOpacity
                    onPress={handleRetrySync}
                    disabled={retryingSync}
                    accessibilityRole="button"
                    accessibilityLabel="Retry failed syncs"
                  >
                    {retryingSync ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={styles.syncRetryText}>Retry</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            {healthSyncError ? (
              <Text style={styles.healthSyncError}>{healthSyncError}</Text>
            ) : null}
            {syncQueueError ? (
              <Text style={styles.healthSyncError}>{syncQueueError}</Text>
            ) : null}

            {dashboardData.weightGoal.currentWeight > 0 ? (
              <>
                <TargetWeightCard
                  goal={dashboardData.weightGoal}
                  onUpdateTarget={handleUpdateTarget}
                />
                <GoalProgressCard goal={dashboardData.weightGoal} />
              </>
            ) : null}

            <View style={styles.metricsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedPeriod === '7_days'
                    ? 'CORE DAILY METRICS'
                    : selectedPeriod === '30_days'
                    ? '30-DAY AVERAGE METRICS'
                    : '3-MONTH OVERVIEW METRICS'}
                </Text>
              </View>

              <View style={styles.gridContainer}>
                {dashboardData.coreMetrics.map(metric => (
                  <View key={metric.id} style={styles.gridItem}>
                    <MetricCard
                      metric={metric}
                      onPress={() =>
                        navigation.navigate('MetricHistory', {
                          metricId: metric.id,
                          metricTitle: metric.title,
                          unit: metric.unit,
                        })
                      }
                    />
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  header: {
    marginBottom: spacing.spaceMd,
  },
  dateText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  greetingText: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onSurface,
    letterSpacing: -0.4,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.spaceSm,
  },
  loadingText: {
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  errorContainer: {
    backgroundColor: Colors.errorContainer,
    borderRadius: rounded.lg,
    padding: spacing.spaceLg,
    alignItems: 'center',
    marginVertical: spacing.spaceLg,
  },
  errorTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    fontSize: 15,
    color: Colors.onErrorContainer,
    marginBottom: 4,
  },
  errorSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: Colors.onErrorContainer,
    textAlign: 'center',
    marginBottom: spacing.spaceMd,
  },
  retryButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: rounded.base,
  },
  retryButtonText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 13,
    color: Colors.onSurface,
  },
  metricsSection: {
    marginTop: spacing.spaceXs,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceXs,
    marginTop: -spacing.spaceSm,
    marginBottom: spacing.spaceMd,
  },
  syncStatusText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  syncRetryText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 12,
    color: Colors.primary,
    paddingLeft: spacing.spaceSm,
  },
  healthSyncError: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: Colors.error,
    marginTop: -spacing.spaceSm,
    marginBottom: spacing.spaceMd,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeight.semiBold,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spaceSm,
  },
  gridItem: {
    width: '48.5%',
  },
});

export default HomeScreen;
