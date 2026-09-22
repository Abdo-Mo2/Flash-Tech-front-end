import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [RouterLink, FormsModule, EgpPipe, EmptyStateComponent],
  template: `
    <div class="wrap">
      @if (placed()) {
        <div class="state-box" style="margin-top:48px">
          <h3>Order #{{ placed() }} placed</h3>
          <p>We’ll pack this at the New Cairo showroom. You can track it from your account if you signed in.</p>
          <a class="btn btn-primary" routerLink="/">Back home</a>
        </div>
      } @else if (!cart.count()) {
        <app-empty-state title="Nothing to check out" message="Add a product before starting checkout.">
          <a class="btn btn-primary" routerLink="/shop">Browse products</a>
        </app-empty-state>
      } @else {
        @if (!auth.isLoggedIn()) {
          <p class="hint" style="margin:16px 0">Sign in before placing an order so it can be securely saved to your account.</p>
        }
        <div class="stepper-nav">
          <div [class.active]="step === 1">1. Details</div>
          <div [class.active]="step === 2">2. Cash on delivery</div>
          <div [class.active]="step === 3">3. Review</div>
        </div>
        <div class="checkout-layout">
          <div class="checkout-form-card">
            @if (step === 1) {
              <h2 style="font-size:16px;margin-bottom:14px">Details</h2>
              <form class="form-grid" (submit)="toPayment($event)">
                <div>
                  <label class="field-label" for="fn">Full name</label>
                  <input class="field" id="fn" name="fullName" [(ngModel)]="fullName" minlength="2" maxlength="50" required (blur)="validateName()" />
                  @if (nameError()) { <p class="err-msg" role="alert">{{ nameError() }}</p> }
                </div>
                <div>
                  <label class="field-label" for="ph">Phone number</label>
                  <input class="field" id="ph" name="phone" [(ngModel)]="phone" pattern="^[0-9+() -]{7,11}$" minlength="7" maxlength="11" required (blur)="validatePhone()" />
                  @if (phoneError()) { <p class="err-msg" role="alert">{{ phoneError() }}</p> }
                </div>
                <div class="full">
                  <label class="field-label" for="ad">Address</label>
                  <input class="field" id="ad" name="address" [(ngModel)]="address" minlength="5" maxlength="200" required />
                </div>
                <div class="full checkout-actions">
                  <button class="btn btn-primary" type="submit">Continue to payment</button>
                </div>
              </form>
            }
            @if (step === 2) {
              <h2 style="font-size:16px;margin-bottom:14px">Cash on delivery</h2>
              <p class="hint">Pay the courier when your order arrives. Shipping is included.</p>
              <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:18px;">
                <button class="btn btn-secondary" type="button" (click)="step = 1">Edit details</button>
                <button class="btn btn-primary" type="button" (click)="step = 3">Review order</button>
              </div>
            }
            @if (step === 3) {
              <h2 style="font-size:16px;margin-bottom:14px">Review</h2>
              <div class="review-block">
                <h3 class="review-block-title">Customer details</h3>
                <dl class="review-list">
                  <div class="review-item"><dt>Customer name</dt><dd>{{ fullName }}</dd></div>
                  <div class="review-item"><dt>Phone number</dt><dd>{{ phone }}</dd></div>
                  <div class="review-item"><dt>Address</dt><dd>{{ address }}</dd></div>
                </dl>
              </div>
              <div class="review-block">
                <h3 class="review-block-title">Payment method</h3>
                <div class="review-payment">
                  <span class="review-payment-icon" aria-hidden="true">₤</span>
                  <div><strong>Cash on delivery</strong><span>Pay the courier when your order arrives.</span></div>
                </div>
              </div>
              <details class="review-policy"><summary>Return and exchange policy</summary><p class="hint">Return and exchange terms are confirmed with customer support before purchase. Keep your invoice and the product packaging, then contact support if you need help with an order.</p></details>
              <button class="btn btn-primary review-submit" type="button" [disabled]="busy()" (click)="place()">{{ busy() ? 'Placing order…' : 'Place order' }}</button>
              @if (error()) { <p class="err-msg" role="alert">{{ error() }}</p> }
            }
          </div>
          <aside class="summary-card">
            <h3 style="font-size:16px;margin-bottom:12px">Order summary</h3>
            @for (item of cart.lines(); track item.productId) {
              <div class="summary-row"><span>{{ item.title }} × {{ item.quantity }}</span><span>{{ item.unitPrice * item.quantity | egp }}</span></div>
            }
            <div class="summary-row total"><span>Total</span><span>{{ cart.total() | egp }}</span></div>
          </aside>
        </div>
      }
    </div>
  `
})
export class CheckoutPageComponent {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);

  step = 1;
  fullName = '';
  phone = '';
  address = '';
  readonly placed = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly nameError = signal('');
  readonly phoneError = signal('');

  validateName(): void {
    this.nameError.set(this.nameValidationMessage(this.fullName));
  }

  validatePhone(): void {
    this.phoneError.set(this.phoneValidationMessage(this.phone));
  }

  private nameValidationMessage(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return 'Please enter your full name.';
    if (/\d/.test(trimmed)) return 'Name cannot contain numbers.';
    if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
    if (trimmed.length > 50) return 'Full name cannot be more than 50 characters.';
    return '';
  }

  private phoneValidationMessage(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return 'Please enter your phone number.';
    if (trimmed.length > 11) return 'Phone number cannot be more than 11 characters.';
    if (!/^[0-9+() -]{7,11}$/.test(trimmed)) return 'Please enter a valid EG phone number.';
    return '';
  }

  toPayment(event: Event): void {
    event.preventDefault();

    const nameMessage = this.nameValidationMessage(this.fullName);
    const phoneMessage = this.phoneValidationMessage(this.phone);
    this.nameError.set(nameMessage);
    this.phoneError.set(phoneMessage);

    if (nameMessage || phoneMessage) {
      const message = nameMessage || phoneMessage;
      this.error.set('Fix the highlighted fields before continuing.');
      this.toast.show(message, 'error');
      return;
    }
    if (this.address.trim().length < 5) {
      this.error.set('Enter a complete delivery address.');
      this.toast.show('Enter a complete delivery address (at least 5 characters).', 'error');
      return;
    }

    this.error.set('');
    this.step = 2;
  }

  place(): void {
    if (!this.auth.isLoggedIn()) {
      this.error.set('Sign in before placing an order.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.users.addOrder({
      items: this.cart.lines().map(i => ({
        productId: i.productId,
        title: i.title,
        qty: i.quantity,
        lineTotal: i.unitPrice * i.quantity
      })),
      total: this.cart.total()
    }, this.cart.shipping()).subscribe({
      next: order => {
        this.users.addAddress({
          label: 'Checkout',
          fullName: this.fullName,
          phone: this.phone,
          line1: this.address,
          city: '',
          governorate: ''
        }).subscribe();
        this.cart.clear();
        this.busy.set(false);
        this.placed.set(order.id);
        this.toast.show('Order placed', 'success');
      },
      error: error => {
        this.busy.set(false);
        this.error.set(error.message || 'Could not place your order.');
      }
    });
  }
}
