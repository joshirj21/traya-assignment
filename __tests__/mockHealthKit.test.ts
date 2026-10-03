

import MockHealthKit, {
  HealthKitError,
  HealthSample,
} from '../src/mockHealthKit';

describe('MockHealthKit Library Integration Tests', () => {
  beforeEach(() => {
    MockHealthKit.resetMockData();
  });

  it('1. Initializes HealthKit successfully with connected status', async () => {
    const initResult = await MockHealthKit.initHealthKit({
      permissions: {
        read: ['steps', 'heart_rate', 'sleep', 'calories', 'water', 'activity'],
        write: ['weight', 'steps'],
      },
    });

    expect(initResult.success).toBe(true);
    expect(initResult.connected).toBe(true);

    const status = MockHealthKit.getConnectionStatus();
    expect(status.initialized).toBe(true);
    expect(status.connected).toBe(true);
    expect(status.available).toBe(true);
    expect(MockHealthKit.isAvailable).toBe(true);
  });

  it('verifies isAvailable reads and writes directly to MMKV', async () => {

    MockHealthKit.setHealthKitAvailable(false);
    expect(MockHealthKit.isAvailable).toBe(false);
    expect(await MockHealthKit.isHealthKitAvailable()).toBe(false);
    expect(MockHealthKit.getConnectionStatus().available).toBe(false);

    await expect(MockHealthKit.initHealthKit()).rejects.toThrow(HealthKitError);

    MockHealthKit.isAvailable = true;
    expect(MockHealthKit.isAvailable).toBe(true);
    expect(await MockHealthKit.isHealthKitAvailable()).toBe(true);
  });

  it('2. Requests and verifies authorization permissions', async () => {
    await MockHealthKit.initHealthKit();

    const auth = await MockHealthKit.requestAuthorization({
      read: ['steps', 'heart_rate'],
      write: ['weight'],
    });

    expect(auth.steps.read).toBe('authorized');
    expect(auth.heart_rate.read).toBe('authorized');
    expect(auth.weight.write).toBe('authorized');

    expect(MockHealthKit.getAuthorizationStatus('steps', 'read')).toBe(
      'authorized',
    );
    expect(MockHealthKit.getAuthorizationStatus('weight', 'write')).toBe(
      'authorized',
    );
  });

  it("3. Fetches today's steps and daily step aggregation", async () => {
    await MockHealthKit.initHealthKit();

    const samples = await MockHealthKit.getSamplesForDate(
      'steps',
      '2026-10-02',
    );
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every(s => s.metricType === 'steps')).toBe(true);

    const total = await MockHealthKit.getDailyTotal('steps', '2026-10-02');
    expect(total.value).toBe(8420);
    expect(total.unit).toBe('count');
    expect(total.date).toBe('2026-10-02');
  });

  it('4. Fetches historical heart-rate data over a date range and calculates average', async () => {
    await MockHealthKit.initHealthKit();

    const hrSamples = await MockHealthKit.getHeartRateSamples({
      startDate: '2026-09-25T00:00:00Z',
      endDate: '2026-10-02T23:59:59Z',
    });

    expect(hrSamples.length).toBeGreaterThanOrEqual(10);
    expect(hrSamples.some(s => s.startTime.includes('2026-09-25'))).toBe(true);
    expect(hrSamples.some(s => s.startTime.includes('2026-10-02'))).toBe(true);

    const avg = await MockHealthKit.getDailyAverage('heart_rate', '2026-10-02');
    expect(avg.value).toBe(97);
    expect(avg.unit).toBe('bpm');
  });

  it('5. Fetches sleep samples including night/day intervals', async () => {
    await MockHealthKit.initHealthKit();

    const sleepSamples = await MockHealthKit.getSleepSamples({
      startDate: '2026-10-01T00:00:00Z',
      endDate: '2026-10-02T23:59:59Z',
    });

    expect(sleepSamples.length).toBeGreaterThan(0);
    const todaySleep = sleepSamples.find(s => s.endTime.includes('2026-10-02'));
    expect(todaySleep).toBeDefined();
    expect(todaySleep?.value).toBe(462);                        
    expect(todaySleep?.unit).toBe('minutes');
  });

  it('6. Adds a new weight record to the mock data store', async () => {
    await MockHealthKit.initHealthKit();

    const newWeight = await MockHealthKit.addWeightSample({
      value: 71.8,
      startTime: '2026-10-02T19:30:00Z',
      endTime: '2026-10-02T19:30:00Z',
      metadata: { context: 'evening weigh-in' },
    });

    expect(newWeight.id).toBeDefined();
    expect(newWeight.metricType).toBe('weight');
    expect(newWeight.value).toBe(71.8);
    expect(newWeight.unit).toBe('kg');
    expect(newWeight.source).toBe('mock_healthkit');
  });

  it('7. Fetches the newly added weight record and queries latest sample', async () => {
    await MockHealthKit.initHealthKit();

    const added = await MockHealthKit.addWeightSample({
      value: 71.5,
      startTime: '2026-10-02T20:00:00Z',
      endTime: '2026-10-02T20:00:00Z',
    });

    const fetchedById = await MockHealthKit.getSampleById(added.id);
    expect(fetchedById).toEqual(added);

    const latestWeight = await MockHealthKit.getLatestSample('weight');
    expect(latestWeight?.value).toBe(71.5);
  });

  it('8. Simulates new step data arriving from an external source', async () => {
    await MockHealthKit.initHealthKit();

    const simulated = await MockHealthKit.simulateNewData('steps', {
      value: 1250,
      startTime: '2026-10-02T20:00:00Z',
      endTime: '2026-10-02T20:45:00Z',
      metadata: { sourceDevice: 'Apple Watch Series 9' },
    });

    expect(simulated.metricType).toBe('steps');
    expect(simulated.value).toBe(1250);

    const latestSteps = await MockHealthKit.getLatestSample('steps');
    expect(latestSteps?.value).toBe(1250);
  });

  it('9. Subscribes to real-time step changes and receives live updates', async () => {
    await MockHealthKit.initHealthKit();

    const stepEvents: HealthSample[] = [];
    const unsubscribe = MockHealthKit.subscribe('steps', sample => {
      stepEvents.push(sample);
    });

    await MockHealthKit.addStepSample({
      value: 600,
      startTime: '2026-10-02T21:00:00Z',
      endTime: '2026-10-02T21:30:00Z',
    });

    await MockHealthKit.simulateNewData('steps', {
      value: 400,
      startTime: '2026-10-02T21:30:00Z',
      endTime: '2026-10-02T22:00:00Z',
    });

    expect(stepEvents.length).toBe(2);
    expect(stepEvents[0].value).toBe(600);
    expect(stepEvents[1].value).toBe(400);

    unsubscribe();

    await MockHealthKit.addStepSample({
      value: 800,
      startTime: '2026-10-02T22:00:00Z',
      endTime: '2026-10-02T22:30:00Z',
    });

    expect(stepEvents.length).toBe(2);
  });

  it('10. Disconnects HealthKit and throws predictable errors on getter/setter access', async () => {
    await MockHealthKit.initHealthKit();

    MockHealthKit.disconnect();
    expect(MockHealthKit.getConnectionStatus().connected).toBe(false);

    await expect(MockHealthKit.getStepCount()).rejects.toThrow(HealthKitError);

    try {
      await MockHealthKit.getStepCount();
    } catch (err: any) {
      expect(err.code).toBe('DISCONNECTED');
      expect(err.message).toContain('disconnected');
    }

    await MockHealthKit.initHealthKit();
    MockHealthKit.setAuthorizationStatus('heart_rate', 'denied', 'read');

    try {
      await MockHealthKit.getHeartRateSamples();
    } catch (err: any) {
      expect(err.code).toBe('PERMISSION_DENIED');
      expect(err.message).toMatch(/permission denied/i);
    }
  });
});
