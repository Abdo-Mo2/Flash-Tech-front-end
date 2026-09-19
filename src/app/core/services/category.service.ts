import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { STORE_CATEGORIES, StoreCategory } from '../models/product.model';
import { CategoryRow } from '../models/supabase.model';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { fromSupabase } from '../supabase/supabase.util';

export interface StoreApiCategory {
  slug: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly supabase = inject(SupabaseClientService).client;

  getStoreCategories(): StoreCategory[] {
    return STORE_CATEGORIES;
  }

  getApiCategories(): Observable<StoreApiCategory[]> {
    return fromSupabase(
      this.supabase.from('categories').select('slug,name').order('sort_order')
    ).pipe(
      map(rows => ((rows as CategoryRow[] | null) ?? []).map(c => ({ slug: c.slug, name: c.name })))
    );
  }
}
