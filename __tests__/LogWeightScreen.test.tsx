import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { LogWeightScreen } from '../src/screens/LogWeightScreen';
import { saveUserDetailsToStorage, storage } from '../src/lib/storage';
import { fitnessRepository } from '../src/repositories/fitnessRepository';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

function getAllText(root: ReactTestRenderer.ReactTestInstance): string {
  const texts: string[] = [];
  const findText = (node: any) => {
    if (typeof node === 'string' || typeof node === 'number') {
      texts.push(String(node));
    } else if (node?.children) {
      node.children.forEach(findText);
    }
  };
  findText(root);
  return texts.join(' ');
}

describe('LogWeightScreen', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
  });

  it('renders LogWeightScreen with height, weight stepper, BMI calculation, and date picker', async () => {
    saveUserDetailsToStorage({
      user: {
        name: 'Rahul Joshi',
        age: 28,
        height: 180,
        weight: 72.5,
      },
    });

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<LogWeightScreen />);
      await new Promise<void>(resolve => setTimeout(resolve, 50));
    });

    expect(tree).toBeDefined();
    const allText = getAllText(tree!.root);

    expect(allText).toContain('Synced');
    expect(allText).toContain('Log Weight');
    expect(allText).toContain('Record weight and auto-track BMI');

    expect(allText).toContain('Height:');
    expect(allText).toContain('180');
    expect(allText).toContain('cm');
    expect(allText).toContain('Edit');

    expect(allText).toContain('RECORD WEIGHT');
    expect(allText).toContain('MEASUREMENT VALUE');
    expect(allText).toContain('kg');
    expect(allText).toContain('lbs');
    expect(allText).toContain('72.5');

    expect(allText).toContain('Baseline:');
    expect(allText).toContain('Calculated BMI:');
    expect(allText).toContain('22.4');
    expect(allText).toContain('Normal');

    expect(allText).toContain('DATE OF MEASUREMENT');
    expect(allText).toContain('Today');

    expect(allText).toContain('Save Weight');
  });

  it('increments and decrements weight value when + and - buttons are clicked', async () => {
    saveUserDetailsToStorage({
      user: {
        name: 'Rahul Joshi',
        age: 28,
        height: 180,
        weight: 72.5,
      },
    });

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<LogWeightScreen />);
      await new Promise<void>(resolve => setTimeout(resolve, 50));
    });

    const incBtn = tree!.root.findByProps({
      accessibilityLabel: 'Increase weight',
    });
    const decBtn = tree!.root.findByProps({
      accessibilityLabel: 'Decrease weight',
    });

    await ReactTestRenderer.act(async () => {
      incBtn.props.onPress();
    });

    let allText = getAllText(tree!.root);
    expect(allText).toContain('73.0');

    await ReactTestRenderer.act(async () => {
      decBtn.props.onPress();
    });

    allText = getAllText(tree!.root);
    expect(allText).toContain('72.5');
  });

  it('saves weight to repository and storage when Save Weight is clicked', async () => {
    const addWeightSpy = jest
      .spyOn(fitnessRepository, 'addWeight')
      .mockResolvedValue({
        id: 'entity_weight_1',
        user_id: 'local_user',
        metric_type: 'weight',
        value: 74.0,
        unit: 'kg',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        source: 'app',
        source_record_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    saveUserDetailsToStorage({
      user: {
        name: 'Rahul Joshi',
        age: 28,
        height: 180,
        weight: 72.5,
      },
    });

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<LogWeightScreen />);
      await new Promise<void>(resolve => setTimeout(resolve, 50));
    });

    const incBtn = tree!.root.findByProps({
      accessibilityLabel: 'Increase weight',
    });

    await ReactTestRenderer.act(async () => {
      incBtn.props.onPress();
      incBtn.props.onPress();
      incBtn.props.onPress();
    });

    const buttons = tree!.root.findAllByProps({ activeOpacity: 0.85 });
    const saveBtn = buttons[0];
    expect(saveBtn).toBeDefined();

    await ReactTestRenderer.act(async () => {
      await saveBtn.props.onPress();
    });

    expect(addWeightSpy).toHaveBeenCalledWith(74.0, 'kg', expect.any(String));

    addWeightSpy.mockRestore();
  });
});
