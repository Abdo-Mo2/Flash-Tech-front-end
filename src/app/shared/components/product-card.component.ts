import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models/product.model';
import { isInStock } from '../../core/mappers/product.mapper';
import { EgpPipe } from '../pipes/egp.pipe';
import { ListEgpPipe, SaleEgpPipe } from '../pipes/price.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe, EgpPipe, SaleEgpPipe, ListEgpPipe],
  template: `
    @if (product) {
      <article class="prod-card">
        <div class="img">
          <a [routerLink]="['/product', product.id]" class="block h-full w-full">
            <img class="h-full w-full object-contain object-center" [src]="product.thumbnail || fallbackImage" [alt]="product.title" width="640" height="480" loading="lazy" decoding="async" (error)="useFallback($event)" />
          </a>
          @if (product.discountPercentage >= 1) {
            <span class="product-sale-badge">-{{ product.discountPercentage | number:'1.0-0' }}%</span>
          }
        </div>
        <div class="body">
          <span class="badge" [class.stock]="inStock" [class.out]="!inStock">
            {{ inStock ? 'In stock' : 'Out of stock' }}
          </span>
          <span class="brand">{{ product.brand }}</span>
          <a class="title" [routerLink]="['/product', product.id]">{{ product.title }}</a>
          <span class="product-rating">★ {{ product.rating | number:'1.1-1' }}</span>
          <span class="price">
            {{ product | saleEgp | egp }}
            @if (product.discountPercentage >= 1) {
              <span class="old">{{ product | listEgp | egp }}</span>
            }
          </span>
        </div>
      </article>
    }
  `
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  readonly fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"%3E%3Crect width="640" height="480" fill="%23f2f3f1"/%3E%3Cpath d="M220 150h200v180H220z" fill="none" stroke="%2371776f" stroke-width="14"/%3E%3Ccircle cx="280" cy="210" r="24" fill="%23d2a037"/%3E%3Cpath d="m240 300 65-65 45 45 30-30 40 50" fill="none" stroke="%2371776f" stroke-width="14"/%3E%3C/svg%3E';

  get inStock(): boolean {
    return isInStock(this.product);
  }

  useFallback(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src !== this.fallbackImage) {
      image.src = this.fallbackImage;
      image.classList.add('image-fallback');
    }
  }

}
