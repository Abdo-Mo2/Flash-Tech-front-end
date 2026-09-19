import { Injectable, computed, signal } from '@angular/core';
import { CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';
import { salePrice } from '../mappers/product.mapper';

const CART_KEY = 'flashtech.cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly items = signal<CartItem[]>(this.read());

  readonly lines = this.items.asReadonly();
  readonly count = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  readonly subtotal = computed(() =>
    this.items().reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  );
  readonly shipping = computed(() => {
    return 0;
  });
  readonly total = computed(() => this.subtotal() + this.shipping());

  add(product: Product, qty = 1): void {
    if (product.stock <= 0) return;
    const unitPrice = salePrice(product);
    const current = this.items();
    const existing = current.find(i => i.productId === product.id);
    if (existing) {
      const nextQty = Math.min(existing.quantity + qty, product.stock);
      this.write(current.map(i => (i.productId === product.id ? { ...i, quantity: nextQty } : i)));
      return;
    }
    this.write([
      ...current,
      {
        productId: product.id,
        title: product.title,
        brand: product.brand,
        thumbnail: product.thumbnail,
        unitPrice,
        quantity: Math.min(qty, product.stock),
        stock: product.stock
      }
    ]);
  }

  setQuantity(productId: string, quantity: number): void {
    const current = this.items();
    const item = current.find(i => i.productId === productId);
    if (!item) return;
    const next = Math.max(1, Math.min(quantity, item.stock));
    this.write(current.map(i => (i.productId === productId ? { ...i, quantity: next } : i)));
  }

  remove(productId: string): void {
    this.write(this.items().filter(i => i.productId !== productId));
  }

  clear(): void {
    this.write([]);
  }

  private write(items: CartItem[]): void {
    this.items.set(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  private read(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
