import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { UserService } from '../../core/services/user.service';
import { WishlistService } from '../../core/services/wishlist.service';

@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h2 style="margin-bottom:16px">Hello{{ auth.user()?.firstName ? ', ' + auth.user()?.firstName : '' }}</h2>
    <div class="stats">
      <div class="stat"><b>{{ users.orderCount() }}</b>Orders</div>
      <div class="stat"><b>{{ wishlist.count() }}</b>Wishlist</div>
      <div class="stat"><b>{{ cart.count() }}</b>In cart</div>
    </div>
    <p class="hint">Signed in as {{ auth.user()?.email || auth.user()?.username }}.</p>
    <p style="margin-top:16px"><a class="btn btn-secondary" routerLink="/account/orders">View orders</a></p>
  `
})
export class AccountOverviewComponent {
  readonly auth = inject(AuthService);
  readonly users = inject(UserService);
  readonly wishlist = inject(WishlistService);
  readonly cart = inject(CartService);
}
