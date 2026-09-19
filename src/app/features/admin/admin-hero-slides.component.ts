import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeroService, HeroSlide } from '../../core/services/hero.service';
import { ToastService } from '../../core/services/toast.service';
import { supabaseErrorMessage } from '../../core/supabase/supabase.util';

@Component({
  selector: 'app-admin-hero-slides', standalone: true, imports: [FormsModule],
  template: `
    <div class="admin-heading"><div><p class="eyebrow">Storefront</p><h1>Hero slides</h1></div><button class="btn btn-primary" type="button" (click)="newSlide()">Add slide</button></div>
    @if (error()) { <div class="admin-error">{{ error() }}</div> }
    <div class="admin-grid">
      <section class="admin-panel"><table><thead><tr><th>Slide</th><th>Destination</th><th>Position</th><th>Status</th><th></th></tr></thead><tbody>
        @for (slide of slides(); track slide.id) { <tr><td>{{ slide.title }}</td><td>{{ slide.cta_destination }}</td><td>{{ slide.sort_order }}</td><td>{{ slide.is_active ? 'Active' : 'Inactive' }}</td><td class="admin-actions"><button class="admin-action admin-action-edit" type="button" (click)="edit(slide)" aria-label="Edit hero slide" title="Edit hero slide">✎</button><button class="admin-action admin-action-delete" type="button" (click)="remove(slide)" aria-label="Delete hero slide" title="Delete hero slide">×</button></td></tr> }
        @empty { <tr><td colspan="5" class="empty">No hero slides yet. Add one to show a promotion on the home page.</td></tr> }
      </tbody></table></section>
      @if (editing()) { <form class="admin-panel form" (submit)="save($event)"><h2>{{ editingId ? 'Edit' : 'Add' }} hero slide</h2>
        <label>Title<input class="field" name="title" [(ngModel)]="draft.title" minlength="3" maxlength="140" required /></label>
        <label>Description<textarea class="field" name="description" [(ngModel)]="draft.description" maxlength="600"></textarea></label>
        <label>Hero image file<input class="field" type="file" name="imageFile" accept="image/png,image/jpeg,image/webp,image/avif" (change)="selectImage($event)" /><small class="hint">PNG, JPG, WEBP, or AVIF up to 5 MB. Best results with a wide banner (≈16:7, e.g. 1920×840). The image fills the full-width hero and is cropped to fit, so every slide renders at the same size. The file uploads automatically when you save.</small></label>
        <label>CTA destination<input class="field" name="destination" [(ngModel)]="draft.cta_destination" placeholder="/shop/category-slug" required /></label>
        <label>Position<input class="field" type="number" name="order" [(ngModel)]="draft.sort_order" min="0" step="1" required /></label>
        <label class="check"><input type="checkbox" name="active" [(ngModel)]="draft.is_active" /> Active slide</label>
        <div class="hero-form-actions"><button class="btn btn-primary" [disabled]="busy" type="submit">{{ busy ? 'Saving…' : 'Save slide' }}</button></div>
      </form> }
    </div>
  `
})
export class AdminHeroSlidesComponent {
  private readonly heroes = inject(HeroService); private readonly toast = inject(ToastService);
  readonly slides = signal<HeroSlide[]>([]); readonly error = signal(''); readonly editing = signal(false);
  editingId = ''; busy = false; selectedImage: File | null = null;
  draft: Omit<HeroSlide, 'id'> = { title: '', description: '', image_url: null, cta_text: 'Shop now', cta_destination: '/shop', is_active: true, sort_order: 0 };
  constructor() { this.load(); }
  load(): void { this.heroes.listAll().subscribe({ next: slides => this.slides.set(slides), error: () => this.error.set('Could not load hero slides.') }); }
  newSlide(): void { this.editingId = ''; this.selectedImage = null; this.draft = { title: '', description: '', image_url: null, cta_text: 'Shop now', cta_destination: '/shop', is_active: true, sort_order: this.slides().length }; this.editing.set(true); }
  edit(slide: HeroSlide): void { this.editingId = slide.id; this.selectedImage = null; this.draft = { ...slide }; this.editing.set(true); }
  selectImage(event: Event): void { const file = (event.target as HTMLInputElement).files?.[0] || null; if (!file) return; if (!['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(file.type) || file.size > 5 * 1024 * 1024) { this.error.set('Choose a PNG, JPG, WEBP, or AVIF image up to 5 MB.'); (event.target as HTMLInputElement).value = ''; return; } this.error.set(''); this.selectedImage = file; }
  save(event: Event): void { event.preventDefault(); if (!this.draft.title.trim() || !this.draft.cta_destination.startsWith('/')) { this.error.set('Provide a title and an internal destination beginning with /.'); return; } this.busy = true; this.heroes.saveWithImage({ ...this.draft, title: this.draft.title.trim(), description: this.draft.description.trim(), cta_text: this.draft.cta_text.trim() }, this.selectedImage, this.editingId || undefined).subscribe({ next: () => { this.busy = false; this.editing.set(false); this.load(); this.toast.show('Hero slide saved', 'success'); }, error: error => { this.busy = false; this.error.set(supabaseErrorMessage(error, 'Could not save this hero slide.')); } }); }
  remove(slide: HeroSlide): void { if (!window.confirm(`Delete “${slide.title}”?`)) return; this.heroes.remove(slide.id).subscribe({ next: () => { this.load(); this.toast.show('Hero slide deleted', 'success'); }, error: () => this.toast.show('Could not delete this hero slide.', 'error') }); }
}
