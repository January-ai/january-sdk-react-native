/**
 * What an amount typed on the Tracking tab becomes when its card switches
 * units: the same quantity in the new unit, so 250 typed as millilitres is
 * never logged as 250 fl oz. The converted text is what gets sent, so it is
 * rounded the way a person would type it: whole millilitres, and one decimal
 * for fluid ounces, cups, pounds, and kilograms.
 */
import type { VolumeUnit, WeightUnit } from '@januaryai/react-native';

import { POUNDS_TO_KILOGRAMS } from './trackingChartData';

export const ML_PER_FL_OZ = 29.5735;
export const FL_OZ_PER_CUP = 8;

const fluidOuncesPer: Record<VolumeUnit, number> = {
  cup: FL_OZ_PER_CUP,
  fl_oz: 1,
  ml: 1 / ML_PER_FL_OZ,
};

const kilogramsPer: Record<WeightUnit, number> = {
  kg: 1,
  lb: POUNDS_TO_KILOGRAMS,
};

const volumeDigits: Record<VolumeUnit, number> = { cup: 1, fl_oz: 1, ml: 0 };

/** A typed water amount, from one volume unit to another. */
export function convertWaterDraft(
  draft: string,
  from: VolumeUnit,
  to: VolumeUnit
): string {
  return convertDraft(
    draft,
    fluidOuncesPer[from] / fluidOuncesPer[to],
    volumeDigits[to],
    from === to
  );
}

/** A typed weight, from one weight unit to another. */
export function convertWeightDraft(
  draft: string,
  from: WeightUnit,
  to: WeightUnit
): string {
  return convertDraft(
    draft,
    kilogramsPer[from] / kilogramsPer[to],
    1,
    from === to
  );
}

// An empty field stays empty, and text that is not a positive number is left
// as typed: there is no quantity to carry over, and Log refuses it anyway.
function convertDraft(
  draft: string,
  factor: number,
  digits: number,
  sameUnit: boolean
): string {
  const trimmed = draft.trim();
  const value = Number(trimmed);
  if (sameUnit || !trimmed || !Number.isFinite(value) || value <= 0) {
    return draft;
  }
  const scale = 10 ** digits;
  return String(Math.round(value * factor * scale) / scale);
}
