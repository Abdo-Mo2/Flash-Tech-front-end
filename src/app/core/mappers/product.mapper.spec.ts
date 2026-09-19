import { mapProduct, isInStock, salePrice } from './product.mapper';
import { ProductRow } from '../models/supabase.model';

function row(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: 'p1',
    name: 'Test Laptop',
    slug: 'test-laptop',
    description: 'A test product',
    category: 'gaming-laptops',
    price: 1000,
    stock: 5,
    brand: 'Flash',
    images: ['a.png', 'b.png'],
    specifications: { cpu: 'i7' },
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides
  };
}

describe('mapProduct', () => {
  it('maps core fields from a database row', () => {
    const product = mapProduct(row());
    expect(product.id).toBe('p1');
    expect(product.title).toBe('Test Laptop');
    expect(product.name).toBe('Test Laptop');
    expect(product.thumbnail).toBe('a.png');
    expect(product.price).toBe(1000);
  });

  it('passes through discount_percentage and rating when present', () => {
    const product = mapProduct(row({ discount_percentage: 15, rating: 4.5 }));
    expect(product.discountPercentage).toBe(15);
    expect(product.rating).toBe(4.5);
  });

  it('defaults discount and rating to zero when columns are missing', () => {
    const product = mapProduct(row());
    expect(product.discountPercentage).toBe(0);
    expect(product.rating).toBe(0);
  });

  it('derives the SKU from specifications and falls back to the id', () => {
    const skuSpecs: Record<string, unknown> = { sku: 'SKU-9' };
    const emptySpecs: Record<string, unknown> = {};
    expect(mapProduct(row({ specifications: skuSpecs })).sku).toBe('SKU-9');
    expect(mapProduct(row({ specifications: emptySpecs })).sku).toBe('p1');
  });
});

describe('salePrice', () => {
  it('applies the discount percentage', () => {
    expect(salePrice({ price: 1000, discountPercentage: 25 })).toBe(750);
  });

  it('returns the full price when there is no discount', () => {
    expect(salePrice({ price: 1000, discountPercentage: 0 })).toBe(1000);
  });
});

describe('isInStock', () => {
  it('is false for zero stock', () => {
    expect(isInStock({ stock: 0 })).toBe(false);
  });

  it('is false when the availability status says out of stock', () => {
    expect(isInStock({ stock: 10, availabilityStatus: 'Out of Stock' })).toBe(false);
  });

  it('is true when there is stock and it is available', () => {
    expect(isInStock({ stock: 10, availabilityStatus: 'In Stock' })).toBe(true);
  });
});
