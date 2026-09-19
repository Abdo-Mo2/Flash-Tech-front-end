import { Injectable, computed, signal } from '@angular/core';
import { WishlistItem } from '../models/cart.model';
import { Product } from '../models/product.model';
import { salePrice } from '../mappers/product.mapper';

const WISH_KEY = 'flashtech.wishlist';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly items = signal<WishlistItem[]>(this.read());

  readonly list = this.items.asReadonly();
  readonly count = computed(() => this.items().length);
  readonly ids = computed(() => new Set(this.items().map(i => i.productId)));

  has(productId: string): boolean {
    return this.ids().has(productId);
  }

  toggle(product: Product): void {
    if (this.has(product.id)) {
      this.remove(product.id);
      return;
    }
    this.write([
      ...this.items(),
      {
        productId: product.id,
        title: product.title,
        brand: product.brand,
        thumbnail: product.thumbnail,
        unitPrice: salePrice(product),
        stock: product.stock
      }
    ]);
  }

  remove(productId: string): void {
    this.write(this.items().filter(i => i.productId !== productId));
  }

  private write(items: WishlistItem[]): void {
    this.items.set(items);
    localStorage.setItem(WISH_KEY, JSON.stringify(items));
  }

  private read(): WishlistItem[] {
    try {
      const raw = localStorage.getItem(WISH_KEY);
      return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
    } catch {
      return [];
    }
  }
}
