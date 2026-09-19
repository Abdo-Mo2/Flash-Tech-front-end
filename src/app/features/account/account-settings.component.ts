import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  template: `
    <h2 style="margin-bottom:16px">Account settings</h2>
    <p class="hint">Marketing email is off by default. Toggle only if you want restock mail.</p>
    <div class="opt" style="margin:16px 0">
      <input type="checkbox" id="mk" [checked]="marketing" (change)="marketing = !marketing" />
      <label for="mk"> Email me about restocks</label>
    </div>
    <button class="btn btn-secondary" type="button" (click)="save()">Save preferences</button>
    <hr style="border:none;border-top:1px solid var(--line);margin:32px 0" />
    <button class="btn btn-ghost" type="button" (click)="auth.logout()">Log out</button>
  `
})
export class AccountSettingsComponent {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  marketing = false;

  save(): void {
    this.toast.show(this.marketing ? 'Restock emails enabled on this device.' : 'Preferences saved.', 'success');
  }
}
