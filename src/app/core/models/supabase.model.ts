export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  discount_percentage?: number | null;
  rating?: number | null;
  brand: string | null;
  images: string[] | null;
  specifications: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  slug: string;
  name: string;
  blurb: string | null;
  icon: string | null;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  gender: string | null;
  image: string | null;
  address: string | null;
  role: 'user' | 'admin';
}

export interface AddressRow {
  id: string;
  user_id: string;
  label: string | null;
  full_name: string | null;
  phone: string | null;
  line1: string | null;
  city: string | null;
  governorate: string | null;
}

export interface OrderRow {
  id: string;
  user_id: string | null;
  status: string;
  total: number;
  placed_at: string;
  order_items?: OrderItemRow[] | null;
}

export interface OrderItemRow {
  title: string;
  qty: number;
  unit_price: number;
  line_total: number;
  product_id: string | null;
}
