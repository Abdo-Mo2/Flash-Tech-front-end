import { Product, ProductSpec } from '../models/product.model';
import { ProductRow } from '../models/supabase.model';

function mapSpecifications(values: Record<string, unknown> | null): ProductSpec[] {
  return Object.entries(values ?? {}).filter(([label]) => label.toLowerCase() !== 'sku').map(([label, value]) => ({
    label,
    value: typeof value === 'string' ? value : JSON.stringify(value)
  }));
}

export function mapProduct(raw: ProductRow): Product {
  const images = Array.isArray(raw.images) ? raw.images : [];
  const specifications = mapSpecifications(raw.specifications);
  const sku = typeof raw.specifications?.['sku'] === 'string' ? raw.specifications['sku'] : raw.id;
  const thumbnail = images[0] ?? '';

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    title: raw.name,
    description: raw.description,
    category: raw.category,
    price: Number(raw.price),
    discountPercentage: Number(raw.discount_percentage ?? 0),
    rating: Number(raw.rating ?? 0),
    stock: Number(raw.stock ?? 0),
    brand: raw.brand ?? 'Flash Tech',
    sku,
    thumbnail,
    images,
    tags: specifications.map(spec => `${spec.label}: ${spec.value}`),
    availabilityStatus: raw.is_active && raw.stock > 0 ? 'In Stock' : 'Out of Stock',
    warrantyInformation: 'See product specifications',
    shippingInformation: 'Ships in 1–2 business days across Egypt',
    returnPolicy: '14-day returns on sealed electronics',
    weight: 0,
    dimensions: undefined,
    isActive: raw.is_active,
    reviews: [],
    specifications
  };
}

export function salePrice(product: { price: number; discountPercentage: number }): number {
  return product.price * (1 - (product.discountPercentage || 0) / 100);
}

export function isInStock(product: { stock: number; availabilityStatus?: string }): boolean {
  if (product.stock <= 0) return false;
  return !(product.availabilityStatus ?? '').toLowerCase().includes('out');
}
