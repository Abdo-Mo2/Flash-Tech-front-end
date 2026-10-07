import { Product } from './product.model';

export interface AdminUser { id: string; email: string; role: 'user' | 'admin'; created_at: string; }
export interface MonthlySales { month_start: string; delivered_orders: number; delivered_revenue: number; }
export interface AdminStats { products: number; orders: number; processing: number; shipped: number; outForDelivery: number; delivered: number; cancelled: number; lowStock: number; users: number; revenue: number; monthlySales: MonthlySales[]; }
export interface AdminOrderItem { product_id: string | null; title: string; qty: number; unit_price: number; line_total: number; }
export interface AdminOrderProfile { email: string | null; first_name: string | null; last_name: string | null; phone: string | null; }
export interface AdminOrderProfileRow extends AdminOrderProfile { id: string; }
/**
 * `orders.user_id` and `profiles.id` both reference `auth.users`, so PostgREST
 * cannot embed one from the other. AdminService resolves the profile with a
 * second query and attaches it here.
 */
export interface AdminOrder { id: string; user_id: string | null; status: string; total: number; placed_at: string; customer_name: string | null; customer_phone: string | null; delivery_address: string | null; archived_at?: string | null; profiles?: AdminOrderProfile | AdminOrderProfile[] | null; order_items?: AdminOrderItem[]; }
export interface AdminCategory { slug: string; name: string; blurb: string | null; icon: string | null; sort_order: number; }
export type ProductInput = Omit<Product, 'id' | 'reviews'>;

export interface SpecField {
  key: string;
  label: string;
  example?: string;
  options?: string[];
}
