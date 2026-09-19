import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminCategory } from '../../core/models/admin.model';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-categories', standalone: true, imports: [FormsModule],
  template: `
    <div class="admin-heading"><div><p class="eyebrow">Catalog</p><h1>Categories</h1></div><button class="btn btn-primary" type="button" (click)="newCategory()">Add category</button></div>
    @if (error()) { <div class="admin-error">{{ error() }}</div> }
    <div class="admin-grid">
      <section class="admin-panel"><table><thead><tr><th>Name</th><th>Slug</th><th>Order</th><th></th></tr></thead><tbody>
        @for (category of categories(); track category.slug) { <tr><td>{{ category.name }}</td><td>{{ category.slug }}</td><td>{{ category.sort_order }}</td><td class="admin-actions"><button class="admin-action admin-action-edit" type="button" (click)="edit(category)" aria-label="Edit category" title="Edit category">✎</button><button class="admin-action admin-action-delete" type="button" (click)="remove(category)" aria-label="Delete category" title="Delete category">×</button></td></tr> }
        @empty { <tr><td colspan="4" class="empty">No categories found.</td></tr> }
      </tbody></table></section>
      @if (editing()) { <form class="admin-panel form" (submit)="save($event)"><h2>{{ originalSlug ? 'Edit' : 'Add' }} category</h2><label>Name<input class="field" name="name" [(ngModel)]="draft.name" minlength="2" maxlength="80" required /></label><label>Slug<input class="field" name="slug" [(ngModel)]="draft.slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label>Description<textarea class="field" name="blurb" [(ngModel)]="draft.blurb" maxlength="300"></textarea></label><label>Sort order<input class="field" type="number" name="sort" [(ngModel)]="draft.sort_order" min="0" step="1" required /></label><button class="btn btn-primary" type="submit">Save</button></form> }
    </div>
  `
})
export class AdminCategoriesComponent {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  readonly categories = signal<AdminCategory[]>([]);
  readonly error = signal('');
  readonly editing = signal(false);
  originalSlug = '';
  draft: AdminCategory = { slug: '', name: '', blurb: '', icon: '', sort_order: 0 };
  constructor() { this.load(); }
  load(): void { this.admin.listCategories().subscribe({ next: value => this.categories.set(value), error: error => this.error.set(error.message || 'Could not load categories.') }); }
  newCategory(): void { this.originalSlug = ''; this.draft = { slug: '', name: '', blurb: '', icon: '', sort_order: 0 }; this.editing.set(true); }
  edit(category: AdminCategory): void { this.originalSlug = category.slug; this.draft = { ...category }; this.editing.set(true); }
  save(event: Event): void { event.preventDefault(); this.error.set(''); this.draft.slug = this.draft.slug.trim().toLowerCase(); if (this.draft.name.trim().length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.draft.slug) || !Number.isInteger(Number(this.draft.sort_order)) || this.draft.sort_order < 0) { this.error.set('Enter a valid category name, lowercase slug, and non-negative whole sort order.'); return; } this.admin.saveCategory(this.draft, this.originalSlug || undefined).subscribe({ next: () => { this.editing.set(false); this.load(); this.toast.show('Category saved', 'success'); }, error: error => this.toast.show(error.message || 'Could not save category', 'error') }); }
  remove(category: AdminCategory): void { if (!window.confirm(`Delete ${category.name}?`)) return; this.admin.deleteCategory(category.slug).subscribe({ next: () => { this.load(); this.toast.show('Category deleted', 'success'); }, error: error => this.toast.show(error.message || 'Could not delete category', 'error') }); }
}
