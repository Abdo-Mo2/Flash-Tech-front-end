import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

type ConfirmationState = 'success' | 'already' | 'invalid' | 'failed';

const MESSAGES: Record<ConfirmationState, { title: string; body: string }> = {
  success: {
    title: 'Your email is confirmed',
    body: 'Your FlashTech account is now active. Redirecting you to the home page.',
  },
  already: {
    title: 'This email was already confirmed',
    body: 'You can sign in with your email and password. Redirecting you to the home page.',
  },
  invalid: {
    title: 'This confirmation link is not valid',
    body: 'The link may be incomplete, expired, or already used. Sign in, or register again to receive a fresh confirmation email.',
  },
  failed: {
    title: 'We could not confirm this link',
    body: 'The confirmation attempt failed. Try the link again from your inbox, or contact the store if it keeps failing.',
  },
};

@Component({
  selector: 'app-confirm-email-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap" style="max-width:520px;margin-top:56px">
      <div class="state-box">
        <h3>{{ message().title }}</h3>
        <p>{{ message().body }}</p>
        @if (state() === 'invalid' || state() === 'failed') {
          <a class="btn btn-primary" routerLink="/auth">Go to sign in</a>
        } @else {
          <a class="btn btn-secondary" routerLink="/">Go home now</a>
        }
      </div>
    </div>
  `,
})
export class ConfirmEmailPageComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly url = new URL(window.location.href);
  readonly state = signal<ConfirmationState>('failed');
  readonly message = signal(MESSAGES.failed);

  constructor() {
    void this.resolve();
  }

  private async resolve(): Promise<void> {
    await firstValueFrom(this.auth.whenReady());
    const params = this.url.searchParams;
    const hashParams = new URLSearchParams(this.url.hash.replace(/^#/, ''));
    const errorCode = params.get('error_code') ?? hashParams.get('error_code') ?? '';
    const code = params.get('code') ?? hashParams.get('code');
    const errorDescription = (
      params.get('error_description') ??
      hashParams.get('error_description') ??
      ''
    ).toLowerCase();

    // Supabase only completes email confirmation when verified server-side; the
    // client never decides verification itself.
    if (errorCode === 'otp_expired' || errorDescription.includes('expired')) {
      this.set('invalid');
      this.toast.show(
        'That confirmation link has expired. Register again for a new email.',
        'error',
      );
      return;
    }
    if (errorCode || errorDescription) {
      this.set('failed');
      return;
    }

    const session = await this.auth.waitForSessionFromUrl(5000);
    if (!session) {
      this.set('invalid');
      return;
    }

    // A user who confirms after already signing in is still a successful state,
    // but Supabase reports it without a fresh verification.
    if (await this.auth.isEmailConfirmed()) {
      this.set('success');
    } else if (code) {
      this.set('failed');
    } else {
      this.set('already');
    }

    if (this.state() === 'success' || this.state() === 'already') {
      window.setTimeout(() => {
        window.location.assign('/');
      }, 2500);
    }
  }

  private set(state: ConfirmationState): void {
    this.state.set(state);
    this.message.set(MESSAGES[state]);
  }
}
