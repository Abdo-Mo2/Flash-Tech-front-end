import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { fromSupabase } from '../supabase/supabase.util';

export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  cta_text: string;
  cta_destination: string;
  is_active: boolean;
  sort_order: number;
}

@Injectable({ providedIn: 'root' })
export class HeroService {
  private readonly supabase = inject(SupabaseClientService).client;

  listActive(): Observable<HeroSlide[]> {
    return fromSupabase(this.supabase.from('hero_slides').select('*').eq('is_active', true).order('sort_order'))
      .pipe(map(rows => (rows as HeroSlide[] | null) ?? []));
  }

  listAll(): Observable<HeroSlide[]> {
    return fromSupabase(this.supabase.from('hero_slides').select('*').order('sort_order'))
      .pipe(map(rows => (rows as HeroSlide[] | null) ?? []));
  }

  save(slide: Omit<HeroSlide, 'id'>, id?: string): Observable<HeroSlide> {
    const request = id
      ? this.supabase.from('hero_slides').update(slide).eq('id', id).select('*').single()
      : this.supabase.from('hero_slides').insert(slide).select('*').single();
    return fromSupabase(request).pipe(map(row => row as HeroSlide));
  }

  saveWithImage(slide: Omit<HeroSlide, 'id'>, file: File | null, id?: string): Observable<HeroSlide> {
    if (!file) return this.save(slide, id);
    const owner = id || crypto.randomUUID();
    return this.uploadImage(file, owner).pipe(
      switchMap(image_url => this.save({ ...slide, image_url }, id))
    );
  }

  private uploadImage(file: File, owner: string): Observable<string> {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    const path = `slides/${owner}/${Date.now()}-${safeName}`;
    return fromSupabase(this.supabase.storage.from('hero-images').upload(path, file, { contentType: file.type, upsert: false })).pipe(
      map(() => this.supabase.storage.from('hero-images').getPublicUrl(path).data.publicUrl)
    );
  }

  remove(id: string): Observable<void> {
    return fromSupabase(this.supabase.from('hero_slides').delete().eq('id', id)).pipe(map(() => undefined));
  }
}
