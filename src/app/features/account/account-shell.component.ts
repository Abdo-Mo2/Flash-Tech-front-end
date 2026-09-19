import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-account-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="wrap">
      <div class="dash-layout">
        <nav class="dash-nav" aria-label="Account">
          <div class="account-person">
            <span>{{ (auth.user()?.firstName || 'A').slice(0, 1) }}</span>
            <div><strong>{{ auth.user()?.firstName || 'My account' }}</strong><small>{{ auth.user()?.email }}</small></div>
          </div>
          <a routerLink="/account" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Overview</a>
          <a routerLink="/account/orders" routerLinkActive="active">Orders</a>
          <a routerLink="/account/addresses" routerLinkActive="active">Addresses</a>
          <a routerLink="/account/wishlist" routerLinkActive="active">Wishlist</a>
          <a routerLink="/account/profile" routerLinkActive="active">Account info</a>
          <a routerLink="/account/settings" routerLinkActive="active">Settings</a>
          <button type="button" (click)="auth.logout()">Log out</button>
        </nav>
        <div class="account-content">
          <router-outlet />
        </div>
      </div>
    </div>
  `
})
export class AccountShellComponent {
  readonly auth = inject(AuthService);
  private readonly users = inject(UserService);

  constructor() {
    this.users.reload();
    this.auth.loadProfile().subscribe();
  }
}
