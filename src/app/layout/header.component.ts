import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { Product } from '../core/models/product.model';
import { AuthService } from '../core/services/auth.service';
import { CartService } from '../core/services/cart.service';
import { ProductService } from '../core/services/product.service';
import { WishlistService } from '../core/services/wishlist.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ReactiveFormsModule],
  template: `
    <header class="site-header">
      <div class="promo-strip">
        <div class="inner">
          <span>Free shipping in Cairo &amp; Giza · 50 EGP nationwide</span>
          <div class="links">
            <a routerLink="/account/orders">Track Order</a>
            <a routerLink="/contact">Help Center</a>
          </div>
        </div>
      </div>
      <div class="top-row">
        <button class="icon-btn menu-toggle" type="button" aria-label="Open menu" (click)="menuOpen = !menuOpen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <a routerLink="/" class="logo">Flash<span>Tech</span></a>
        <form class="search-wrap" (submit)="submitSearch($event)">
          <label class="visually-hidden" for="site-search">Search products</label>
          <input
            id="site-search"
            type="search"
            [formControl]="query"
            placeholder="Search graphics cards, laptops, components…"
            autocomplete="off"
            (focus)="showPanel = true"
            (blur)="onBlur()" />
          <button class="ic" type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
          @if (showPanel && (suggestions().length || query.value)) {
            <div class="search-panel" role="listbox">
              @if (searching()) {
                <div class="empty">Searching…</div>
              } @else if (suggestions().length) {
                @for (p of suggestions(); track p.id) {
                  <a [routerLink]="['/product', p.id]" (mousedown)="showPanel = false" class="block">
                    <img class="h-10 w-10 object-contain object-center" [src]="p.thumbnail" [alt]="p.title" />
                    <span>{{ p.title }}</span>
                  </a>
                }
              } @else if (query.value.length > 1) {
                <div class="empty">No matches for “{{ query.value }}”</div>
              }
            </div>
          }
        </form>
        <div class="icon-row">
          @if (auth.user(); as user) {
            <span class="account-chip">{{ user.firstName }}</span>
          }
          @if (auth.user()?.role === 'admin') {
            <a class="icon-btn" routerLink="/admin/dashboard" aria-label="Admin dashboard">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            </a>
          }
          <a class="icon-btn" routerLink="/wishlist" aria-label="Wishlist">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z"/></svg>
            @if (wishlist.count()) {
              <span class="dot">{{ wishlist.count() }}</span>
            }
          </a>
          <a class="icon-btn" [routerLink]="auth.isLoggedIn() ? '/account' : '/auth'" [attr.aria-label]="auth.isLoggedIn() ? 'Account' : 'Sign in'">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 19.5c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5"/></svg>
          </a>
          <a class="icon-btn" routerLink="/cart" [attr.aria-label]="'Cart, ' + cart.count() + ' items'">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l1.5 11h10.2L20 8H7"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>
            @if (cart.count()) {
              <span class="dot">{{ cart.count() }}</span>
            }
          </a>
        </div>
      </div>
      <nav class="category-nav" aria-label="Categories">
        <div class="category-menu">
          <a routerLink="/shop" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="category-menu-trigger" aria-haspopup="true">
            All Categories <span aria-hidden="true">⌄</span>
          </a>
          <div class="category-mega-menu" role="menu">
            @for (group of categoryGroups; track group.label) {
              <section>
                <h2>{{ group.label }}</h2>
                @for (item of group.items; track item.label) {
                  <a [routerLink]="item.path" role="menuitem">{{ item.label }}</a>
                }
              </section>
            }
          </div>
        </div>
        @for (link of navLinks; track link.path) {
          <a [routerLink]="link.path" [queryParams]="link.queryParams" routerLinkActive="active" [routerLinkActiveOptions]="link.exact ? { exact: true } : { exact: false }">{{ link.label }}</a>
        }
      </nav>
      <nav class="mobile-nav" [class.open]="menuOpen" aria-label="Mobile">
        <a routerLink="/shop" (click)="menuOpen = false">All Categories</a>
        @for (group of categoryGroups; track group.label) {
          <div class="mobile-nav-group">
            <strong>{{ group.label }}</strong>
            @for (item of group.items; track item.label) {
              <a [routerLink]="item.path" (click)="menuOpen = false">{{ item.label }}</a>
            }
          </div>
        }
        @for (link of navLinks; track link.path) {
          <a [routerLink]="link.path" [queryParams]="link.queryParams" (click)="menuOpen = false">{{ link.label }}</a>
        }
      </nav>
    </header>
  `
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly wishlist = inject(WishlistService);
  private readonly products = inject(ProductService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navLinks = [
    { label: 'Laptops', path: '/shop', queryParams: { laptop: 'true' }, exact: false },
    { label: 'Deals', path: '/shop/deals', exact: false },
    { label: 'Support', path: '/contact', exact: false }
  ];

  readonly categoryGroups = [
    {
      label: 'Computers',
      items: [
        { label: 'Desktop PCs', path: '/shop/desktop-pcs' },
        { label: 'Laptops', path: '/shop/laptops' },
        { label: 'Gaming Monitors', path: '/shop/gaming-monitors' }
      ]
    },
    {
      label: 'Components',
      items: [
        { label: 'Graphics Cards', path: '/shop/graphics-cards' },
        { label: 'Processors', path: '/shop/processors' },
        { label: 'RAM and Memory', path: '/shop/ram-and-memory' },
        { label: 'Storage', path: '/shop/storage' },
        { label: 'Cases', path: '/shop/cases' }
      ]
    },
    {
      label: 'Accessories',
      items: [
        { label: 'Headphones', path: '/shop/gaming-headphones' },
        { label: 'Keyboards and Mice', path: '/shop/keyboards-and-mice' },
        { label: 'Laptop Accessories', path: '/shop/laptop-accessories' }
      ]
    }
  ];

  readonly query = new FormControl('', { nonNullable: true });
  readonly suggestions = signal<Product[]>([]);
  readonly searching = signal(false);
  showPanel = false;
  menuOpen = false;

  constructor() {
    this.query.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(value => {
        const q = value.trim();
        if (q.length < 2) {
          this.suggestions.set([]);
          this.searching.set(false);
          return of(null);
        }
        this.searching.set(true);
        return this.products.searchRemote(q, 6, 0);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(page => {
      this.searching.set(false);
      if (page) this.suggestions.set(page.items.slice(0, 6));
    });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.menuOpen = false;
      this.showPanel = false;
    });
  }

  submitSearch(event: Event): void {
    event.preventDefault();
    const q = this.query.value.trim();
    if (!q) return;
    this.showPanel = false;
    void this.router.navigate(['/search'], { queryParams: { q } });
  }

  onBlur(): void {
    setTimeout(() => (this.showPanel = false), 180);
  }
}
