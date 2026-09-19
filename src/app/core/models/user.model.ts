export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  image: string;
  phone?: string;
  address?: string;
  role?: 'user' | 'admin';
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  governorate: string;
}

export interface LocalOrder {
  id: string;
  placedAt: string;
  status: 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  items: { productId?: string; title: string; qty: number; lineTotal: number }[];
  total: number;
}
