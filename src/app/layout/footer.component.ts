import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { STORE_CATEGORIES } from '../core/models/product.model';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <footer class="site-footer">
      <div class="footer-grid">
        <div class="footer-brand">
          <h4>Flash Tech</h4>
          <p>New Cairo showroom. One phone line, one email — the same details you’ll see at checkout.</p>
          <p>010 0000 0000<br />hello&#64;flashtech.demo</p>
        </div>
        <div>
          <h4>Shop</h4>
          @for (c of categories.slice(0, 4); track c.slug) {
            <a [routerLink]="['/shop', c.slug]">{{ c.label }}</a>
          }
        </div>
        <div>
          <h4>Support</h4>
          <a routerLink="/contact">Contact &amp; FAQ</a>
          <a routerLink="/contact" fragment="shipping">Shipping</a>
          <a routerLink="/contact" fragment="returns">Returns</a>
          <a routerLink="/account/orders">Track order</a>
        </div>
        <div>
          <h4>Stay in the loop</h4>
          <p>New arrivals and restocks. No spam.</p>
          <form class="footer-form" (submit)="subscribe($event)">
            <label class="visually-hidden" for="footer-email">Email</label>
            <input id="footer-email" type="email" name="email" [(ngModel)]="email" required placeholder="name@email.com" />
            <button class="btn btn-primary" type="submit">Join</button>
          </form>
          <p style="margin-top:12px">
            <a href="https://facebook.com" target="_blank" rel="noopener">Facebook</a>
            <a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a>
            <a href="https://tiktok.com" target="_blank" rel="noopener">TikTok</a>
          </p>
        </div>
      </div>
      <div class="footer-copy">© {{ year }} Flash Tech. Demo storefront powered by a swappable product API.</div>
    </footer>
  `
})
export class FooterComponent {
  private readonly toast = inject(ToastService);
  readonly categories = STORE_CATEGORIES;
  readonly year = new Date().getFullYear();
  email = '';

  subscribe(event: Event): void {
    event.preventDefault();
    this.toast.show('You’re on the list. We’ll only write when stock actually lands.', 'success');
    this.email = '';
  }
}
