import { Component, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product, categoryLabel } from '../../core/models/product.model';
import { CatalogQuery, ProductService, ProductSort } from '../../core/services/product.service';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { ProductSkeletonComponent } from '../../shared/components/product-skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-listing-page',
  standalone: true,
  imports: [RouterLink, FormsModule, ProductCardComponent, ProductSkeletonComponent, EmptyStateComponent],
  template: `
    <div class="wrap">
      <nav class="breadcrumb listing-breadcrumb" aria-label="Breadcrumb">
        <a routerLink="/">Home</a> › {{ title() }}
      </nav>
      <div class="listing-heading">
        <div><span class="section-eyebrow">FlashTech catalog</span><h1>{{ title() }}</h1></div>
      </div>
      <div class="listing-layout">
        <div class="filters-backdrop" [class.open]="filtersOpen" (click)="filtersOpen = false"></div>
        <aside class="filters" [class.open]="filtersOpen">
          <div class="filters-head">
            <h3>Filter</h3>
            <button type="button" class="filters-close" aria-label="Close filters" (click)="filtersOpen = false">×</button>
          </div>
          @if (brands().length) {
            <div class="filter-group">
              <b style="font-size:13px">Brand</b>
              @for (b of brands(); track b) {
                <div class="opt" style="margin-top:8px">
                  <input type="checkbox" [id]="'b-'+b" [checked]="selectedBrands.has(b)" (change)="toggleBrand(b)" />
                  <label [for]="'b-'+b">{{ b }}</label>
                </div>
              }
            </div>
          }
          @for (specification of specificationFilters(); track specification.label) {
            <div class="filter-group">
              <b style="font-size:13px">{{ specification.label }}</b>
              @for (value of specification.values; track value) {
                <div class="opt" style="margin-top:8px"><input type="checkbox" [id]="'spec-'+specification.label+'-'+value" [checked]="hasSpecification(specification.label, value)" (change)="toggleSpecification(specification.label, value)" /><label [for]="'spec-'+specification.label+'-'+value">{{ value }}</label></div>
              }
            </div>
          }
          <div class="filter-group">
            <label class="field-label" for="min-p">Min price (EGP)</label>
            <input class="field" id="min-p" type="number" [(ngModel)]="minPrice" (change)="apply()" />
            <label class="field-label" for="max-p" style="margin-top:10px">Max price (EGP)</label>
            <input class="field" id="max-p" type="number" [(ngModel)]="maxPrice" (change)="apply()" />
          </div>
          <div class="filter-group">
            <div class="opt">
              <input type="checkbox" id="stock" [(ngModel)]="inStockOnly" (change)="apply()" />
              <label for="stock">In stock only</label>
            </div>
          </div>
          <button class="btn btn-ghost" type="button" (click)="clear()">Clear filters</button>
        </aside>
        <div>
          <div class="sort-row">
            <span class="result-count">{{ total() }} products found</span>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-ghost filter-toggle" type="button" (click)="filtersOpen = !filtersOpen">Filters</button>
              <div class="sort-dropdown" [class.open]="sortOpen">
                <button class="select sort-trigger" type="button" aria-haspopup="listbox" [attr.aria-expanded]="sortOpen" (click)="sortOpen = !sortOpen" (keydown.escape)="sortOpen = false">
                  {{ sortLabel(sort) }} <span class="sort-caret" aria-hidden="true">⌄</span>
                </button>
                @if (sortOpen) {
                  <ul class="sort-menu" role="listbox">
                    @for (option of sortOptions; track option.value) {
                      <li role="option" [attr.aria-selected]="option.value === sort">
                        <button type="button" [class.active]="option.value === sort" (click)="chooseSort(option.value)">{{ option.label }}</button>
                      </li>
                    }
                  </ul>
                }
              </div>
            </div>
          </div>
          @if (error()) {
            <app-empty-state title="Couldn't load this page" message="Check your connection and try again.">
              <button class="btn btn-primary" type="button" (click)="load()">Retry</button>
            </app-empty-state>
          } @else if (loading()) {
            <div class="grid4"><app-product-skeleton [count]="8" /></div>
          } @else if (!items().length) {
            <app-empty-state title="No products match" message="Try a different keyword or clear your filters.">
              <button class="btn btn-secondary" type="button" (click)="clear()">Clear filters</button>
            </app-empty-state>
          } @else {
            <div class="grid4">
              @for (p of items(); track p.id) {
                <app-product-card [product]="p" />
              }
            </div>
            <div class="pagination">
              @for (n of pages(); track n) {
                <button type="button" [class.active]="n === page" (click)="go(n)">{{ n }}</button>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ListingPageComponent {
  private readonly products = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly items = signal<Product[]>([]);
  readonly brands = signal<string[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly title = signal('Shop');
  readonly selectedBrands = new Set<string>();
  readonly specificationFilters = signal<{ label: string; values: string[] }[]>([]);
  readonly sortOptions: { value: ProductSort; label: string }[] = [
    { value: 'relevant', label: 'Sort: most relevant' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'rating', label: 'Highest rated' },
    { value: 'newest', label: 'Newest' }
  ];
  filtersOpen = false;
  sortOpen = false;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  inStockOnly = false;
  sort: ProductSort = 'relevant';
  page = 1;
  pageSize = 12;
  category = 'all';
  private search = '';
  laptopsOnly = false;
  private readonly selectedSpecifications = new Map<string, Set<string>>();

  constructor() {
    this.route.paramMap.subscribe(() => this.readAndLoad());
    this.route.queryParamMap.subscribe(() => this.readAndLoad());
  }

  private readAndLoad(): void {
    this.category = this.route.snapshot.paramMap.get('category') || this.route.snapshot.data['category'] || 'all';
    this.search = this.route.snapshot.queryParamMap.get('q') || '';
    this.laptopsOnly = this.route.snapshot.queryParamMap.get('laptop') === 'true';
    this.page = Number(this.route.snapshot.queryParamMap.get('page') || 1);
    if (this.search) this.title.set(`Results for “${this.search}”`);
    else this.title.set(this.laptopsOnly ? 'Laptops' : this.category === 'all' ? 'All products' : categoryLabel(this.category));
    this.loadBrandsThenProducts();
  }

  private loadBrandsThenProducts(): void {
    this.products.getElectronicsCatalog().subscribe({
      next: all => {
        const source = this.search
          ? all
          : this.category === 'all'
            ? all
            : this.products.filterByStoreCategory(all, this.category);
        this.brands.set([...new Set(source.map(p => p.brand))].sort());
        const labels = ['RAM', 'CPU', 'Processor', 'GPU', 'Storage', 'Screen Size', 'Resolution', 'Refresh Rate'];
        this.specificationFilters.set(labels.map(label => {
          const values = [...new Set(source
            .flatMap(product => product.specifications.filter(spec => spec.label.toLowerCase() === label.toLowerCase()).map(spec => String(spec.value ?? '').trim()))
            .filter(Boolean))].sort();
          return { label, values };
        }).filter(specification => specification.values.length));
        this.load();
      },
      error: () => this.load()
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const query: CatalogQuery = {
      category: this.search ? undefined : this.category,
      laptopOnly: this.laptopsOnly,
      specifications: Object.fromEntries([...this.selectedSpecifications].map(([label, values]) => [label, [...values]])),
      search: this.search || undefined,
      brands: [...this.selectedBrands],
      minPrice: this.minPrice ?? undefined,
      maxPrice: this.maxPrice ?? undefined,
      inStockOnly: this.inStockOnly,
      sort: this.sort,
      page: this.page,
      pageSize: this.pageSize
    };
    this.products.queryCatalog(query).subscribe({
      next: page => {
        this.items.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }

  pages(): number[] {
    const count = Math.max(1, Math.ceil(this.total() / this.pageSize));
    return Array.from({ length: Math.min(count, 8) }, (_, i) => i + 1);
  }

  go(n: number): void {
    this.page = n;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { q: this.search || null, page: n }, queryParamsHandling: 'merge' });
  }

  toggleBrand(brand: string): void {
    if (this.selectedBrands.has(brand)) this.selectedBrands.delete(brand);
    else this.selectedBrands.add(brand);
    this.page = 1;
    this.load();
  }

  hasSpecification(label: string, value: string): boolean { return this.selectedSpecifications.get(label)?.has(value) ?? false; }
  toggleSpecification(label: string, value: string): void { const values = this.selectedSpecifications.get(label) ?? new Set<string>(); values.has(value) ? values.delete(value) : values.add(value); this.selectedSpecifications.set(label, values); this.page = 1; this.load(); }

  sortLabel(value: ProductSort): string { return this.sortOptions.find(o => o.value === value)?.label ?? this.sortOptions[0].label; }
  chooseSort(value: ProductSort): void { this.sortOpen = false; if (value === this.sort) return; this.sort = value; this.apply(); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.sortOpen && !(event.target as HTMLElement).closest('.sort-dropdown')) this.sortOpen = false;
  }

  apply(): void {
    this.page = 1;
    this.load();
  }

  clear(): void {
    this.selectedBrands.clear();
    this.selectedSpecifications.clear();
    this.minPrice = null;
    this.maxPrice = null;
    this.inStockOnly = false;
    this.sort = 'relevant';
    this.sortOpen = false;
    this.page = 1;
    this.load();
  }
}
