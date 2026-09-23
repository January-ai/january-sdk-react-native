import { describe, expect, it, jest } from '@jest/globals';
import type {
  CorrectPhotoScanRequest,
  FoodScan,
} from '@januaryai/react-native';

import { correctScan } from '../scanCorrection';

const scan: FoodScan = {
  mealName: 'Burger and fries',
  totalNutrients: { calories: { unit: 'kcal', value: 900 } },
  detections: [
    {
      food: {
        id: 'burger',
        name: 'Burger',
        nutrients: {},
        serving: { id: 's', quantity: 1, unit: 'burger' },
      },
    },
  ],
};

function fakeClient(result: FoodScan) {
  const correct =
    jest.fn<(request: CorrectPhotoScanRequest) => Promise<FoodScan>>();
  correct.mockResolvedValue(result);
  return {
    client: {
      foodAnalysis: {
        analyzeDescription: jest.fn(),
        analyzePhoto: jest.fn(),
        correct,
      },
    } as never,
    correct,
  };
}

describe('scan correction', () => {
  it('sends the correction to January with the meal name the user edited', async () => {
    const corrected = { ...scan, mealName: 'Veggie burger and fries' };
    const { client, correct } = fakeClient(corrected);

    const result = await correctScan(client, false, {
      analysis: scan,
      instruction: '  It was a veggie burger  ',
      mealName: ' Lunch ',
    });

    expect(result).toBe(corrected);
    expect(correct).toHaveBeenCalledTimes(1);
    expect(correct).toHaveBeenCalledWith({
      analysis: { ...scan, mealName: 'Lunch' },
      instruction: 'It was a veggie burger',
    });
  });

  it('keeps the scan’s own meal name when the field is left blank', async () => {
    const { client, correct } = fakeClient(scan);
    await correctScan(client, false, {
      analysis: scan,
      instruction: 'No fries',
      mealName: '   ',
    });
    expect(correct.mock.calls[0]?.[0].analysis.mealName).toBe(
      'Burger and fries'
    );
  });

  it('does not send an empty correction', async () => {
    const { client, correct } = fakeClient(scan);
    await expect(
      correctScan(client, false, {
        analysis: scan,
        instruction: '  ',
        mealName: 'Lunch',
      })
    ).rejects.toThrow('Describe what should change.');
    expect(correct).not.toHaveBeenCalled();
  });
});
