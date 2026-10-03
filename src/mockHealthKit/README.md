# Mock HealthKit Library

A lightweight, high-fidelity in-memory simulator for **Apple HealthKit** in bare React Native and TypeScript.

---

## 🎯 1. Why This Mock Exists

In fitness tracker mobile development, interacting with native iOS **Apple HealthKit** requires an actual physical iPhone, specific provisioning profiles, and user entitlement permissions.

This mock library isolates your application from hardware dependencies by acting as an **external data source**:

- **Simulates Native Behavior**: Emulates permissions, connection lifecycle, historical sample queries, aggregations, mutations, and real-time observer streams.
- **Architectural Separation**: Keeps HealthKit representation strictly separate from application business logic, SQLite local persistence, and cloud sync APIs.
- **Seamless Drop-In Replacement**: When switching to a real native library (e.g. `react-native-health` or custom Native Modules), only the bridge adapter needs to change.

---

## 📦 2. Installation & Import

```typescript
import MockHealthKit, {
  HealthKitError,
  HealthSample,
  MetricType,
  QueryOptions,
} from './mockHealthKit';
```

---

## 🚀 3. Initialization & Connection Lifecycle

```typescript
// 1. Initialize and request read/write permissions
const result = await MockHealthKit.initHealthKit({
  permissions: {
    read: ['steps', 'heart_rate', 'sleep', 'calories', 'water', 'activity'],
    write: ['weight', 'steps'],
  },
});

console.log(result); // { success: true, connected: true }

// 2. Inspect connection & availability
const status = MockHealthKit.getConnectionStatus();
console.log(status); // { initialized: true, connected: true, available: true }

// 3. Disconnect (e.g. background teardown or permission revoke)
MockHealthKit.disconnect();
```

---

## 🔐 4. Permission System

Supports `'notDetermined'`, `'authorized'`, and `'denied'` statuses per metric:

```typescript
// Check permission
const status = MockHealthKit.getAuthorizationStatus('steps', 'read');

// Simulate user granting or denying in iOS Settings
MockHealthKit.setAuthorizationStatus('heart_rate', 'denied', 'read');
```

If a getter or setter is invoked when permission is denied or when HealthKit is disconnected, it throws a typed `HealthKitError`:

```typescript
try {
  await MockHealthKit.getHeartRateSamples();
} catch (error) {
  if (error instanceof HealthKitError) {
    console.error(error.code); // 'PERMISSION_DENIED' | 'DISCONNECTED' | 'NOT_INITIALIZED'
    console.error(error.message); // 'Read permission denied for heart_rate'
  }
}
```

---

## 📊 5. Supported Fitness Metrics

| Metric         | Identifier     | Default Unit | Description                       |
| :------------- | :------------- | :----------- | :-------------------------------- |
| **Steps**      | `'steps'`      | `count`      | Step count intervals              |
| **Heart Rate** | `'heart_rate'` | `bpm`        | Heart rate point samples          |
| **Sleep**      | `'sleep'`      | `minutes`    | Sleep durations & night intervals |
| **Calories**   | `'calories'`   | `kcal`       | Active energy burned              |
| **Water**      | `'water'`      | `ml`         | Hydration logs                    |
| **Activity**   | `'activity'`   | `minutes`    | Exercise & workout durations      |
| **Weight**     | `'weight'`     | `kg`         | Body mass records                 |

---

## 🔍 6. Getting Data & Historical Queries

### Specific Metric Getters

```typescript
// Steps
const steps = await MockHealthKit.getStepCount({
  startDate: '2026-10-01T00:00:00Z',
  endDate: '2026-10-02T23:59:59Z',
});

// Heart Rate
const hrSamples = await MockHealthKit.getHeartRateSamples();

// Sleep (includes intervals & stages)
const sleep = await MockHealthKit.getSleepSamples();

// Active Energy
const calories = await MockHealthKit.getActiveEnergyBurned();

// Water
const water = await MockHealthKit.getWaterSamples();

// Activity / Workouts
const activity = await MockHealthKit.getActivitySamples();

// Weight Measurements
const weight = await MockHealthKit.getWeightSamples();
```

### Generic & Date Convenience Queries

