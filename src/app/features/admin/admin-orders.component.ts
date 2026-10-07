import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminOrder, AdminOrderProfile } from '../../core/models/admin.model';
import { AdminService } from '../../core/services/admin.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [RouterLink, EgpPipe, DatePipe],
  template: `
    <div class="admin-heading"><div><p class="eyebrow">Operations</p><h1>Orders</h1></div></div>
    @if (error()) { <div class="admin-error">{{ error() }}</div> }
    <div class="admin-panel table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Phone</th><th>Delivery address</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
      @for (order of orders(); track order.id) {
        <tr>
          <td>#{{ order.id.slice(0, 8) }}</td>
          <td>{{ customerName(order) }}</td>
          <td>{{ customerPhone(order) }}</td>
          <td>{{ order.delivery_address || '—' }}</td>
          <td>{{ order.placed_at | date }}</td>
          <td>{{ order.total | egp }}</td>
          <td><span class="status">{{ order.status }}</span></td>
          <td><a [routerLink]="['/admin/orders', order.id]">Open</a></td>
        </tr>
      }
      @empty { <tr><td colspan="8" class="empty">No orders yet.</td></tr> }
    </tbody></table></div>
  `
})
export class AdminOrdersComponent {
  private readonly admin = inject(AdminService);
  readonly orders = signal<AdminOrder[]>([]);
  readonly error = signal('');
  constructor() { this.reload(); }

  /** Re-reads the active order set from the backend. */
  reload(): void {
    this.admin.listOrders().subscribe({
      next: value => { this.orders.set(value); this.error.set(''); },
      error: error => this.error.set(error.message || 'Could not load orders.')
    });
  }

  customerName(order: AdminOrder): string {
    const profile = this.profile(order);
    const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    return order.customer_name || profileName || profile?.email || order.user_id || 'Guest';
  }

  customerPhone(order: AdminOrder): string {
    return order.customer_phone || this.profile(order)?.phone || '—';
  }

  private profile(order: AdminOrder): AdminOrderProfile | null {
    return Array.isArray(order.profiles) ? order.profiles[0] ?? null : order.profiles ?? null;
  }
}
