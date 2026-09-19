import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminOrder } from '../../core/models/admin.model';
import { AdminService } from '../../core/services/admin.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-order-detail', standalone: true, imports: [RouterLink, FormsModule, EgpPipe],
  template: `
    <div class="admin-heading"><div><p class="eyebrow">Order</p><h1>#{{ order()?.id?.slice(0, 8) }}</h1></div><div style="display:flex;gap:12px"><a routerLink="/">View storefront</a><a routerLink="/admin/orders">Back to orders</a></div></div>
    @if (error()) { <div class="admin-error">{{ error() }}</div> }
    @if (order(); as current) { <div class="admin-grid"><section class="admin-panel"><h2>Items</h2>@for (item of current.order_items || []; track item.title) { <div class="item"><span>{{ item.title }} × {{ item.qty }}</span><strong>{{ item.line_total | egp }}</strong></div> }</section><aside class="admin-panel"><h2>Order details</h2><p>Customer: {{ current.profiles?.email || current.user_id }}</p><p>Total: <strong>{{ current.total | egp }}</strong></p><label>Status<select class="select" [(ngModel)]="status" (change)="update()"><option>Processing</option><option>Shipped</option><option>Out for Delivery</option><option>Delivered</option><option>Cancelled</option></select></label></aside></div> }
  `
})
export class AdminOrderDetailComponent {
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly order = signal<AdminOrder | null>(null);
  readonly error = signal('');
  status = 'Processing';
  constructor() { const id = this.route.snapshot.paramMap.get('id') || ''; this.admin.getOrder(id).subscribe({ next: value => { this.order.set(value); this.status = value.status; }, error: error => this.error.set(error.message || 'Could not load order.') }); }
  update(): void { const id = this.order()?.id; if (!id) return; this.admin.updateOrderStatus(id, this.status).subscribe({ next: () => this.toast.show('Order status updated', 'success'), error: error => this.toast.show(error.message || 'Could not update order', 'error') }); }
}
