import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, shareReplay } from 'rxjs';
import { Product, ProductPage } from '../models/product.model';
import { ProductRow } from '../models/supabase.model';
import { isInStock, mapProduct, salePrice } from '../mappers/product.mapper';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { fromSupabase } from '../supabase/supabase.util';

export type ProductSort = 'relevant' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

export interface CatalogQuery {
  category?: string;
  search?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  laptopOnly?: boolean;
  specifications?: Record<string, string[]>;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly supabase = inject(SupabaseClientService).client;
  private electronics$?: Observable<Product[]>;

  getById(id: string): Observable<Product> {
    return fromSupabase(
      this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(map(row => mapProduct(row as ProductRow)));
  }

  searchRemote(q: string, limit = 100, skip = 0): Observable<ProductPage> {
    const term = q.replace(/,/g, ' ').trim();
    const pattern = `%${term}%`;
    return fromSupabase(
      this.supabase
      .from('products')
        .select('*', { count: 'exact' })
        .or(`name.ilike.${pattern},brand.ilike.${pattern},description.ilike.${pattern}`)
        .eq('is_active', true)
        .range(skip, skip + limit - 1)
    ).pipe(
      map(rows => {
        const items = ((rows as ProductRow[] | null) ?? []).map(mapProduct);
        return this.toPage(items, skip, limit);
      })
    );
  }

  getByApiCategory(apiSlug: string, limit = 12, skip = 0): Observable<ProductPage> {
    return fromSupabase(
      this.supabase
      .from('products')
        .select('*', { count: 'exact' })
        .eq('category', apiSlug)
        .eq('is_active', true)
        .range(skip, skip + limit - 1)
    ).pipe(
      map(rows => {
        const items = ((rows as ProductRow[] | null) ?? []).map(mapProduct);
        return this.toPage(items, skip, limit);
      })
    );
  }

  getElectronicsCatalog(): Observable<Product[]> {
    if (!this.electronics$) {
      this.electronics$ = fromSupabase(
        this.supabase.from('products').select('*').eq('is_active', true)
      ).pipe(
        map(rows => ((rows as ProductRow[] | null) ?? []).map(mapProduct)),
        shareReplay(1)
      );
    }
    return this.electronics$;
  }

  queryCatalog(query: CatalogQuery): Observable<ProductPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const source$ = query.search?.trim()
      ? this.searchRemote(query.search.trim()).pipe(map(r => r.items))
      : this.getElectronicsCatalog();

    return source$.pipe(
      map(all => {
        let items = all;
        if (query.category && query.category !== 'all') {
          items = this.filterByStoreCategory(items, query.category);
        }
        if (query.laptopOnly) items = items.filter(product => product.category.toLowerCase().includes('laptop'));
        items = this.applyFilters(items, query);
        return this.paginate(items, page, pageSize);
      })
    );
  }

  getRelated(product: Product, limit = 4): Observable<Product[]> {
    return this.getElectronicsCatalog().pipe(
      map(all =>
        all
          .filter(p => p.id !== product.id && p.category === product.category)
          .slice(0, limit)
      )
    );
  }

  getFeatured(limit = 8): Observable<Product[]> {
    return forkJoin([
      this.getByApiCategory('gaming-laptops', 1),
      this.getByApiCategory('business-laptops', 1)
    ]).pipe(map(pages => pages.flatMap(page => page.items).slice(0, limit)));
  }

  getTrending(limit = 8): Observable<Product[]> {
    return this.getElectronicsCatalog().pipe(
      map(all => [...all].sort((a, b) => b.rating - a.rating).slice(0, limit))
    );
  }

  filterByStoreCategory(items: Product[], slug: string): Product[] {
    if (slug === 'deals') return items.filter(p => p.discountPercentage >= 8);
    if (slug === 'laptops') return items.filter(p => p.category.toLowerCase().includes('laptop'));
    return items.filter(p => p.category === slug);
  }

  private applyFilters(items: Product[], query: CatalogQuery): Product[] {
    let next = items;
    if (query.brands?.length) {
      const set = new Set(query.brands.map(b => b.toLowerCase()));
      next = next.filter(p => set.has(p.brand.toLowerCase()));
    }
    if (query.inStockOnly) next = next.filter(isInStock);
    if (query.specifications) {
      for (const [label, values] of Object.entries(query.specifications)) {
        if (!values.length) continue;
        const wanted = new Set(values.map(value => value.toLowerCase()));
        next = next.filter(product => product.specifications.some(spec => spec.label.toLowerCase() === label.toLowerCase() && wanted.has(spec.value.toLowerCase())));
      }
    }
    if (query.minPrice != null) {
      next = next.filter(p => salePrice(p) >= query.minPrice!);
    }
    if (query.maxPrice != null) {
      next = next.filter(p => salePrice(p) <= query.maxPrice!);
    }
    switch (query.sort) {
      case 'price-asc':
        return [...next].sort((a, b) => salePrice(a) - salePrice(b));
      case 'price-desc':
        return [...next].sort((a, b) => salePrice(b) - salePrice(a));
      case 'rating':
        return [...next].sort((a, b) => b.rating - a.rating);
      case 'newest':
        return next;
      default:
        return next;
    }
  }

  private paginate(items: Product[], page: number, pageSize: number): ProductPage {
    const skip = (page - 1) * pageSize;
    return {
      items: items.slice(skip, skip + pageSize),
      total: items.length,
      skip,
      limit: pageSize
    };
  }

  private toPage(items: Product[], skip: number, limit: number): ProductPage {
    return { items, total: items.length, skip, limit };
  }
}
