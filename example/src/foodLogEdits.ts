import type { FoodLog, FoodSelection } from '@januaryai/react-native';

/**
 * The foods to send when a saved log is edited: undefined when no food was
 * added (a rename leaves the foods alone), otherwise every food already in
 * the log, as logged, followed by the added ones. An update replaces the
 * log's foods, so the existing ones must travel with the new ones. A logged
 * food that cannot be sent back exactly (no IDs, or no positive amount) is
 * refused rather than guessed at, since a guess would rewrite what was logged.
 */
export function foodsAfterAdding(
  log: FoodLog,
  added: readonly FoodSelection[]
): FoodSelection[] | undefined {
  if (added.length === 0) return undefined;
  const kept = log.foods.map((food) => {
    const name = food.name ?? 'A food in this log';
    const servingId = food.consumedServing.id ?? food.servingDetails.id;
    if (!food.id || !servingId) {
      throw new Error(
        `${name} has no food or serving ID, so foods can't be added to this log.`
      );
    }
    const quantity = food.consumedServing.quantity;
    if (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(
        `${name} has no logged amount to keep, so foods can't be added to this log.`
      );
    }
    return { id: food.id, serving: { id: servingId, quantity } };
  });
  return [...kept, ...added];
}
