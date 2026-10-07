import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Product } from '../models/product.model';
import { ProductRow } from '../models/supabase.model';
import { AdminCategory, AdminOrder, AdminOrderProfileRow, AdminStats, AdminUser, MonthlySales, ProductInput } from '../models/admin.model';
import { mapProduct } from '../mappers/product.mapper';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { fromSupabase } from '../supabase/supabase.util';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly supabase = inject(SupabaseClientService).client;

  getStats(): Observable<AdminStats> {
    // Stats read the *active* order set (orders table no longer returns archived
    // rows to admins). Monthly revenue comes from the history tables, so it is
    // unaffected by delivered/cancelled orders leaving the active list.
    return forkJoin({
      products: fromSupabase(this.supabase.from('products').select('id,stock')),
      orders: fromSupabase(this.supabase.from('orders').select('id,status,total')),
      users: fromSupabase(this.supabase.from('profiles').select('id')),
      monthlySales: fromSupabase(this.supabase.from('monthly_sales_history').select('month_start,delivered_orders,delivered_revenue').order('month_start', { ascending: false }).limit(6))
    }).pipe(map(result => {
      const orders = (result.orders as { status: string; total: number }[]) ?? [];
      const products = (result.products as { stock: number | null }[]) ?? [];
      const count = (status: string) => orders.filter(order => order.status === status).length;
      const monthlySales = (result.monthlySales as MonthlySales[] | null) ?? [];
      return {
        products: products.length,
        orders: orders.length,
        processing: count('Processing'),
        shipped: count('Shipped'),
        outForDelivery: count('Out for Delivery'),
        delivered: count('Delivered'),
        cancelled: count('Cancelled'),
        lowStock: products.filter(product => Number(product.stock ?? 0) <= 5).length,
        users: result.users?.length ?? 0,
        revenue: orders.filter(order => order.status === 'Delivered').reduce((sum, order) => sum + Number(order.total || 0), 0),
        monthlySales
      };
    }));
  }

  listProducts(search = '', category = '', sort = 'newest'): Observable<Product[]> {
    let query = this.supabase.from('products').select('*');
    if (search.trim()) query = query.or(`name.ilike.%${search.trim()}%,brand.ilike.%${search.trim()}%,slug.ilike.%${search.trim()}%`);
    if (category) query = query.eq('category', category);
    const order = sort === 'price-asc' ? { column: 'price', ascending: true } : sort === 'price-desc' ? { column: 'price', ascending: false } : sort === 'name' ? { column: 'name', ascending: true } : { column: 'created_at', ascending: false };
    return fromSupabase(query.order(order.column, { ascending: order.ascending })).pipe(map(rows => ((rows as ProductRow[] | null) ?? []).map(mapProduct)));
  }

  getProduct(id: string): Observable<Product> {
    return fromSupabase(this.supabase.from('products').select('*').eq('id', id).single()).pipe(map(row => mapProduct(row as ProductRow)));
  }

  saveProduct(input: ProductInput, id?: string): Observable<Product> {
    const slug = input.slug?.trim() || this.slugify(input.name || input.title);
    const payload = {
      name: (input.name || input.title).trim(),
      slug,
      description: input.description.trim(),
      price: Number(input.price),
      category: input.category,
      brand: input.brand?.trim() || null,
      stock: Math.max(0, Number(input.stock || 0)),
      images: input.images ?? [],
      specifications: Object.fromEntries((input.specifications ?? []).map(spec => [spec.label, spec.value])),
      is_active: input.isActive !== false
    };
    const request = id
      ? this.supabase.from('products').update(payload).eq('id', id).select('*').single()
      : this.supabase.from('products').insert(payload).select('*').single();
    return fromSupabase(request).pipe(map(row => mapProduct(row as ProductRow)));
  }

  saveProductWithImages(input: ProductInput, files: File[] = [], id?: string): Observable<Product> {
    if (!files.length) {
      return this.saveProduct(input, id);
    }

    const uploads = files.map(file => {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      const path = `products/${id ?? crypto.randomUUID()}/${Date.now()}-${safeName}`;
      return fromSupabase(this.supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false })).pipe(
        map(() => this.supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
      );
    });

    return forkJoin(uploads).pipe(
      switchMap(urls => this.saveProduct({ ...input, images: [...(input.images ?? []), ...urls] }, id))
    );
  }

  deleteProduct(id: string): Observable<void> {
    return fromSupabase(this.supabase.from('products').delete().eq('id', id)).pipe(map(() => undefined));
  }

  listOrders(): Observable<AdminOrder[]> {
    // The RLS policy already hides archived (Delivered/Cancelled) orders from
    // admins; the explicit is() filter keeps the intent obvious and guards
    // against an out-of-date policy without hiding anything client-side.
    // The profile join is best-effort: orders must still render even when the
    // profiles table is locked down or missing columns.
    return forkJoin({
      orders: fromSupabase(this.supabase.from('orders')
        .select('id,user_id,status,total,placed_at,customer_name,customer_phone,delivery_address,order_items(*)')
        .is('archived_at', null)
        .order('placed_at', { ascending: false })),
      profiles: fromSupabase(this.supabase.from('profiles')
        .select('id,email,first_name,last_name,phone')).pipe(catchError(() => of([])))
    }).pipe(map(({ orders, profiles }) => this.attachProfiles(
      (orders as unknown as AdminOrder[] | null) ?? [],
      (profiles as unknown as AdminOrderProfileRow[] | null) ?? []
    )));
  }

  getOrder(id: string): Observable<AdminOrder> {
    return fromSupabase(this.supabase.from('orders')
      .select('id,user_id,status,total,placed_at,customer_name,customer_phone,delivery_address,order_items(*)')
      .eq('id', id).single()).pipe(
      switchMap(row => {
        const order = row as unknown as AdminOrder;
        if (!order.user_id) return of(order);
        return fromSupabase(this.supabase.from('profiles')
          .select('id,email,first_name,last_name,phone').eq('id', order.user_id).maybeSingle()
        ).pipe(
          map(profile => ({ ...order, profiles: (profile as unknown as AdminOrderProfileRow | null) ?? null })),
          catchError(() => of({ ...order, profiles: null }))
        );
      })
    );
  }
  /**
   * Finalises an order status through the atomic `finalize_order` RPC. The RPC
   * runs in one transaction, so the transition guard, the archive marker, the
   * monthly-sales sync (on Delivered) and the stock restoration (on Cancelled)
   * all apply together. Delivered/Cancelled orders are then archived
   * server-side and disappear from the active list on the next read.
   */
  finalizeOrder(id: string, status: string): Observable<void> {
    return fromSupabase(
      this.supabase.rpc('finalize_order', { p_order_id: id, p_status: status })
    ).pipe(map(() => undefined));
  }

  listUsers(): Observable<AdminUser[]> { return fromSupabase(this.supabase.from('profiles').select('id,email,role,created_at').order('created_at', { ascending: false })).pipe(map(rows => (rows as AdminUser[] | null) ?? [])); }
  setUserRole(id: string, role: 'user' | 'admin'): Observable<void> { return fromSupabase(this.supabase.rpc('set_user_role', { target_user_id: id, target_role: role })).pipe(map(() => undefined)); }
  listCategories(): Observable<AdminCategory[]> { return fromSupabase(this.supabase.from('categories').select('*').order('sort_order')).pipe(map(rows => (rows as AdminCategory[] | null) ?? [])); }
  saveCategory(category: AdminCategory, originalSlug?: string): Observable<AdminCategory> { const payload = { slug: category.slug, name: category.name, blurb: category.blurb, icon: category.icon, sort_order: category.sort_order }; const request = originalSlug ? this.supabase.from('categories').update(payload).eq('slug', originalSlug).select('*').single() : this.supabase.from('categories').insert(payload).select('*').single(); return fromSupabase(request).pipe(map(row => row as AdminCategory)); }
  deleteCategory(slug: string): Observable<void> { return fromSupabase(this.supabase.from('categories').delete().eq('slug', slug)).pipe(map(() => undefined)); }

  private attachProfiles(orders: AdminOrder[], profiles: AdminOrderProfileRow[]): AdminOrder[] {
    const byId = new Map(profiles.map(profile => [profile.id, profile]));
    return orders.map(order => ({
      ...order,
      profiles: order.user_id ? byId.get(order.user_id) ?? null : null
    }));
  }

  private slugify(value: string): string { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
}
