import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminCategory, ProductInput, SpecField } from '../../core/models/admin.model';
import { Product } from '../../core/models/product.model';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-product-form', standalone: true, imports: [FormsModule, RouterLink],
  template: `
    <div class="admin-heading"><div><p class="eyebrow">Catalog</p><h1>{{ id ? 'Edit product' : 'New product' }}</h1></div><a routerLink="/admin/products">Back to products</a></div>
    @if (error()) { <div class="admin-error" role="alert">{{ error() }}</div> }
    @if (loading) { <div class="admin-panel loading">Loading product…</div> } @else {
      <form class="admin-panel form" (submit)="save($event)" novalidate>
        <div class="form-grid">
          <label>Product name<input class="field" name="title" [(ngModel)]="form.title" minlength="3" maxlength="140" required /></label>
          <label>Brand<input class="field" name="brand" [(ngModel)]="form.brand" minlength="2" maxlength="80" required /></label>
          <label>Category<select class="select" name="category" [(ngModel)]="form.category" (ngModelChange)="onCategoryChange()" required><option value="">Choose a category</option>@for (category of categories(); track category.slug) { <option [value]="category.slug">{{ category.name }}</option> }</select></label>
          <label>SKU<input class="field" name="sku" [(ngModel)]="form.sku" /></label>
          <label>Model<input class="field" name="model" [(ngModel)]="model" placeholder="For example: RTX 5070 Ti" /></label>
          <label>Price<input class="field" type="number" name="price" [(ngModel)]="form.price" min="0" step="0.01" required /></label>
          <label>Discount %<input class="field" type="number" name="discount" [(ngModel)]="form.discountPercentage" min="0" max="100" step="0.1" /></label>
          <label>Stock quantity<input class="field" type="number" name="stock" [(ngModel)]="form.stock" min="0" step="1" required /></label>
          <label class="check"><input type="checkbox" name="active" [(ngModel)]="form.isActive" /> Active product</label>
          <div class="full image-upload"><div><strong>Product images</strong><p class="hint">Add one or more image files from your device.</p></div><input #imagePicker class="visually-hidden" type="file" accept="image/*" (change)="onImageSelected($event)" [disabled]="busy" /><button class="btn btn-secondary" type="button" (click)="imagePicker.click()" [disabled]="busy">Add image</button></div>
          @if (selectedImageNames.length) { <div class="full image-list">@for (name of selectedImageNames; track name; let index = $index) { <span>{{ name }} <button type="button" (click)="removeSelectedImage(index)" [disabled]="busy" [attr.aria-label]="'Remove ' + name">Remove</button></span> }</div> } @else if (form.images.length) { <p class="full selected-images">{{ form.images.length }} saved image{{ form.images.length === 1 ? '' : 's' }}.</p> }
          <div class="full specs">
            <div><strong>Specifications</strong><p class="hint">{{ form.category ? 'Fields update for the selected category.' : 'Choose a category to see the matching specifications.' }}</p></div>
            @if (specificationFields().length) {
              <div class="spec-grid">
                @for (field of specificationFields(); track field.key) {
                  @if (field.options?.length) {
                    <label>{{ field.label }}<select class="select" [name]="field.key" [(ngModel)]="specificationValues[field.key]"><option value="">Select {{ field.label.toLowerCase() }}</option>@for (option of field.options; track option) { <option [value]="option">{{ option }}</option> }</select></label>
                  } @else {
                    <label>{{ field.label }}<input class="field" [name]="field.key" [(ngModel)]="specificationValues[field.key]" [placeholder]="field.example" /></label>
                  }
                }
              </div>
            }
          </div>
          <label class="full">Other specifications <span class="hint">one key/value pair per line, for anything not listed above</span><textarea class="field" name="otherSpecs" [(ngModel)]="otherSpecifications" rows="3" placeholder="For example: Colour: Black"></textarea></label>
          <label class="full">Description<textarea class="field" name="description" [(ngModel)]="form.description" rows="5" minlength="12" maxlength="2000" required></textarea></label>
          <label>Warranty<input class="field" name="warranty" [(ngModel)]="form.warrantyInformation" /></label>
        </div>
        <button class="btn btn-primary" [disabled]="busy" type="submit">{{ busy ? 'Saving…' : 'Save product' }}</button>
      </form>
    }
  `,
  styles: [`
    .loading { color:var(--text-2); } .form { max-width:960px; } .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; } label { font-size:13px; font-weight:600; } label .hint { font-weight:400; } .full { grid-column:1/-1; } .field,.select { margin-top:6px; } textarea.field { height:auto; padding:12px; resize:vertical; } .visually-hidden { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; } .image-upload { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px; border:1px dashed var(--line); border-radius:8px; } .image-upload p,.selected-images { margin:4px 0 0; color:var(--text-2); font-size:13px; } .image-list { display:flex; flex-wrap:wrap; gap:8px; } .image-list span { display:inline-flex; align-items:center; gap:8px; padding:7px 8px 7px 10px; background:var(--mist); border:1px solid var(--line); border-radius:5px; font-size:12px; } .image-list button { border:0; background:transparent; color:var(--red); font:inherit; font-weight:700; cursor:pointer; } .specs { display:grid; gap:12px; padding:16px; border:1px solid var(--line); border-radius:8px; background:var(--mist); } .specs p { margin:4px 0 0; } .spec-grid { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; } @media(max-width:700px){ .spec-grid { grid-template-columns:1fr 1fr; } } @media(max-width:600px){ .form-grid,.spec-grid { grid-template-columns:1fr; } .full { grid-column:auto; } .image-upload { align-items:flex-start; flex-direction:column; } }
  `]
})
export class AdminProductFormComponent {
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly categories = signal<AdminCategory[]>([]);
  readonly error = signal('');
  id: string | undefined;
  loading = false;
  busy = false;
  selectedImages: File[] = [];
  selectedImageNames: string[] = [];
  model = '';
  otherSpecifications = '';
  specificationValues: Record<string, string> = {};
  form: ProductInput = { name:'', slug:'', title:'', description:'', category:'', price:0, discountPercentage:0, rating:0, stock:0, brand:'', sku:'', thumbnail:'', images:[], tags:[], availabilityStatus:'Out of Stock', warrantyInformation:'', shippingInformation:'', returnPolicy:'', weight:0, dimensions: undefined, isActive: true, specifications: [] };

