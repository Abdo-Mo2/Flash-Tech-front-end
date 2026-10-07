import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, MAX_ORDER_QUANTITY } from '../../core/services/cart.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

const CHECKOUT_DETAILS_KEY = 'flashtech.checkout';
const NAME_MIN = 5;
const NAME_MAX = 20;
const LETTERS_ONLY = /^[A-Za-z ]+$/;

export function nameValidationMessage(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your full name.';
  if (!LETTERS_ONLY.test(trimmed)) return 'Name can only contain letters and spaces.';
  if (trimmed.length < NAME_MIN) return `Full name must be at least ${NAME_MIN} characters.`;
  if (trimmed.length > NAME_MAX) return `Full name cannot be more than ${NAME_MAX} characters.`;
  return '';
}

export function addressValidationMessage(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your delivery address.';
  if (!LETTERS_ONLY.test(trimmed)) return 'Address can only contain letters and spaces.';
  if (trimmed.length < NAME_MIN) return `Address must be at least ${NAME_MIN} characters.`;
  if (trimmed.length > NAME_MAX) return `Address cannot be more than ${NAME_MAX} characters.`;
  return '';
}

export function phoneValidationMessage(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your phone number.';
  if (trimmed.length > 11) return 'Phone number cannot be more than 11 characters.';
  if (!/^[0-9+() -]{7,11}$/.test(trimmed)) return 'Please enter a valid EG phone number.';
  return '';
}

interface CheckoutDetails {
  fullName: string;
  phone: string;
  address: string;
}

function readCheckoutDetails(): CheckoutDetails {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CHECKOUT_DETAILS_KEY) ?? '{}');
    const value = (parsed ?? {}) as Partial<CheckoutDetails>;
    return {
      fullName: typeof value.fullName === 'string' ? value.fullName : '',
      phone: typeof value.phone === 'string' ? value.phone : '',
      address: typeof value.address === 'string' ? value.address : ''
    };
  } catch {
    return { fullName: '', phone: '', address: '' };
  }
}
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
                  <input class="field" id="fn" name="fullName" [(ngModel)]="fullName" minlength="5" maxlength="20" autocomplete="name" required (blur)="validateName()" />
                  @if (nameError()) { <p class="err-msg" role="alert">{{ nameError() }}</p> }
                </div>
                <div>
                  <label class="field-label" for="ph">Phone number</label>
                  <input class="field" id="ph" name="phone" [(ngModel)]="phone" pattern="^[0-9+() -]{7,11}$" minlength="7" maxlength="11" autocomplete="tel" required (blur)="validatePhone()" />
                  @if (phoneError()) { <p class="err-msg" role="alert">{{ phoneError() }}</p> }
                </div>
                <div class="full">
                  <label class="field-label" for="ad">Address</label>
                  <input class="field" id="ad" name="address" [(ngModel)]="address" minlength="5" maxlength="20" autocomplete="street-address" required (blur)="validateAddress()" />
                  @if (addressError()) { <p class="err-msg" role="alert">{{ addressError() }}</p> }
                </div>
                <div class="full checkout-actions">
                  <button class="btn btn-primary" type="submit">Continue to payment</button>
                </div>
              </form>
            }
            @if (step === 2) {
              <h2 style="font-size:16px;margin-bottom:14px">Cash on delivery</h2>
              <p class="hint">Pay the courier when your order arrives. Shipping is included.</p>
              <div class="checkout-actions">
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
            @if (quantityWarning()) { <p class="err-msg" role="alert">{{ quantityWarning() }}</p> }
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

  private readonly saved = readCheckoutDetails();

  step = 1;
  fullName = this.saved.fullName;
  phone = this.saved.phone;
  address = this.saved.address;
  readonly placed = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly nameError = signal(this.saved.fullName ? nameValidationMessage(this.saved.fullName) : '');
  readonly phoneError = signal(this.saved.phone ? phoneValidationMessage(this.saved.phone) : '');
  readonly addressError = signal(this.saved.address ? addressValidationMessage(this.saved.address) : '');
  readonly quantityWarning = computed(() =>
    this.cart.lines().some(item => item.quantity > MAX_ORDER_QUANTITY)
      ? `Maximum ${MAX_ORDER_QUANTITY} units per product. Please reduce the highlighted quantity.`
      : ''
  );

  constructor() {
    this.persist();
  }

  validateName(): void {
    this.nameError.set(nameValidationMessage(this.fullName));
    this.persist();
  }

  validatePhone(): void {
    this.phoneError.set(phoneValidationMessage(this.phone));
    this.persist();
  }

  validateAddress(): void {
    this.addressError.set(addressValidationMessage(this.address));
    this.persist();
  }

  toPayment(event: Event): void {
    event.preventDefault();

    const nameMessage = nameValidationMessage(this.fullName);
    const phoneMessage = phoneValidationMessage(this.phone);
    const addressMessage = addressValidationMessage(this.address);
    this.nameError.set(nameMessage);
    this.phoneError.set(phoneMessage);
    this.addressError.set(addressMessage);
    this.persist();

    if (nameMessage || phoneMessage || addressMessage) {
      const message = nameMessage || phoneMessage || addressMessage;
      this.error.set('Fix the highlighted fields before continuing.');
      this.toast.show(message, 'error');
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
    const nameMessage = nameValidationMessage(this.fullName);
    const phoneMessage = phoneValidationMessage(this.phone);
    const addressMessage = addressValidationMessage(this.address);
    this.nameError.set(nameMessage);
    this.phoneError.set(phoneMessage);
    this.addressError.set(addressMessage);
    if (nameMessage || phoneMessage || addressMessage) {
      this.error.set('Fix the highlighted fields before placing the order.');
      return;
    }
    if (this.quantityWarning()) {
      this.error.set(this.quantityWarning());
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
      total: this.cart.total(),
      customer: {
        fullName: this.fullName.trim(),
        phone: this.phone.trim(),
        address: this.address.trim()
      }
    }, this.cart.shipping()).subscribe({
      next: order => {
        this.users.addAddress({
          label: 'Checkout',
          fullName: this.fullName.trim(),
          phone: this.phone.trim(),
          line1: this.address.trim(),
          city: '',
          governorate: ''
        }).subscribe();
        this.cart.clear();
        this.clearDetails();
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

  private persist(): void {
    localStorage.setItem(CHECKOUT_DETAILS_KEY, JSON.stringify({
      fullName: this.fullName,
      phone: this.phone,
      address: this.address
    } satisfies CheckoutDetails));
  }

  private clearDetails(): void {
    localStorage.removeItem(CHECKOUT_DETAILS_KEY);
  }
}
