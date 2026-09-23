import type { FoodScan, JanuaryClient } from '@januaryai/react-native';

import { correctFixtureScan } from './e2eFixtures';

export interface ScanCorrection {
  /** The scan being corrected. */
  analysis: FoodScan;
  /** The meal name as the user left it; blank keeps the scan's own name. */
  mealName: string;
  /** What should change, in the user's words. */
  instruction: string;
}

/**
 * Sends a correction to January and returns the corrected scan. The meal name
 * the user edited travels with the scan, so January corrects the meal the user
 * sees. Fixture mode answers from the fixtures instead.
 */
export async function correctScan(
  client: Pick<JanuaryClient, 'foodAnalysis'>,
  fixtures: boolean,
  { analysis, mealName, instruction }: ScanCorrection
): Promise<FoodScan> {
  const request = instruction.trim();
  if (!request) throw new Error('Describe what should change.');
  if (fixtures) return correctFixtureScan(request);
  const name = mealName.trim();
  return client.foodAnalysis.correct({
    analysis: name ? { ...analysis, mealName: name } : analysis,
    instruction: request,
  });
}
