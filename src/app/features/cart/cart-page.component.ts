import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [RouterLink, EgpPipe, EmptyStateComponent],
  template: `
    <div class="wrap">
      <h1 style="font-size:22px;margin:24px 0 8px">Your cart ({{ cart.count() }} items)</h1>
      @if (!cart.count()) {
        <app-empty-state title="Your cart is empty" message="Laptops, phones, and accessories will show up here once you add them.">
          <a class="btn btn-primary" routerLink="/shop/laptops">Shop laptops</a>
        </app-empty-state>
      } @else {
        <div class="cart-layout">
          <div>
            @for (item of cart.lines(); track item.productId) {
              <div class="cart-item">
                <img class="thumb" [src]="item.thumbnail" [alt]="item.title" />
                <div>
                  <div class="title">{{ item.title }}</div>
                  <div class="hint">{{ item.brand }}</div>
                  <button class="remove" type="button" (click)="cart.remove(item.productId)">Remove</button>
                </div>
                <div class="stepper">
                  <button type="button" aria-label="Decrease" (click)="cart.setQuantity(item.productId, item.quantity - 1)">−</button>
                  <span>{{ item.quantity }}</span>
                  <button type="button" aria-label="Increase" (click)="cart.setQuantity(item.productId, item.quantity + 1)">+</button>
                </div>
                <div style="font-family:'Space Grotesk',sans-serif;font-weight:600">{{ item.unitPrice * item.quantity | egp }}</div>
              </div>
            }
          </div>
          <aside class="summary-card">
            <h3 style="font-size:16px;margin-bottom:12px">Order summary</h3>
            <div class="summary-row"><span>Subtotal</span><span>{{ cart.subtotal() | egp }}</span></div>
            <div class="summary-row"><span>Shipping</span><span>{{ cart.shipping() | egp }}</span></div>
            <div class="summary-row total"><span>Total</span><span>{{ cart.total() | egp }}</span></div>
            <a class="btn btn-primary" style="width:100%;margin-top:14px" routerLink="/checkout">Proceed to checkout</a>
            <p class="guest-note">You can check out as a guest — no account required.</p>
          </aside>
        </div>
      }
    </div>
  `
})
export class CartPageComponent {
  readonly cart = inject(CartService);
}
