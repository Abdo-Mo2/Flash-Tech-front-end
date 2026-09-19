import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-wishlist-page',
  standalone: true,
  imports: [RouterLink, EgpPipe, EmptyStateComponent],
  template: `
    <div class="wrap">
      <nav class="breadcrumb"><a routerLink="/">Home</a> › Wishlist</nav>
      <h1 style="font-size:22px;margin-bottom:16px">Wishlist</h1>
      @if (!wishlist.count()) {
        <app-empty-state title="Nothing saved yet" message="Tap the heart on a product card to keep it here.">
          <a class="btn btn-primary" routerLink="/shop">Browse products</a>
        </app-empty-state>
      } @else {
        @for (item of wishlist.list(); track item.productId) {
          <div class="wish-row">
            <img class="thumb" [src]="item.thumbnail" [alt]="item.title" width="64" height="64" />
            <div>
              <a [routerLink]="['/product', item.productId]"><strong>{{ item.title }}</strong></a>
              <div class="hint">{{ item.brand }} · {{ item.unitPrice | egp }}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary" type="button" (click)="move(item.productId)" [disabled]="item.stock <= 0">Add to cart</button>
              <button class="btn btn-ghost" type="button" (click)="wishlist.remove(item.productId)">Remove</button>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class WishlistPageComponent {
  readonly wishlist = inject(WishlistService);
  private readonly cart = inject(CartService);
  private readonly products = inject(ProductService);
  private readonly toast = inject(ToastService);

  move(id: string): void {
    this.products.getById(id).subscribe({
      next: p => {
        this.cart.add(p);
        this.toast.show('Moved to cart', 'success');
      },
      error: () => this.toast.show('Could not add that product right now.', 'error')
    });
  }
}
