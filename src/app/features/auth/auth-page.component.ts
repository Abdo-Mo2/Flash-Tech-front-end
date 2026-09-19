import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { GoogleAuthService } from '../../core/services/google-auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        @if (mode() !== 'forgot') {
          <div class="auth-tabs">
            <button type="button" [class.active]="mode() === 'login'" (click)="mode.set('login')">Log in</button>
            <button type="button" [class.active]="mode() === 'register'" (click)="mode.set('register')">Register</button>
          </div>
        } @else {
          <h1 style="font-size:20px;margin-bottom:8px">Forgot password</h1>
          <p class="hint" style="margin-bottom:16px">Enter your account email and we’ll send a secure recovery link.</p>
        }

        @if (error()) {
          <div class="auth-error" role="alert">{{ error() }}</div>
        }

        @if (mode() === 'login') {
          <form (submit)="login($event)">
            <label class="field-label" for="li-user">Email</label>
            <input class="field" id="li-user" type="email" name="user" [(ngModel)]="username" autocomplete="email" required />
            <label class="field-label" for="li-pass">Password</label>
            <input class="field" id="li-pass" type="password" name="pass" [(ngModel)]="password" autocomplete="current-password" required />
            <div class="row-between">
              <span></span>
              <button type="button" class="btn-ghost" style="border:none;background:none;color:var(--amber-700);font-weight:600" (click)="mode.set('forgot')">Forgot password?</button>
            </div>
            <button class="btn btn-primary" style="width:100%" type="submit" [disabled]="busy()">Log in</button>
          </form>
          <div class="divider">or</div>
          <button class="btn btn-secondary" style="width:100%;margin-bottom:10px" type="button" (click)="google()">Continue with Google</button>
          <a class="btn btn-ghost" style="width:100%" routerLink="/checkout">Continue as guest</a>
          <p class="auth-info">Your account is secured by Supabase Auth.</p>
        }

        @if (mode() === 'register') {
          <form (submit)="register($event)">
            <label class="field-label" for="re-name">Full name</label>
            <input class="field" id="re-name" name="name" [(ngModel)]="fullName" autocomplete="name" required />
            <label class="field-label" for="re-email">Email</label>
            <input class="field" id="re-email" type="email" name="email" [(ngModel)]="email" autocomplete="email" required />
            <label class="field-label" for="re-pass">Password</label>
            <input class="field" id="re-pass" type="password" name="rpass" [(ngModel)]="password" minlength="8" autocomplete="new-password" required />
            <p class="hint" style="margin:-8px 0 14px">Use at least 8 characters. Your account will be secured by Supabase Auth.</p>
            <button class="btn btn-primary" style="width:100%" type="submit" [disabled]="busy()">Create account</button>
          </form>
          <div class="divider">or</div>
          <button class="btn btn-secondary" style="width:100%" type="button" (click)="google()">Continue with Google</button>
        }

        @if (mode() === 'forgot') {
          <form (submit)="forgot($event)">
            <label class="field-label" for="fp-email">Email</label>
            <input class="field" id="fp-email" type="email" name="fp" [(ngModel)]="email" required />
            <button class="btn btn-primary" style="width:100%" type="submit">Send reset link</button>
            <button class="btn btn-ghost" style="width:100%;margin-top:8px" type="button" (click)="mode.set('login')">Back to log in</button>
          </form>
        }
      </div>
    </div>
  `
})
export class AuthPageComponent {
  private readonly auth = inject(AuthService);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<'login' | 'register' | 'forgot'>('login');
  readonly error = signal('');
  readonly busy = signal(false);
  username = '';
  password = '';
  fullName = '';
  email = '';

  login(event: Event): void {
    event.preventDefault();
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => this.afterAuth(),
      error: err => {
        this.busy.set(false);
        this.error.set(err.message || 'Sign-in failed.');
      }
    });
  }

  register(event: Event): void {
    event.preventDefault();
    if (this.password.length < 8) {
      this.error.set('Use at least 8 characters.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.auth.register({ firstName: this.fullName, email: this.email, password: this.password }).subscribe({
      next: () => this.afterAuth(),
      error: err => {
        this.busy.set(false);
        this.error.set(err.message || 'Could not create the account.');
      }
    });
  }

  forgot(event: Event): void {
    event.preventDefault();
    this.busy.set(true);
    this.error.set('');
    this.auth.resetPassword(this.email.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.show('If an account exists for that email, a reset link is on its way.', 'info');
        this.mode.set('login');
      },
      error: error => {
        this.busy.set(false);
        this.error.set(error.message || 'Could not send the reset email.');
      }
    });
  }

  google(): void {
    this.busy.set(true);
    this.error.set('');
    this.googleAuth.signIn().subscribe(result => {
      if (result.status === 'error') {
        this.busy.set(false);
        this.error.set(result.message);
        return;
      }
    });
  }

  private afterAuth(): void {
    this.busy.set(false);
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/account';
    void this.router.navigateByUrl(returnUrl);
  }
}
