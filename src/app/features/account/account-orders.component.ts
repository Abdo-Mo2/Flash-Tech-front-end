import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LocalOrder } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

const CANCELLABLE: LocalOrder['status'][] = ['Processing', 'Shipped'];

@Component({
  selector: 'app-account-orders',
  standalone: true,
  imports: [RouterLink, DatePipe, EgpPipe, EmptyStateComponent],
  template: `
    <h2 class="mb-4">Your orders</h2>
    @if (!users.orderList().length) {
      <app-empty-state title="No orders yet" message="When you check out, the receipt will live here on your account.">
        <a class="btn btn-primary" routerLink="/shop">Start shopping</a>
      </app-empty-state>
    } @else {
      @for (o of users.orderList(); track o.id) {
        <div class="order-row">
          <div>
            <div class="num">Order #{{ o.id }}</div>
            <div class="meta">{{ o.items[0].title }} · {{ o.placedAt | date:'d MMM' }} · {{ o.total | egp }}</div>
            @if (o.status === 'Cancelled') {
              <div class="hint">Cancelled · reserved stock was returned to the store.</div>
            }
          </div>
          <div class="order-actions">
            <span class="status" [class.delivered]="o.status === 'Delivered'" [class.cancelled]="o.status === 'Cancelled'" [class.transit]="o.status === 'Shipped' || o.status === 'Out for Delivery'" [class.processing]="o.status === 'Processing'">{{ o.status }}</span>
            @if (canCancel(o)) {
              <button class="btn btn-ghost" type="button" [disabled]="cancelling() === o.id" (click)="cancel(o)">{{ cancelling() === o.id ? 'Cancelling…' : 'Cancel order' }}</button>
            } @else if (o.status === 'Out for Delivery') {
              <span class="hint">This order is out for delivery. Contact the store if you still need to cancel it.</span>
            }
          </div>
        </div>
      }
      @if (error()) { <p class="err-msg" role="alert">{{ error() }}</p> }
    }
  `
})
export class AccountOrdersComponent {
  readonly users = inject(UserService);
  private readonly toast = inject(ToastService);
  readonly cancelling = signal('');
  readonly error = signal('');

  canCancel(order: LocalOrder): boolean {
    return CANCELLABLE.includes(order.status);
  }

  cancel(order: LocalOrder): void {
    this.cancelling.set(order.id);
    this.error.set('');
    this.users.cancelOrder(order.id).subscribe({
      next: () => {
        this.cancelling.set('');
        this.toast.show('Order cancelled and stock restored', 'success');
      },
      error: error => {
        this.cancelling.set('');
        this.error.set(error.message || 'Could not cancel this order.');
        this.toast.show(error.message || 'Could not cancel this order.', 'error');
      }
    });
  }
}