```typescript
// Generic Query
const samples = await MockHealthKit.getSamples({
  metricType: 'calories',
  startDate: '2026-09-25T00:00:00Z',
  endDate: '2026-10-02T23:59:59Z',
  ascending: true,
  limit: 20,
});

// Today's samples
const todaySteps = await MockHealthKit.getTodaySamples('steps');

// Specific date
const dateSamples = await MockHealthKit.getSamplesForDate(
  'water',
  '2026-10-02',
);
```

---

## ✍️ 7. Adding, Updating & Deleting Data

```typescript
// Specific Setters
const weightEntry = await MockHealthKit.addWeightSample({
  value: 72.1,
  startTime: '2026-10-02T08:00:00Z',
  endTime: '2026-10-02T08:00:00Z',
  metadata: { context: 'morning weigh-in' },
});

// Generic Setter
const stepSample = await MockHealthKit.addSample({
  metricType: 'steps',
  value: 1200,
  unit: 'count',
  startTime: '2026-10-02T19:00:00Z',
  endTime: '2026-10-02T19:30:00Z',
});

// Update
await MockHealthKit.updateSample(stepSample.id, { value: 1450 });

// Delete
await MockHealthKit.deleteSample(stepSample.id);
```

---

## 📈 8. Aggregation Methods

```typescript
// 1. Daily Total
const totalSteps = await MockHealthKit.getDailyTotal('steps', '2026-10-02');
// => { metricType: "steps", date: "2026-10-02", value: 8420, unit: "count" }

// 2. Daily Average
const avgHeartRate = await MockHealthKit.getDailyAverage(
  'heart_rate',
  '2026-10-02',
);
// => { metricType: "heart_rate", date: "2026-10-02", value: 97, unit: "bpm" }

// 3. Daily Min / Max
const minHR = await MockHealthKit.getDailyMin('heart_rate', '2026-10-02');
const maxHR = await MockHealthKit.getDailyMax('heart_rate', '2026-10-02');
```

---

## ⚡ 9. Real-Time Simulation & Subscriptions

Simulate incoming samples (e.g. Apple Watch workout sync) and listen via observers without external event emitter libraries:

```typescript
// Subscribe to step events
const unsubscribe = MockHealthKit.subscribe('steps', sample => {
  console.log('New step sample received:', sample.value);
});

// Simulate incoming background data
await MockHealthKit.simulateNewData('steps', {
  value: 500,
  startTime: '2026-10-02T18:00:00Z',
  endTime: '2026-10-02T18:30:00Z',
});

// Clean up
unsubscribe();
```

---

## 🔄 10. Resetting & Seed Data

The library ships with realistic seed records spanning **2026-09-25** through **2026-10-02**.

```typescript
// Reset mock store back to default seed data
MockHealthKit.resetMockData();

// Clear all records in memory
MockHealthKit.clearSamples();

// Repopulate seed dataset
MockHealthKit.seedMockData();
```

---

## 🏗️ 11. Application Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────┐
│              EXTERNAL HEALTH DATA PROVIDER              │
│  MockHealthKit / Apple HealthKit / Google Health Connect│
└───────────────────────────┬─────────────────────────────┘
                            │ Raw Samples (HealthSample)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   HEALTH SYNC MANAGER                   │
│   • Background polling & realtime observer subscriptions│
│   • Idempotency key generation                          │
│   • Cursor-based sync tracking (lastSyncedAt)           │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     DATA NORMALIZER                     │
│   • Converts HealthSample → App Domain Model            │
│   • Unit normalization (kg, cm, kcal, mins)             │
│   • Deduplication & conflict resolution                 │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│       LOCAL STORAGE       │ │        REMOTE API         │
│ • SQLite / MMKV           │ │ • POST /api/v1/sync       │
│ • Offline-first caching   │ │ • Cloud sync & analytics  │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 🔌 12. Replacing With Real Apple HealthKit

When deploying to production with native iOS capabilities:

1. Implement a real adapter conforming to the same interface (e.g. `IHealthDataProvider`).
2. Map `react-native-health` or `Apple HealthKit` native module calls inside that adapter.
3. The **Health Sync Manager**, **Normalizer**, **SQLite Storage**, and **UI Dashboard** remain 100% untouched.
