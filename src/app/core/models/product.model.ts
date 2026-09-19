export interface ProductReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand: string;
  sku: string;
  thumbnail: string;
  images: string[];
  tags: string[];
  availabilityStatus: string;
  warrantyInformation: string;
  shippingInformation: string;
  returnPolicy: string;
  weight: number;
  dimensions?: { width: number; height: number; depth: number };
  isActive: boolean;
  reviews: ProductReview[];
  specifications: ProductSpec[];
}

export interface ProductPage {
  items: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface StoreCategory {
  slug: string;
  label: string;
  apiSlug: string;
  icon: 'laptop' | 'desktop' | 'gpu' | 'cpu' | 'headphones' | 'accessory' | 'deal';
  blurb: string;
}

export const STORE_CATEGORIES: StoreCategory[] = [
  {
    slug: 'gaming-laptops',
    label: 'Gaming Laptops',
    apiSlug: 'gaming-laptops',
    icon: 'laptop',
    blurb: 'High-performance gaming notebooks'
  },
  {
    slug: 'business-laptops',
    label: 'Business Laptops',
    apiSlug: 'business-laptops',
    icon: 'laptop',
    blurb: 'Portable machines for work and study'
  },
  {
    slug: 'desktop-pcs',
    label: 'Desktop PCs',
    apiSlug: 'desktop-pcs',
    icon: 'desktop',
    blurb: 'Ready-to-play desktop builds'
  },
  {
    slug: 'graphics-cards',
    label: 'Graphics Cards',
    apiSlug: 'graphics-cards',
    icon: 'gpu',
    blurb: 'GPUs for gaming and creative work'
  },
  {
    slug: 'processors',
    label: 'Processors',
    apiSlug: 'processors',
    icon: 'cpu',
    blurb: 'CPUs for your next build'
  },
  {
    slug: 'gaming-headphones',
    label: 'Gaming Headphones',
    apiSlug: 'gaming-headphones',
    icon: 'headphones',
    blurb: 'Headsets built for play and chat'
  },
  {
    slug: 'computer-accessories',
    label: 'Computer Accessories',
    apiSlug: 'computer-accessories',
    icon: 'accessory',
    blurb: 'Keyboards, mice, and essentials'
  },
  {
    slug: 'deals',
    label: 'Deals',
    apiSlug: 'deals',
    icon: 'deal',
    blurb: 'Marked-down tech this week'
  }
];

export function categoryLabel(slug: string): string {
  return STORE_CATEGORIES.find(c => c.slug === slug || c.apiSlug === slug)?.label
    ?? slug.replace(/-/g, ' ');
}
