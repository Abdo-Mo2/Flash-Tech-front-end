import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { UserService } from '../../core/services/user.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-account-orders',
  standalone: true,
  imports: [RouterLink, DatePipe, EgpPipe, EmptyStateComponent],
  template: `
    <h2 style="margin-bottom:16px">Your orders</h2>
    @if (!users.orderList().length) {
      <app-empty-state title="No orders yet" message="When you check out, the receipt will live here on this device.">
        <a class="btn btn-primary" routerLink="/shop">Start shopping</a>
      </app-empty-state>
    } @else {
      @for (o of users.orderList(); track o.id) {
        <div class="order-row">
          <div>
            <div class="num">Order #{{ o.id }}</div>
            <div class="meta">{{ o.items[0].title }} · {{ o.placedAt | date:'d MMM' }} · {{ o.total | egp }}</div>
          </div>
          <span class="status" [class.delivered]="o.status === 'Delivered'" [class.transit]="o.status === 'Shipped' || o.status === 'Out for Delivery'" [class.processing]="o.status === 'Processing'">{{ o.status }}</span>
        </div>
      }
    }
  `
})
export class AccountOrdersComponent {
  readonly users = inject(UserService);
}
