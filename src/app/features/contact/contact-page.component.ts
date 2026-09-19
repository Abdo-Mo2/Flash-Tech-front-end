import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <nav class="breadcrumb">Support</nav>
      <h1 style="font-size:22px;margin-bottom:8px">Customer support</h1>
      <p class="hint" style="margin-bottom:24px">Don’t just copy a phone number into a ticket — tell us the order, the SKU, and what went wrong.</p>
      <div class="contact-grid">
        <form (submit)="send($event)">
          <h2 style="font-size:16px;margin-bottom:14px">Contact form</h2>
          <label class="field-label" for="cn">Name</label>
          <input class="field" id="cn" name="name" [(ngModel)]="name" required />
          <label class="field-label" for="ce">Email</label>
          <input class="field" id="ce" type="email" name="email" [(ngModel)]="email" required />
          <label class="field-label" for="ct">Topic</label>
          <select class="select" id="ct" name="topic" [(ngModel)]="topic">
            <option>Order status</option>
            <option>Returns</option>
            <option>Stock question</option>
            <option>Warranty</option>
          </select>
          <label class="field-label" for="cm" style="margin-top:16px">How can we help?</label>
          <textarea class="field" id="cm" name="msg" [(ngModel)]="message" required></textarea>
          @if (formError) {
            <p class="err-msg">{{ formError }}</p>
          }
          <button class="btn btn-primary" type="submit" [disabled]="busy" style="margin-top:12px">{{ busy ? 'Sending…' : 'Send message' }}</button>
        </form>
        <div>
          <h2 id="shipping" style="font-size:16px;margin-bottom:12px">Shipping</h2>
          <p>Cairo and Giza: 1–2 days after packing. Other governorates: 2–4 days. Flat {{ shipping }} EGP unless the cart is marked free pickup.</p>
          <h2 id="returns" style="font-size:16px;margin:24px 0 12px">Returns</h2>
          <p>Sealed electronics: 14 days. Opened units only if they fail on first boot — keep the invoice and serial photo.</p>
          <div class="faq" style="margin-top:28px">
            <h2 style="font-size:16px;margin-bottom:8px">FAQ</h2>
            <details><summary>Do you price-match?</summary><p>We match a local sealed competitor on the same SKU if you send a dated quote.</p></details>
            <details><summary>Can I collect from the showroom?</summary><p>Yes. New Cairo pickup is free once the order status is “ready”.</p></details>
            <details><summary>Why might Google sign-in fail?</summary><p>The button uses Google Identity, then Supabase Auth. Enable the Google provider in your Supabase project and add this site’s origin.</p></details>
            <details><summary>Where does the catalog come from?</summary><p>Products are loaded from your Supabase database through the store’s service layer.</p></details>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ContactPageComponent {
  private readonly toast = inject(ToastService);
  private readonly users = inject(UserService);
  name = '';
  email = '';
  topic = 'Order status';
  message = '';
  formError = '';
  busy = false;
  shipping = 50;
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly MAX_MESSAGE_LENGTH = 2000;

  send(event: Event): void {
    event.preventDefault();
    this.formError = '';
    const trimmedName = this.name.trim();
    const trimmedEmail = this.email.trim();
    const trimmedMessage = this.message.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      this.formError = 'Enter your name (2–80 characters).';
      return;
    }
    if (!ContactPageComponent.EMAIL_PATTERN.test(trimmedEmail)) {
      this.formError = 'Enter a valid email address.';
      return;
    }
    if (trimmedMessage.length < 12 || trimmedMessage.length > ContactPageComponent.MAX_MESSAGE_LENGTH) {
      this.formError = `Give us a bit more detail — between 12 and ${ContactPageComponent.MAX_MESSAGE_LENGTH} characters.`;
      return;
    }
    this.busy = true;
    this.users.submitContact({
      name: trimmedName,
      email: trimmedEmail,
      topic: this.topic,
      message: trimmedMessage
    }).subscribe({
      next: () => {
        this.busy = false;
        this.toast.show('Message received. Our support team will follow up.', 'success');
        this.message = '';
      },
      error: error => {
        this.busy = false;
        this.formError = error.message || 'Could not send your message.';
      }
    });
  }
}
