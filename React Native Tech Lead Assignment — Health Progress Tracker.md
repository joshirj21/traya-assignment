# **React Native Tech Lead Assignment — Health Progress Tracker**

## **Objective**

Build a React Native application that allows users to track their health and fitness progress over time.

The application should demonstrate your ability to design a **production-quality mobile application**, with particular focus on:

- React Native architecture
- State and data management
- Offline-first behavior
- Device/health-data integration
- Asynchronous operations and race conditions
- Application lifecycle
- Performance
- Error handling
- Testing
- Maintainability

The UI does not need to be highly polished but should not be very vague as well. Please focus on the **engineering quality and technical decisions** behind the application.

---

## **1\. Health Progress Dashboard**

Create a dashboard where a user can view their health and fitness progress.

The dashboard can include metrics such as:

- Weight
- Steps
- Sleep
- Calories
- Water intake
- Workout/activity
- Goal progress

The user should be able to view historical progress for selected metrics.

For example:

- 7 days
- 30 days
- 3 months

You may decide which metrics to implement based on your approach.

---

## **2\. Manual Health Data**

Allow the user to manually record at least one health metric.

For example:

> Weight: 72.5 kg  
> Date: 21 Sep 2026

The user should be able to:

- Add a measurement
- Edit a measurement
- Delete a measurement
- View historical measurements

The application should behave correctly when these operations happen while the device is offline.

---

## **3\. Health / Fitness Data Integration**

The application should support importing health data from an external health or fitness data source.

You may use:

- Apple Health
- Health Connect
- Google Fit
- A mocked health-data provider

A real integration is **not required**.

If you use a mock provider, design the integration so that the underlying application does not need to know whether the data came from a real provider or a mock implementation.

For example:

```
Health Data Provider
        ↓
Integration Layer
        ↓
Normalized Health Data
        ↓
Application
```

Consider that different providers may represent the same metric differently.

For example:

```
Provider A → weight_kg
Provider B → weight
Provider C → body_weight
```

---

## **4\. Offline-first Behavior**

The application should continue to work when there is no network connection.

For example:

```
User records data
       ↓
No network
       ↓
Store locally
       ↓
Network restored
       ↓
Synchronize
```

Consider:

- Local persistence
- Pending changes
- Retry
- Failed synchronization
- Duplicate requests
- Requests arriving out of order
- App being terminated before synchronization completes

You may use mocked APIs for the server-side interaction.

---

## **5\. Synchronization & Race Conditions**

The application should handle situations where multiple operations happen concurrently.

For example:

```
10:01 — User records weight: 72.8 kg
10:02 — Device reports weight: 72.5 kg
10:03 — User edits weight: 72.6 kg
10:04 — Offline changes are synchronized
```

Define how your application determines what data should ultimately be displayed.

Consider:

- Ordering
- Duplicate events
- Concurrent updates
- Conflict resolution
- Idempotency

You do not need to implement a sophisticated distributed synchronization system.

However, your README should explain how you would approach these scenarios in a production application.

---

## **6\. Application Lifecycle**

The application should handle common mobile lifecycle scenarios.

Consider what happens when:

- The app goes into the background during synchronization.
- The app is terminated while an operation is pending.
- The device loses network connectivity during an operation.
- The user opens the app again after several hours.
- The user logs in from another device.

Implement the scenarios you consider most important and document how you would handle the others.

---

## **7\. Performance**

Assume that a user may have **several years of health data**.

The application should be designed so that the UI remains responsive as the amount of data grows.

Consider:

- Large lists
- Historical charts
- Rendering performance
- Memory usage
- Unnecessary re-renders
- Data processing on the JS thread
- Pagination or incremental loading

You do not need to generate millions of records, but explain how you would approach scaling the mobile experience.

---

## **8\. Loading, Error & Empty States**

Handle appropriate states for:

- Initial loading
- API failure
- No health data
- No historical data
- Failed synchronization
- Partial data availability
- Health-data provider unavailable

The user should always have a clear understanding of what is happening.

---

## **9\. Architecture**

You are free to choose the architecture and libraries.

You may choose your preferred:

- State management
- Data-fetching approach
- Local persistence solution
- Navigation
- Charting library
- API abstraction
- Health-data integration approach

Please explain **why** you made these choices.

We are particularly interested in:

- Separation of concerns
- Component boundaries
- Business logic
- Data layer
- External integration boundaries
- State management
- Testability
- Maintainability

---

## **10\. Testing**

Add tests for the areas you consider most critical.

Examples:

- Health metric calculations
- Goal calculations
- Data normalization
- Offline queue
- Synchronization
- Conflict resolution
- Retry behavior

You do not need to achieve complete test coverage.

---

## **11\. Mock APIs**

You **can use mocked APIs** for all backend interactions.

You do not need to build a backend.

The mock API should simulate realistic behavior where useful, such as:

- Network latency
- API failures
- Retryable errors
- Duplicate responses
- Delayed responses

---

# **Deliverables**

Please provide:

### **1\. React Native application**

A working application demonstrating the core functionality.

### **2\. Source code**

Provide the source code in a Git repository.

### **3\. README**

The README should include:

- Setup instructions
- Architecture overview
- Key technical decisions
- State-management approach
- Local persistence approach
- Health/device integration approach
- Offline/synchronization strategy
- Conflict-resolution approach
- Testing strategy
- Performance considerations
- Trade-offs
- Known limitations
- What you would improve with more time

### **4\. Architecture diagram**

Include a simple diagram showing the major components and data flow.

---

# **Time Constraint**

The assignment is **time-boxed to approximately 2 days**.

You are **not expected to implement every requirement**.

Please prioritize the areas where you believe you can demonstrate the most engineering value.

Clearly document:

- What you implemented
- What you partially implemented
- What you designed but did not implement
- What you would implement next
- Any assumptions you made
- Any trade-offs you made

**The quality of your engineering decisions is more important than the number of features completed.**

---

# **AI Usage**

You are free to use AI-assisted development tools during the assignment.

Please document in the README:

- Where AI was used
- What you used it for
- Significant code or architectural suggestions generated by AI
- What you changed, rejected, or validated yourself

The goal is not to restrict AI usage, but to understand how you use AI while maintaining **technical ownership of the solution**.
