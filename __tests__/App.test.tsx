import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { storage } from '../src/lib/storage';
import { mockNetworkClient } from '../src/lib/mockNetworkClient';

describe('App Root', () => {
  beforeEach(() => {
    storage.clearAll();
    mockNetworkClient.setSimulationConfig({ latency: 0 });
  });

  test('renders correctly', async () => {
    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<App />);
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), 10);
      });
    });
  });
});
