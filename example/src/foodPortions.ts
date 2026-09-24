import type { FoodSelection, ServingOption } from '@januaryai/react-native';

/**
 * One whole serving in the serving's own unit: 6 for a "6 oz" serving. A
 * serving with no usable size counts as 1.
 */
export function wholeServing(
  serving: Pick<ServingOption, 'quantity'> | undefined
): number {
  const size = serving?.quantity;
  return size != null && size > 0 ? size : 1;
}

/** How many servings an amount in the serving's own unit makes: 3 oz of a "6 oz" serving is 0.5. */
export function servingsIn(
  amount: number,
  serving: Pick<ServingOption, 'quantity'> | undefined
): number {
  return amount / wholeServing(serving);
}

/**
 * What to multiply a nutrient of the food's base serving by for a number of
 * the given serving, as January does: two servings whose scaling factor is
 * 1.5 make 3.
 */
export function servingsScale(
  servings: number,
  serving: Pick<ServingOption, 'scalingFactor'> | undefined
): number {
  return servings * (serving?.scalingFactor ?? 1);
}

/**
 * The selection for an amount of a serving in the serving's own unit, one
 * whole serving unless given. Its quantity is a count of servings, which is
 * how January reads it: 6 oz of a "6 oz" serving sends 1 and 12 oz sends 2,
 * never 6 or 12. Undefined when the serving has no ID to send.
 */
export function portionSelection(
  foodId: string,
  serving: ServingOption | undefined,
  amount: number = wholeServing(serving)
): FoodSelection | undefined {
  if (!serving?.id) return undefined;
  return {
    id: foodId,
    serving: { id: serving.id, quantity: servingsIn(amount, serving) },
  };
}
