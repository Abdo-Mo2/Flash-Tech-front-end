import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product, categoryLabel } from '../../core/models/product.model';
import { isInStock } from '../../core/mappers/product.mapper';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';
import { ListEgpPipe, SaleEgpPipe } from '../../shared/pipes/price.pipe';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { ProductSkeletonComponent } from '../../shared/components/product-skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [RouterLink, DecimalPipe, EgpPipe, SaleEgpPipe, ListEgpPipe, ProductCardComponent, ProductSkeletonComponent, EmptyStateComponent],
  template: `
    <div class="wrap product-page">
      @if (error()) {
        <app-empty-state title="Product unavailable" message="This listing could not be loaded.">
          <a class="btn btn-primary" routerLink="/shop">Back to shop</a>
        </app-empty-state>
      } @else if (loading() || !product()) {
        <div class="pd-layout pd-primary-section pd-loading-layout">
          <div class="skel" style="height:340px"></div>
          <div><div class="skel skel-line" style="height:28px;width:80%"></div><div class="skel skel-line w60" style="margin-top:12px"></div></div>
          <div><div class="skel skel-line" style="height:46px;width:80%"></div><div class="skel skel-line" style="height:90px;margin-top:18px"></div></div>
        </div>
        <div class="grid4"><app-product-skeleton [count]="4" /></div>
      } @else {
        @if (product(); as p) {
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a routerLink="/">Home</a> › <a [routerLink]="['/shop', storeSlug(p.category)]">{{ categoryLabel(p.category) }}</a> › {{ p.title }}
        </nav>
        <section class="pd-layout pd-primary-section">
          <div class="pd-gallery">
            <div class="pd-main-img"><img class="h-full w-full object-contain object-center" [src]="activeImage()" [alt]="p.title" /></div>
            <div class="pd-thumbs">
              @for (img of p.images; track img) {
                <button type="button" [class.active]="img === activeImage()" (click)="activeImage.set(img)"><img [src]="img" [alt]="'Thumbnail of ' + p.title" /></button>
              }
            </div>
          </div>
          <div class="pd-description">
            <span class="brand">{{ p.brand }}</span>
            <h1>{{ p.title }}</h1>
            <div class="stars" [attr.aria-label]="'Rated ' + p.rating">★ {{ p.rating | number:'1.1-1' }} · {{ p.reviews.length }} reviews</div>
            <p class="pd-description-copy">{{ p.description }}</p>
            <div class="pd-identifiers"><span><small>Model</small>{{ p.title }}</span><span><small>SKU</small>{{ p.sku }}</span></div>
            <div class="pd-divider"></div>
            <h2>Specifications</h2>
            <ul class="pd-specs">
              @for (s of p.specifications; track s.label + s.value) { <li><span>{{ s.label }}</span><span>{{ s.value }}</span></li> }
            </ul>
          </div>
          <aside class="pd-buybox">
            <span class="badge" [class.stock]="inStock(p)" [class.out]="!inStock(p)">{{ inStock(p) ? 'In stock - ships in 1-2 days' : 'Out of stock' }}</span>
            <div class="pd-price">{{ p | saleEgp | egp }} @if (p.discountPercentage >= 1) { <span class="old">{{ p | listEgp | egp }}</span><span class="badge sale">-{{ p.discountPercentage | number:'1.0-0' }}%</span> }</div>
            <div class="qty-row"><div class="stepper"><button type="button" aria-label="Decrease quantity" (click)="qty = Math.max(1, qty - 1)">-</button><span>{{ qty }}</span><button type="button" aria-label="Increase quantity" (click)="qty = Math.min(p.stock || 1, qty + 1)">+</button></div><span class="pd-stock-note">{{ p.stock }} left at this price</span></div>
            <div class="cta-row">
              @if (inStock(p)) { <button class="btn btn-primary" type="button" (click)="add(p)">Add to cart</button> } @else { <button class="btn btn-secondary" type="button" (click)="toast.show('We will notify you on this device when it returns.', 'info')">Notify me</button> }
              <button class="icon-btn" type="button" [attr.aria-label]="wishlist.has(p.id) ? 'Remove from wishlist' : 'Add to wishlist'" (click)="wishlist.toggle(p)">♥</button>
            </div>
            <p class="hint pd-buybox-note">{{ p.shippingInformation }} · {{ p.warrantyInformation }}</p>
          </aside>
        </section>
        <div class="pd-section-divider"></div>
        <section class="pd-ratings" aria-labelledby="customer-ratings-title">
          <div class="pd-section-heading"><div><span class="section-eyebrow">Customer feedback</span><h2 id="customer-ratings-title">Customer ratings</h2></div><span class="pd-rating-total">{{ p.reviews.length }} reviews</span></div>
          @if (p.reviews.length) {
            <div class="pd-rating-bars">
              @for (rating of [5, 4, 3, 2, 1]; track rating) { <div class="pd-rating-row"><span>{{ rating }} star</span><div class="pd-rating-track"><span [style.width.%]="ratingPercent(p, rating)"></span></div><strong>{{ ratingCount(p, rating) }}</strong></div> }
            </div>
          } @else { <p class="hint">No customer ratings yet.</p> }
        </section>
        <div class="pd-section-divider"></div>
        <section aria-labelledby="related-products-title">
          <div class="section-title"><h2 id="related-products-title">You Might Also Like</h2></div>
          <div class="grid4" style="padding-bottom:48px">@for (r of related(); track r.id) { <app-product-card [product]="r" /> }</div>
        </section>
        }
      }
    </div>
  `
})
export class ProductPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly products = inject(ProductService);
  private readonly cart = inject(CartService);
  readonly wishlist = inject(WishlistService);
  readonly toast = inject(ToastService);
  readonly categoryLabel = categoryLabel;
  readonly product = signal<Product | null>(null);
  readonly related = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly activeImage = signal('');
  readonly Math = Math;
  qty = 1;

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) { this.error.set(true); this.loading.set(false); return; }
      this.loading.set(true);
      this.error.set(false);
      this.products.getById(id).subscribe({
        next: product => {
          this.product.set(product);
          this.activeImage.set(product.images[0] || product.thumbnail);
          this.qty = 1;
          this.loading.set(false);
          this.products.getRelated(product, 4).subscribe(related => this.related.set(related));
        },
        error: () => { this.loading.set(false); this.error.set(true); }
      });
    });
  }

  inStock(product: Product): boolean { return isInStock(product); }
  add(product: Product): void { this.cart.add(product, this.qty); this.toast.show('Added to cart', 'success'); }
  ratingCount(product: Product, rating: number): number { return product.reviews.filter(review => Math.round(review.rating) === rating).length; }
  ratingPercent(product: Product, rating: number): number { return product.reviews.length ? this.ratingCount(product, rating) / product.reviews.length * 100 : 0; }
  storeSlug(category: string): string { if (category === 'mobile-accessories') return 'accessories'; if (category.includes('watch')) return 'watches'; return category; }
}
