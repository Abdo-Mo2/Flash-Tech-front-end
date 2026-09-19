import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-account-addresses',
  standalone: true,
  imports: [FormsModule, EmptyStateComponent],
  template: `
    <h2 style="margin-bottom:16px">Addresses</h2>
    @if (!users.addressList().length) {
      <app-empty-state title="No saved addresses" message="Add a New Cairo or delivery address for faster checkout." />
    }
    @for (a of users.addressList(); track a.id) {
      <div class="addr-row" style="grid-template-columns:1fr auto">
        <div>
          <strong>{{ a.label }}</strong>
          <div class="hint">{{ a.fullName }} · {{ a.phone }}<br />{{ a.line1 }}, {{ a.city }}, {{ a.governorate }}</div>
        </div>
        <button class="btn btn-ghost" type="button" (click)="remove(a.id)">Remove</button>
      </div>
    }
    <h3 style="font-size:16px;margin:24px 0 12px">Add address</h3>
    <form class="form-grid" (submit)="add($event)">
      <div><label class="field-label" for="al">Label</label><input class="field" id="al" name="label" [(ngModel)]="label" required /></div>
      <div><label class="field-label" for="an">Full name</label><input class="field" id="an" name="name" [(ngModel)]="fullName" required /></div>
      <div><label class="field-label" for="ap">Phone</label><input class="field" id="ap" name="phone" [(ngModel)]="phone" required /></div>
      <div class="full"><label class="field-label" for="aa">Address</label><input class="field" id="aa" name="line" [(ngModel)]="line1" required /></div>
      <div><label class="field-label" for="ac">City</label><input class="field" id="ac" name="city" [(ngModel)]="city" required /></div>
      <div><label class="field-label" for="ag">Governorate</label><input class="field" id="ag" name="gov" [(ngModel)]="governorate" required /></div>
      <div class="full"><button class="btn btn-primary" type="submit">Save address</button></div>
    </form>
  `
})
export class AccountAddressesComponent {
  readonly users: UserService = inject(UserService);
  private readonly toast = inject(ToastService);
  label = 'Home';
  fullName = '';
  phone = '';
  line1 = '';
  city = '';
  governorate = '';

  add(event: Event): void {
    event.preventDefault();
    this.users.addAddress({
      label: this.label,
      fullName: this.fullName,
      phone: this.phone,
      line1: this.line1,
      city: this.city,
      governorate: this.governorate
    }).subscribe({
      next: () => this.line1 = '',
      error: error => this.toast.show(error.message || 'Could not save your address.', 'error')
    });
  }

  remove(id: string): void {
    this.users.removeAddress(id).subscribe({
      error: error => this.toast.show(error.message || 'Could not remove your address.', 'error')
    });
  }
}
