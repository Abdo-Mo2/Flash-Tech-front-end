import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models/product.model';
import { AdminCategory } from '../../core/models/admin.model';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { EgpPipe } from '../../shared/pipes/egp.pipe';

@Component({
  selector: 'app-admin-products', standalone: true, imports: [FormsModule, RouterLink, EgpPipe],
  template: `
    <div class="admin-heading"><div><p class="eyebrow">Catalog</p><h1>Products</h1></div><a class="btn btn-primary" routerLink="/admin/products/new">Add product</a></div>
    <div class="admin-toolbar"><input class="field" type="search" [(ngModel)]="search" (ngModelChange)="load()" placeholder="Search name, brand, or SKU" aria-label="Search products" /><select class="select" [(ngModel)]="category" (ngModelChange)="load()" aria-label="Filter by category"><option value="">All categories</option>@for (item of categories(); track item.slug) { <option [value]="item.slug">{{ item.name }}</option> }</select><select class="select" [(ngModel)]="sort" (ngModelChange)="load()" aria-label="Sort products"><option value="newest">Newest</option><option value="name">Name</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></div>
    @if (error()) { <div class="admin-error" role="alert">{{ error() }}</div> }
    @if (loading()) { <div class="admin-panel loading">Loading products…</div> } @else { <div class="admin-panel table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      @for (product of products(); track product.id) { <tr><td class="product-cell"><img [src]="product.thumbnail || placeholderImage" [alt]="product.title" /><span>{{ product.title }}</span></td><td>{{ product.category }}</td><td>{{ product.price | egp }}</td><td>{{ product.stock }}</td><td><span class="status" [class.out]="!product.isActive || product.stock <= 0">{{ !product.isActive ? 'Inactive' : product.stock > 0 ? 'In stock' : 'Out of stock' }}</span></td><td class="actions"><a class="admin-action admin-action-view" [routerLink]="['/product', product.id]" aria-label="View product" title="View product">↗</a><a class="admin-action admin-action-edit" [routerLink]="['/admin/products', product.id, 'edit']" aria-label="Edit product" title="Edit product">✎</a><button class="admin-action admin-action-delete" type="button" (click)="remove(product)" aria-label="Delete product" title="Delete product">×</button></td></tr> }
      @empty { <tr><td colspan="6" class="empty">No products match these filters.</td></tr> }
    </tbody></table></div> }
  `,
  styles: [`
    .admin-toolbar { display:grid; grid-template-columns:minmax(220px,1fr) 180px 180px; gap:10px; margin-bottom:16px; max-width:760px; } .loading { color:var(--text-2); }
    .admin-panel { overflow:hidden; } table { width:100%; border-collapse:collapse; font-size:13px; } th,td { text-align:left; padding:14px 16px; border-bottom:1px solid var(--line); vertical-align:middle; } th { color:var(--text-2); font-size:12px; background:var(--mist); } tr:last-child td { border-bottom:0; } .product-cell { display:flex; align-items:center; gap:12px; font-weight:600; min-width:240px; } .product-cell img { width:44px; height:44px; object-fit:contain; background:var(--mist); border-radius:4px; } .status { background:var(--teal-100); color:var(--teal); padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; } .status.out { background:var(--red-100); color:var(--red); } .actions { display:flex; gap:8px; white-space:nowrap; } .admin-action { display:grid; place-items:center; width:34px; height:34px; border:1px solid transparent; border-radius:6px; font-size:17px; font-weight:700; line-height:1; text-decoration:none; } .admin-action-view { background:var(--info-100); color:var(--info); border-color:rgba(91,143,217,.35); } .admin-action-edit { background:var(--warn-100); color:var(--amber-400); border-color:rgba(201,162,76,.35); } .admin-action-delete { background:var(--red-100); color:var(--red); border-color:rgba(224,90,79,.35); cursor:pointer; padding:0; } .admin-action:hover { transform:translateY(-1px); filter:brightness(1.15); } .empty { text-align:center; color:var(--text-2); padding:32px; }
    @media (max-width:800px) { .admin-toolbar { grid-template-columns:1fr; } .table-wrap { overflow-x:auto; } table { min-width:760px; } }
  `]
})
export class AdminProductsComponent {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  readonly products = signal<Product[]>([]);
  readonly categories = signal<AdminCategory[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"%3E%3Crect width="640" height="480" fill="%23f2f3f1"/%3E%3Cpath d="M220 150h200v180H220z" fill="none" stroke="%2371776f" stroke-width="14"/%3E%3Ccircle cx="280" cy="210" r="24" fill="%23d2a037"/%3E%3Cpath d="m240 300 65-65 45 45 30-30 40 50" fill="none" stroke="%2371776f" stroke-width="14"/%3E%3C/svg%3E';
  search = '';
  category = '';
  sort = 'newest';

  constructor() {
    this.admin.listCategories().subscribe({ next: value => this.categories.set(value) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.listProducts(this.search, this.category, this.sort).subscribe({
      next: items => { this.products.set(items); this.loading.set(false); },
      error: error => { this.error.set(error.message || 'Could not load products.'); this.loading.set(false); }
    });
  }

  remove(product: Product): void {
    if (!window.confirm(`Delete “${product.title}”? This cannot be undone.`)) return;
    this.admin.deleteProduct(product.id).subscribe({
      next: () => { this.products.update(items => items.filter(item => item.id !== product.id)); this.toast.show('Product deleted', 'success'); },
      error: error => this.toast.show(error.message || 'Could not delete product.', 'error')
    });
  }
}
