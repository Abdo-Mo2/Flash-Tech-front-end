import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';
import { Address, LocalOrder, OrderCustomer } from '../models/user.model';
import { AddressRow, OrderItemRow, OrderRow } from '../models/supabase.model';
import { AuthService } from './auth.service';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { fromSupabase, supabaseErrorMessage } from '../supabase/supabase.util';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly auth = inject(AuthService);

  private readonly addresses = signal<Address[]>([]);
  private readonly orders = signal<LocalOrder[]>([]);

  readonly addressList = this.addresses.asReadonly();
  readonly orderList = this.orders.asReadonly();
  readonly orderCount = computed(() => this.orders().length);

  reload(): void {
    const userId = this.auth.user()?.id;
    if (!userId) {
      this.addresses.set([]);
      this.orders.set([]);
      return;
    }
    this.loadRemoteAddresses(userId).subscribe({ next: items => this.addresses.set(items), error: () => this.addresses.set([]) });
    this.loadRemoteOrders(userId).subscribe({ next: items => this.orders.set(items), error: () => this.orders.set([]) });
  }

  addAddress(address: Omit<Address, 'id'>): Observable<Address> {
    const userId = this.auth.user()?.id;
    if (!userId) return throwError(() => new Error('Sign in before saving an address.'));
    return fromSupabase(
      this.supabase.from('addresses').insert({
        user_id: userId,
        label: address.label,
        full_name: address.fullName,
        phone: address.phone,
        line1: address.line1,
        city: address.city,
        governorate: address.governorate
      }).select('*').single()
    ).pipe(
      map(row => this.mapAddress(row as AddressRow)),
      map(created => {
        this.addresses.update(items => [created, ...items]);
        return created;
      }),
      catchError(error => throwError(() => new Error(supabaseErrorMessage(error, 'Could not save your address.'))))
    );
  }

  removeAddress(id: string): Observable<void> {
    if (!this.auth.user()) return throwError(() => new Error('Sign in before managing addresses.'));
    return fromSupabase(
      this.supabase.from('addresses').delete().eq('id', id)
    ).pipe(
      map(() => {
        this.addresses.update(items => items.filter(address => address.id !== id));
      }),
      catchError(error => throwError(() => new Error(supabaseErrorMessage(error, 'Could not remove your address.'))))
    );
  }

  addOrder(order: Omit<LocalOrder, 'id' | 'placedAt' | 'status'>, shippingFee: number): Observable<LocalOrder> {
    const userId = this.auth.user()?.id;
    if (!userId) return throwError(() => new Error('Sign in before placing an order.'));
    const customer: OrderCustomer = order.customer ?? { fullName: '', phone: '', address: '' };
    return fromSupabase(
      this.supabase.rpc('create_order_with_items', {
        p_shipping_fee: shippingFee,
        p_items: order.items.map(item => ({
          product_id: item.productId,
          qty: item.qty
        })),
        p_customer_name: customer.fullName,
        p_phone: customer.phone,
        p_address: customer.address
      })
    ).pipe(
      switchMap(orderId => {
        return fromSupabase(
          this.supabase.from('orders').select('*, order_items(*)').eq('id', orderId).single()
        ).pipe(map(row => this.mapOrder(row as OrderRow)));
      }),
      map(created => {
        this.orders.update(items => [created, ...items]);
        return created;
      }),
      catchError(error => throwError(() => new Error(supabaseErrorMessage(error, 'Could not place your order.'))))
    );
  }

  cancelOrder(orderId: string): Observable<void> {
    if (!this.auth.user()) return throwError(() => new Error('Sign in before cancelling an order.'));
    return fromSupabase(this.supabase.rpc('cancel_order', { p_order_id: orderId })).pipe(
      map(() => {
        this.orders.update(items => items.map(item =>
          item.id === orderId ? { ...item, status: 'Cancelled' as const } : item));
      }),
      catchError(error => throwError(() => new Error(supabaseErrorMessage(error, 'Could not cancel this order.'))))
    );
  }

  submitContact(payload: { name: string; email: string; topic: string; message: string }): Observable<void> {
    return fromSupabase(
      this.supabase.from('contact_messages').insert(payload).select('id').maybeSingle()
    ).pipe(
      map(() => undefined),
      catchError(error => throwError(() => new Error(supabaseErrorMessage(error, 'Could not send your message.'))))
    );
  }

  private loadRemoteAddresses(userId: string): Observable<Address[]> {
    return fromSupabase(
      this.supabase.from('addresses').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    ).pipe(map(rows => ((rows as AddressRow[] | null) ?? []).map(row => this.mapAddress(row))));
  }

  private loadRemoteOrders(userId: string): Observable<LocalOrder[]> {
    return fromSupabase(
      this.supabase.from('orders').select('*, order_items(*)').eq('user_id', userId).order('placed_at', { ascending: false })
    ).pipe(map(rows => ((rows as OrderRow[] | null) ?? []).map(row => this.mapOrder(row))));
  }

  private mapAddress(row: AddressRow): Address {
    return {
      id: row.id,
      label: row.label ?? 'Address',
      fullName: row.full_name ?? '',
      phone: row.phone ?? '',
      line1: row.line1 ?? '',
      city: row.city ?? '',
      governorate: row.governorate ?? ''
    };
  }

  private mapOrder(row: OrderRow): LocalOrder {
    return {
      id: row.id,
      placedAt: row.placed_at,
      status: this.mapStatus(row.status),
      total: Number(row.total),
      userId: row.user_id ?? undefined,
      customerName: row.customer_name ?? undefined,
      customerPhone: row.customer_phone ?? undefined,
      deliveryAddress: row.delivery_address ?? undefined,
      items: (row.order_items ?? []).map((item: OrderItemRow) => ({
        productId: item.product_id ?? undefined,
        title: item.title,
        qty: item.qty,
        lineTotal: Number(item.line_total)
      }))
    };
  }

  private mapStatus(status: string): LocalOrder['status'] {
    if (status === 'Shipped' || status === 'Out for Delivery' || status === 'Delivered' || status === 'Cancelled') return status;
    return 'Processing';
  }
}
