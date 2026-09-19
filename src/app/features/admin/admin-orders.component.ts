import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminOrder } from '../../core/models/admin.model';
import { AdminService } from '../../core/services/admin.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';

@Component({
  selector: 'app-admin-orders', standalone: true, imports: [RouterLink, EgpPipe, DatePipe],
  template: `
    <div class="admin-heading"><div><p class="eyebrow">Operations</p><h1>Orders</h1></div></div>
    @if (error()) { <div class="admin-error">{{ error() }}</div> }
    <div class="admin-panel table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
      @for (order of orders(); track order.id) { <tr><td>#{{ order.id.slice(0, 8) }}</td><td>{{ order.profiles?.email || order.user_id || 'Guest' }}</td><td>{{ order.placed_at | date }}</td><td>{{ order.total | egp }}</td><td><span class="status">{{ order.status }}</span></td><td><a [routerLink]="['/admin/orders', order.id]">Open</a></td></tr> }
      @empty { <tr><td colspan="6" class="empty">No active orders. Delivered and cancelled orders are kept in monthly sales history.</td></tr> }
    </tbody></table></div>
  `
})
export class AdminOrdersComponent {
  private readonly admin = inject(AdminService);
  readonly orders = signal<AdminOrder[]>([]);
  readonly error = signal('');
  constructor() { this.admin.listOrders().subscribe({ next: value => this.orders.set(value), error: error => this.error.set(error.message || 'Could not load orders.') }); }
}
