import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, from, map, of, switchMap, throwError } from 'rxjs';
import { Session } from '@supabase/supabase-js';
import { AuthSession, AuthUser } from '../models/user.model';
import { ProfileRow } from '../models/supabase.model';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { fromSupabase, supabaseErrorMessage } from '../supabase/supabase.util';

const AUTH_ERROR = 'Could not complete authentication. Please try again.';
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly session = signal<AuthSession | null>(null);
  private readonly readyPromise: Promise<void>;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => !!this.session()?.accessToken);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);

  constructor() {
    this.readyPromise = this.bootstrap();
    this.supabase.auth.onAuthStateChange((_event, session) => this.setSession(session));
  }

  whenReady(): Observable<boolean> {
    // Never let a failed bootstrap reject guard navigation; resolve as "ready"
    // either way so signed-out users are redirected instead of hitting an error.
    return from(this.readyPromise).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  login(email: string, password: string): Observable<AuthSession> {
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail) || !password) {
      return throwError(() => new Error('Enter your email and password.'));
    }
    return from(this.supabase.auth.signInWithPassword({ email: trimmedEmail, password })).pipe(
      switchMap(({ data, error }) => {
        if (error || !data.session) throw new Error(supabaseErrorMessage(error, AUTH_ERROR));
        this.setSession(data.session);
        return this.loadProfile().pipe(map(() => this.session()!));
      }),
      catchError(error => throwError(() => new Error(this.authErrorMessage(error, AUTH_ERROR))))
    );
  }

  register(payload: { firstName: string; email: string; password: string }): Observable<AuthSession> {
    const trimmedEmail = payload.email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      return throwError(() => new Error('Enter a valid email address.'));
    }
    if (payload.password.length < MIN_PASSWORD_LENGTH) {
      return throwError(() => new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`));
    }
    return from(this.supabase.auth.signUp({
      email: trimmedEmail,
      password: payload.password,
      options: {
        data: {
          first_name: payload.firstName.trim(),
          username: trimmedEmail.split('@')[0]
        },
        emailRedirectTo: window.location.origin + '/auth'
      }
    })).pipe(
      switchMap(({ data, error }) => {
        if (error) throw new Error(supabaseErrorMessage(error, 'Could not create your account.'));
        if (!data.session) {
          throw new Error('Account created. Check your email to confirm it before signing in.');
        }
        this.setSession(data.session);
        return this.loadProfile().pipe(map(() => this.session()!));
      }),
      catchError(error => throwError(() => new Error(this.authErrorMessage(error, 'Could not create your account.'))))
    );
  }

  resetPassword(email: string): Observable<void> {
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      return throwError(() => new Error('Enter a valid email address.'));
    }
    return from(this.supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: window.location.origin + '/auth'
    })).pipe(
      map(({ error }) => {
        if (error) throw new Error(supabaseErrorMessage(error, 'Could not send the reset email.'));
      }),
      catchError(error => throwError(() => new Error(this.authErrorMessage(error, 'Could not send the reset email.'))))
    );
  }

  loadProfile(): Observable<AuthUser | null> {
    const current = this.session();
    if (!current) return of(null);
    return fromSupabase(
      this.supabase.from('profiles').select('*').eq('id', current.user.id).maybeSingle()
    ).pipe(
      map(row => {
        const user = row ? this.mapProfile(row as ProfileRow, current.user) : current.user;
        this.session.set({ ...current, user });
        return user;
      }),
      catchError(() => of(current.user))
    );
  }

  isAdmin(): Observable<boolean> {
    if (!this.isLoggedIn()) return of(false);
    return fromSupabase(this.supabase.rpc('is_admin')).pipe(
      map(result => {
        const allowed = result === true;
        if (allowed && this.session()) {
          this.session.update(current => current ? {
            ...current,
            user: { ...current.user, role: 'admin' }
          } : current);
        }
        return allowed;
      }),
      catchError(() => of(false))
    );
  }

  logout(): void {
    void this.supabase.auth.signOut();
    this.session.set(null);
    localStorage.removeItem('flashtech.cart');
    localStorage.removeItem('flashtech.wishlist');
    void this.router.navigate(['/']);
  }

  updateProfile(patch: Partial<AuthUser>): Observable<AuthUser> {
    const current = this.session();
    if (!current) return throwError(() => new Error('You must be signed in to update your profile.'));
    const next = { ...current.user, ...patch };
    return fromSupabase(
      this.supabase.from('profiles').update({
        email: next.email,
        first_name: next.firstName,
        last_name: next.lastName,
        phone: next.phone ?? null
      }).eq('id', current.user.id).select('*').single()
    ).pipe(
      map(row => {
        const user = this.mapProfile(row as ProfileRow, next);
        this.session.set({ ...current, user });
        return user;
      }),
      catchError(error => throwError(() => new Error(supabaseErrorMessage(error, 'Could not save your profile.'))))
    );
  }

  private async bootstrap(): Promise<void> {
    try {
      const { data } = await this.supabase.auth.getSession();
      this.setSession(data.session);
      if (data.session) await firstValueFrom(this.loadProfile());
    } catch {
      // A transient session/profile read failure must not break the app shell.
      this.session.set(null);
    }
  }

  private setSession(session: Session | null): void {
    if (!session) {
      this.session.set(null);
      return;
    }
    const next = this.toSession(session);
    const current = this.session();
    // Supabase auth-state events contain Auth metadata, not the app profile.
    // Keep a previously loaded role while the same user's token is refreshed.
    if (current?.user.id === next.user.id) {
      next.user = { ...next.user, ...current.user };
    }
    this.session.set(next);
  }

  private toSession(session: Session): AuthSession {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: {
        id: session.user.id,
        username: String(session.user.user_metadata['username'] ?? session.user.email?.split('@')[0] ?? ''),
        email: session.user.email ?? '',
        firstName: String(session.user.user_metadata['first_name'] ?? ''),
        lastName: String(session.user.user_metadata['last_name'] ?? ''),
        gender: '',
        image: String(session.user.user_metadata['avatar_url'] ?? session.user.user_metadata['picture'] ?? '')
      }
    };
  }

  private mapProfile(row: ProfileRow, fallback: AuthUser): AuthUser {
    return {
      id: row.id,
      username: row.username ?? fallback.username,
      email: row.email ?? fallback.email,
      firstName: row.first_name ?? fallback.firstName,
      lastName: row.last_name ?? fallback.lastName,
      gender: row.gender ?? fallback.gender,
      image: row.image ?? fallback.image,
      phone: row.phone ?? undefined,
      address: row.address ?? undefined,
      role: row.role
    };
  }

  private authErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : supabaseErrorMessage(error, fallback);
  }

}
