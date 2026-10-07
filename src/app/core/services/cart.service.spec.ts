import { MAX_ORDER_QUANTITY } from '../services/cart.service';

describe('MAX_ORDER_QUANTITY', () => {
  it('allows 1, 2 and 3 units per product', () => {
    expect([1, 2, 3].every((qty) => qty <= MAX_ORDER_QUANTITY)).toBe(true);
  });

  it('rejects 4 or more units per product', () => {
    expect(4 > MAX_ORDER_QUANTITY).toBe(true);
    expect(MAX_ORDER_QUANTITY).toBe(3);
  });

  it('clamps a requested quantity to the per-product maximum', () => {
    const clamp = (qty: number, stock = 99) =>
      Math.max(1, Math.min(qty, stock, MAX_ORDER_QUANTITY));
    expect(clamp(1)).toBe(1);
    expect(clamp(3)).toBe(3);
    expect(clamp(4)).toBe(3);
    expect(clamp(50)).toBe(3);
  });

  it('still respects stock when stock is below the per-product maximum', () => {
    const clamp = (qty: number, stock: number) =>
      Math.max(1, Math.min(qty, stock, MAX_ORDER_QUANTITY));
    expect(clamp(3, 2)).toBe(2);
  });
});
