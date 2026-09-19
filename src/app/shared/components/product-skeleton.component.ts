import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-product-skeleton',
  standalone: true,
  template: `
    @for (i of items; track i) {
      <div class="skel-card" aria-hidden="true">
        <div class="skel simg"></div>
        <div class="body">
          <div class="skel skel-line"></div>
          <div class="skel skel-line w60"></div>
          <div class="skel skel-line" style="height:36px;margin-top:8px"></div>
        </div>
      </div>
    }
  `
})
export class ProductSkeletonComponent {
  @Input() count = 8;
  get items(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
