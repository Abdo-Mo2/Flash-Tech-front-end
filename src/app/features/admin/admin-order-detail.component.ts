import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminOrder, AdminOrderProfile } from '../../core/models/admin.model';
import { AdminService } from '../../core/services/admin.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';
import { ToastService } from '../../core/services/toast.service';

const ORDER_STATUSES = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'] as const;

/** Statuses that finalise an order; the backend archives these automatically. */
const FINAL_STATUSES: readonly string[] = ['Delivered', 'Cancelled'];

function isFinalStatus(status: string): boolean {
  return FINAL_STATUSES.includes(status);
}

@Component({
  selector: 'app-admin-order-detail', standalone: true, imports: [DatePipe, RouterLink, FormsModule, EgpPipe],
  template: `
    <div class="admin-heading"><div><p class="eyebrow">Order</p><h1>#{{ order()?.id?.slice(0, 8) }}</h1></div><div style="display:flex;gap:12px"><a routerLink="/">View storefront</a><a routerLink="/admin/orders">Back to orders</a></div></div>
    @if (error()) { <div class="admin-error" role="alert">{{ error() }}</div> }
    @if (order(); as current) {
      <div class="admin-grid">
        <section class="admin-panel">
          <h2>Items</h2>
          @for (item of current.order_items || []; track item.title) { <div class="item"><span>{{ item.title }} × {{ item.qty }} <small>{{ item.unit_price | egp }} each</small></span><strong>{{ item.line_total | egp }}</strong></div> }
          @empty { <p class="hint">No line items were recorded for this order.</p> }
          <div class="item"><span>Order total</span><strong>{{ current.total | egp }}</strong></div>
        </section>
        <aside class="admin-panel">
          <h2>Customer</h2>
          <p>Name: <strong>{{ customerName(current) }}</strong></p>
          <p>Phone: <strong>{{ customerPhone(current) }}</strong></p>
          <p>Email: {{ customerEmail(current) }}</p>
          <p>Delivery address: {{ current.delivery_address || '—' }}</p>
          <h2 style="margin-top:20px">Order details</h2>
          <p>Placed: {{ current.placed_at | date:'d MMM yyyy, HH:mm' }}</p>
          <p>Status: <strong>{{ current.status }}</strong></p>
          <label>Update status<select class="select" [(ngModel)]="status" (change)="update()">@for (option of statuses; track option) { <option [value]="option">{{ option }}</option> }</select></label>
          <p class="hint">Cancelling an order returns its reserved stock exactly once. Orders out for delivery cannot be cancelled online.</p>
        </aside>
      </div>
    }
  `
})
export class AdminOrderDetailComponent {
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly statuses = ORDER_STATUSES;
  readonly order = signal<AdminOrder | null>(null);
  readonly error = signal('');
  status = 'Processing';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.admin.getOrder(id).subscribe({
      next: value => { this.order.set(value); this.status = value.status; },
      error: error => this.error.set(error.message || 'Could not load order.')
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

  customerEmail(order: AdminOrder): string {
    return this.profile(order)?.email || '—';
  }

  private profile(order: AdminOrder): AdminOrderProfile | null {
    return Array.isArray(order.profiles) ? order.profiles[0] ?? null : order.profiles ?? null;
  }

  update(): void {
    const id = this.order()?.id;
    if (!id) return;
    const next = this.status;
    const final = isFinalStatus(next);
    // finalizeOrder runs the whole finalisation server-side in one transaction:
    // status change + revenue sync (Delivered) or stock restoration (Cancelled),
    // then the order is archived so it leaves the active Orders list.
    this.admin.finalizeOrder(id, next).subscribe({
      next: () => {
        if (final) {
          // The order no longer exists in the active set; go back to the list,
          // which reloads from the backend on construction.
          this.toast.show(
            next === 'Delivered'
              ? 'Order delivered — revenue recorded and removed from active orders.'
              : 'Order cancelled — stock restored and removed from active orders.',
            'success'
          );
          void this.router.navigate(['/admin/orders']);
          return;
        }
        this.order.update(current => current ? { ...current, status: next } : current);
        this.toast.show('Order status updated', 'success');
      },
      error: error => {
        this.status = this.order()?.status || 'Processing';
        this.toast.show(error.message || 'Could not update order', 'error');
      }
    });
  }
}

