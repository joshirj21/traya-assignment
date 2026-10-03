import { MockNetworkClient } from '../src/lib/mockNetworkClient';
import { UserService } from '../src/services/userService';
import { ApiError } from '../src/types/api';

describe('MockNetworkClient & UserService', () => {
  let client: MockNetworkClient;
  let service: UserService;

  beforeEach(() => {
    client = new MockNetworkClient({
      latency: 0,                                   
      autoRetry: {
        enabled: true,
        maxRetries: 2,
        initialBackoffMs: 10,
        backoffMultiplier: 2,
      },
    });
    service = new UserService(client);
  });

  it('fetches user details successfully with expected data payload', async () => {
    const response = await service.getUserDetails();

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      user: {
        name: 'Rahul Joshi',
        age: 28,
        height: 170,
        weight: 60,
      },
    });
    expect(response.headers?.['Content-Type']).toBe('application/json');
  });

  it('simulates network latency with configurable delay', async () => {
    const startTime = Date.now();
    await service.getUserDetails({ delayMs: 60 });
    const elapsedTime = Date.now() - startTime;

    expect(elapsedTime).toBeGreaterThanOrEqual(50);
  });

  it('simulates non-retryable API failures (e.g. 404 NOT_FOUND, 400 BAD_REQUEST)', async () => {
    await expect(
      service.getUserDetails({ forcedError: 'NOT_FOUND' }),
    ).rejects.toThrow(ApiError);

    try {
      await service.getUserDetails({ forcedError: 'NOT_FOUND' });
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.code).toBe('NOT_FOUND');
      expect(apiErr.retryable).toBe(false);
    }
  });

  it('simulates retryable errors (e.g. 503 SERVICE_UNAVAILABLE, 429 RATE_LIMIT)', async () => {
    try {
      await service.getUserDetails({
        forcedError: 'SERVICE_UNAVAILABLE',
        maxRetries: 1,
      });
    } catch (error) {
      const apiErr = error as ApiError;
      expect(apiErr.status).toBe(503);
      expect(apiErr.code).toBe('SERVICE_UNAVAILABLE');
      expect(apiErr.retryable).toBe(true);
    }
  });

  it('simulates duplicate responses via idempotency key caching', async () => {
    const idempotencyKey = 'req_test_12345';

    const response1 = await service.getUserDetails({ idempotencyKey });
    expect(response1.isDuplicate).toBeFalsy();

    const response2 = await service.getUserDetails({ idempotencyKey });
    expect(response2.isDuplicate).toBe(true);
    expect(response2.headers?.['X-Idempotency-Replay']).toBe('true');
    expect(response2.data).toEqual(response1.data);
  });

  it('allows selecting alternate mock responses from ApiMocks JSON', async () => {
    const response = await service.getUserDetails({
      mockResponseKey: 'getUserUpdated',
    });

    expect(response.status).toBe(200);
    expect(response.data.user.weight).toBe(62.5);
  });

  it('simulates forced duplicate response mode', async () => {
    client.setSimulationConfig({ simulateDuplicate: true });
    const response = await service.getUserDetails();

    expect(response.isDuplicate).toBe(true);
    expect(response.headers?.['X-Simulated-Duplicate']).toBe('true');
  });
});
