import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class.error]="t.kind === 'error'" [class.success]="t.kind === 'success'">
          {{ t.message }}
        </div>
      }
    </div>
  `
})
export class ToastHostComponent {
  readonly toasts = inject(ToastService);
}
