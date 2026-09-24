import { describe, expect, it } from '@jest/globals';

import { convertWaterDraft, convertWeightDraft } from '../unitDrafts';

describe('a typed water amount when the unit changes', () => {
  it('keeps the quantity: millilitres to fluid ounces and cups', () => {
    // 250 ml is 8.45 fl oz, not 250 fl oz.
    expect(convertWaterDraft('250', 'ml', 'fl_oz')).toBe('8.5');
    expect(convertWaterDraft('250', 'ml', 'cup')).toBe('1.1');
    expect(convertWaterDraft('500', 'ml', 'fl_oz')).toBe('16.9');
  });

  it('converts to whole millilitres', () => {
    expect(convertWaterDraft('8', 'fl_oz', 'ml')).toBe('237');
    expect(convertWaterDraft('1', 'cup', 'ml')).toBe('237');
    expect(convertWaterDraft('1.5', 'cup', 'ml')).toBe('355');
  });

  it('uses 8 fl oz to the cup', () => {
    expect(convertWaterDraft('16', 'fl_oz', 'cup')).toBe('2');
    expect(convertWaterDraft('12', 'fl_oz', 'cup')).toBe('1.5');
    expect(convertWaterDraft('1.5', 'cup', 'fl_oz')).toBe('12');
    expect(convertWaterDraft('0.1', 'cup', 'fl_oz')).toBe('0.8');
  });

  it('reads surrounding spaces and decimals without a leading zero', () => {
    expect(convertWaterDraft(' 8 ', 'fl_oz', 'ml')).toBe('237');
    expect(convertWaterDraft('.5', 'cup', 'fl_oz')).toBe('4');
  });

  it('leaves an empty field empty', () => {
    expect(convertWaterDraft('', 'ml', 'fl_oz')).toBe('');
    expect(convertWaterDraft('  ', 'fl_oz', 'cup')).toBe('  ');
  });

  it('leaves text that is not a positive number as typed', () => {
    expect(convertWaterDraft('abc', 'ml', 'fl_oz')).toBe('abc');
    expect(convertWaterDraft('8,5', 'fl_oz', 'ml')).toBe('8,5');
    expect(convertWaterDraft('0', 'ml', 'fl_oz')).toBe('0');
    expect(convertWaterDraft('-4', 'fl_oz', 'ml')).toBe('-4');
    expect(convertWaterDraft('.', 'fl_oz', 'ml')).toBe('.');
  });

  it('leaves the amount alone when the unit does not change', () => {
    expect(convertWaterDraft('8.25', 'fl_oz', 'fl_oz')).toBe('8.25');
    expect(convertWaterDraft('0.25', 'cup', 'cup')).toBe('0.25');
  });
});

describe('a typed weight when the unit changes', () => {
  it('converts pounds to kilograms and back, to one decimal', () => {
    expect(convertWeightDraft('150', 'lb', 'kg')).toBe('68');
    expect(convertWeightDraft('165.4', 'lb', 'kg')).toBe('75');
    expect(convertWeightDraft('70', 'kg', 'lb')).toBe('154.3');
    expect(convertWeightDraft('74.9', 'kg', 'lb')).toBe('165.1');
  });

  it('leaves an empty field, text that is not a weight, and the same unit alone', () => {
    expect(convertWeightDraft('', 'lb', 'kg')).toBe('');
    expect(convertWeightDraft('heavy', 'kg', 'lb')).toBe('heavy');
    expect(convertWeightDraft('0', 'kg', 'lb')).toBe('0');
    expect(convertWeightDraft('150.25', 'lb', 'lb')).toBe('150.25');
  });
});
