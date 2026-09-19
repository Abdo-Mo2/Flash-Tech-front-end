import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-account-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h2 style="margin-bottom:16px">Account info</h2>
    @if (auth.user(); as u) {
      <form class="form-grid" (submit)="save($event)">
        <div>
          <label class="field-label" for="pf">First name</label>
          <input class="field" id="pf" name="fn" [(ngModel)]="firstName" />
        </div>
        <div>
          <label class="field-label" for="pl">Last name</label>
          <input class="field" id="pl" name="ln" [(ngModel)]="lastName" />
        </div>
        <div class="full">
          <label class="field-label" for="pe">Email</label>
          <input class="field" id="pe" name="em" [(ngModel)]="email" type="email" />
        </div>
        <div class="full">
          <label class="field-label" for="pp">Phone</label>
          <input class="field" id="pp" name="ph" [(ngModel)]="phone" />
        </div>
        <div class="full">
          <p class="hint">Signed in as {{ u.email }}</p>
        </div>
        <div class="full"><button class="btn btn-primary" type="submit">Save changes</button></div>
      </form>
    }
  `
})
export class AccountProfileComponent {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  firstName = this.auth.user()?.firstName ?? '';
  lastName = this.auth.user()?.lastName ?? '';
  email = this.auth.user()?.email ?? '';
  phone = this.auth.user()?.phone ?? '';

  save(event: Event): void {
    event.preventDefault();
    this.auth.updateProfile({
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone
    }).subscribe({
      next: () => this.toast.show('Profile saved', 'success'),
      error: error => this.toast.show(error.message || 'Could not save your profile.', 'error')
    });
  }
}
