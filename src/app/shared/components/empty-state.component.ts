import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="state-box" role="status">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <ng-content />
    </div>
  `
})
export class EmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input() message = '';
}