  constructor() {
    this.admin.listCategories().subscribe({ next: value => this.categories.set(value), error: error => this.error.set(error.message || 'Could not load categories.') });
    const raw = this.route.snapshot.paramMap.get('id');
    this.id = raw || undefined;
    if (this.id) {
      this.loading = true;
      this.admin.getProduct(this.id).subscribe({ next: product => this.populate(product), error: error => { this.error.set(error.message || 'Could not load product.'); this.loading = false; } });
    }
  }

  save(event: Event): void {
    event.preventDefault();
    this.error.set('');
    if (this.form.title.trim().length < 3 || this.form.description.trim().length < 12 || this.form.brand.trim().length < 2 || !this.form.category || this.form.price < 0 || !Number.isFinite(this.form.price) || this.form.stock < 0 || !Number.isInteger(Number(this.form.stock))) { this.error.set('Enter a valid name, brand, description, category, price, and whole non-negative stock quantity.'); return; }
    if (!this.selectedImages.length && !this.form.images.length) { this.error.set('Choose at least one product image.'); return; }
    this.form.name = this.form.title.trim();
    const specificationMap = new Map<string, { label: string; value: string }>();
    for (const field of this.specificationFields()) {
      const value = this.specificationValues[field.key]?.trim();
      if (value) specificationMap.set(field.label.toLowerCase(), { label: field.label, value });
    }
    for (const line of this.lines(this.otherSpecifications)) {
      const separator = line.indexOf(':');
      const label = separator < 0 ? line : line.slice(0, separator).trim();
      const value = separator < 0 ? '' : line.slice(separator + 1).trim();
      if (label) specificationMap.set(label.toLowerCase(), { label, value });
    }
    if (this.model.trim()) specificationMap.set('model', { label: 'Model', value: this.model.trim() });
    if (this.form.sku.trim()) specificationMap.set('sku', { label: 'sku', value: this.form.sku.trim() });
    this.form.specifications = [...specificationMap.values()];
    this.busy = true;
    this.admin.saveProductWithImages(this.form, this.selectedImages, this.id).subscribe({
      next: () => { this.toast.show(this.id ? 'Product updated' : 'Product created', 'success'); void this.router.navigate(['/admin/products']); },
      error: (error: { message?: string } | any) => { this.busy = false; this.error.set(error?.message || 'Could not save product.'); }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { this.error.set('Choose an image file smaller than 5 MB.'); return; }
    this.error.set(''); this.selectedImages = [...this.selectedImages, file]; this.selectedImageNames = [...this.selectedImageNames, file.name];
  }

  removeSelectedImage(index: number): void { this.selectedImages.splice(index, 1); this.selectedImageNames.splice(index, 1); this.selectedImages = [...this.selectedImages]; this.selectedImageNames = [...this.selectedImageNames]; }

  onCategoryChange(): void { this.specificationValues = { ...this.specificationValues }; }

  specificationFields(): SpecField[] {
    const category = this.form.category.toLowerCase();
    if (!category) return [];
    if (/(gpu|graphics|graphic)/.test(category)) {
      return [
        { key: 'gpu_model', label: 'GPU model', example: 'GeForce RTX 5070 Ti' },
        { key: 'vram', label: 'VRAM', example: '16 GB' },
        { key: 'memory_type', label: 'Memory type', example: 'GDDR7' },
        { key: 'memory_bus', label: 'Memory bus', example: '256-bit' },
        { key: 'interface', label: 'Interface / bus', example: 'PCIe 5.0 x16' },
        { key: 'clock_speed', label: 'Clock speed', example: '2610 MHz' },
        { key: 'tgp', label: 'Power (TGP)', example: '300 W' }
      ];
    }
    if (/(monitor|display)/.test(category)) {
      return [
        { key: 'display_size', label: 'Display size', example: '27 inch' },
        { key: 'resolution', label: 'Resolution', example: '2560 x 1440' },
        { key: 'refresh_rate', label: 'Refresh rate', example: '180 Hz' },
        { key: 'panel_type', label: 'Panel type', example: 'IPS' },
        { key: 'response_time', label: 'Response time', example: '1 ms' },
        { key: 'aspect_ratio', label: 'Aspect ratio', example: '16:9' },
        { key: 'connectivity', label: 'Connectivity / ports', example: 'HDMI 2.1, DisplayPort 1.4' }
      ];
    }
    if (/(laptop|notebook)/.test(category)) {
      return [
        { key: 'cpu', label: 'Processor / CPU', example: 'Intel Core i7-13700H' },
        { key: 'gpu', label: 'GPU', example: 'GeForce RTX 5060' },
        { key: 'ram', label: 'RAM', options: ['8 GB', '16 GB', '32 GB', '64 GB'] },
        { key: 'storage', label: 'Storage', example: '1 TB NVMe SSD' },
        { key: 'display_size', label: 'Display size', example: '15.6 inch' },
        { key: 'resolution', label: 'Resolution', example: '2560 x 1440' },
        { key: 'refresh_rate', label: 'Refresh rate', example: '165 Hz' },
        { key: 'operating_system', label: 'Operating system', example: 'Windows 11 Home' }
      ];
    }
    if (/(desktop|prebuilt|pc|tower)/.test(category)) {
      return [
        { key: 'cpu', label: 'Processor / CPU', example: 'AMD Ryzen 7 7800X3D' },
        { key: 'gpu', label: 'GPU', example: 'GeForce RTX 4070' },
        { key: 'ram', label: 'RAM', options: ['8 GB', '16 GB', '32 GB', '64 GB'] },
        { key: 'storage', label: 'Storage', example: '1 TB NVMe SSD' },
        { key: 'motherboard', label: 'Motherboard', example: 'B650' },
        { key: 'psu', label: 'PSU', example: '750 W 80+ Gold' },
        { key: 'case', label: 'Case', example: 'Mid-tower ATX' }
      ];
    }
    if (/(cpu|processor)/.test(category)) {
      return [
        { key: 'cpu_model', label: 'CPU model', example: 'Ryzen 7 7800X3D' },
        { key: 'cores', label: 'Cores', example: '8' },
        { key: 'threads', label: 'Threads', example: '16' },
        { key: 'base_clock', label: 'Base clock', example: '4.2 GHz' },
        { key: 'boost_clock', label: 'Boost clock', example: '5.0 GHz' },
        { key: 'socket', label: 'Socket', example: 'AM5' },
        { key: 'architecture', label: 'Generation / architecture', example: 'Zen 4' }
      ];
    }
    if (/(ram|memory)/.test(category)) {
      return [
        { key: 'capacity', label: 'Capacity', example: '32 GB' },
        { key: 'type', label: 'Type', example: 'DDR5' },
        { key: 'speed', label: 'Speed', example: '6000 MT/s' },
        { key: 'latency', label: 'Latency', example: 'CL36' }
      ];
    }
    if (/(storage|ssd|hdd|drive)/.test(category)) {
      return [
        { key: 'capacity', label: 'Capacity', example: '1 TB' },
        { key: 'type', label: 'Type', example: 'NVMe SSD' },
        { key: 'interface', label: 'Interface', example: 'PCIe 4.0' },
        { key: 'read_speed', label: 'Read speed', example: '7300 MB/s' },
        { key: 'write_speed', label: 'Write speed', example: '6300 MB/s' }
      ];
    }
    if (/(motherboard|mainboard)/.test(category)) {
      return [
        { key: 'socket', label: 'Socket', example: 'AM5' },
        { key: 'chipset', label: 'Chipset', example: 'B650' },
        { key: 'ram_type', label: 'RAM type', example: 'DDR5' },
        { key: 'form_factor', label: 'Form factor', example: 'ATX' }
      ];
    }
    if (/(headphone|headset|earphone|audio|speaker)/.test(category)) {
      return [
        { key: 'type', label: 'Type', example: 'Over-ear' },
        { key: 'connectivity', label: 'Connectivity', example: 'Wireless / USB-C' },
        { key: 'compatibility', label: 'Compatibility', example: 'PC / PS5 / Mobile' },
        { key: 'battery_life', label: 'Battery life', example: '30 hours' }
      ];
    }
    if (/(keyboard|mouse|mice)/.test(category)) {
      return [
        { key: 'type', label: 'Type', example: 'Mechanical' },
        { key: 'connectivity', label: 'Connectivity', example: 'USB / Wireless' },
        { key: 'compatibility', label: 'Compatibility', example: 'PC / Mac' }
      ];
    }
    // Generic fallback keeps any other category usable without irrelevant fields.
    return [
      { key: 'type', label: 'Type', example: 'Gaming accessory' },
      { key: 'connectivity', label: 'Connectivity', example: 'USB-C' },
      { key: 'compatibility', label: 'Compatibility', example: 'PC / PS5' }
    ];
  }

  private populate(product: Product): void {
    this.form = { ...product };
    this.form.thumbnail = product.images[0] ?? '';
    const fields = this.specificationFields();
    const byKey = new Map(fields.map(field => [field.key, field]));
    const labelToKey = new Map(fields.map(field => [field.label.toLowerCase(), field.key]));
    const values: Record<string, string> = {};
    const extras: string[] = [];
    for (const spec of product.specifications) {
      const label = spec.label.toLowerCase();
      if (label === 'model') { this.model = spec.value; continue; }
      if (label === 'sku') { this.form.sku = this.form.sku || spec.value; continue; }
      const key = labelToKey.get(label) ?? (byKey.has(label) ? label : undefined);
      if (key) values[key] = spec.value;
      else extras.push(`${spec.label}: ${spec.value}`);
    }
    this.specificationValues = values;
    this.otherSpecifications = extras.join('\n');
    this.loading = false;
  }
  private lines(value: string): string[] { return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean); }
}
