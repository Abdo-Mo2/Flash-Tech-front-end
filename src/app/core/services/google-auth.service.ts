import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map } from 'rxjs';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { supabaseErrorMessage } from '../supabase/supabase.util';

export type GoogleAuthResult =
  | { status: 'redirected' }
  | { status: 'error'; message: string };

/**
 * Supabase returns OAuth errors (including a cancelled consent screen) as query
 * or hash parameters on the redirect target. Only allow same-origin paths so a
 * crafted link cannot bounce a signed-in user to another site.
 */
function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '';
  }
  return value;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly supabase = inject(SupabaseClientService).client;

  signIn(returnPath?: string): Observable<GoogleAuthResult> {
    const next = safeReturnPath(returnPath ?? null) || '/';
    const redirectTo = new URL('/auth', window.location.origin);
    redirectTo.searchParams.set('next', next);
    return from(this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: { prompt: 'select_account' }
      }
    })).pipe(
      map(({ data, error }) => {
        if (error || !data.url) {
          throw new Error(supabaseErrorMessage(error, 'Google sign-in is not enabled in Supabase yet.'));
        }
        window.location.assign(data.url);
        return { status: 'redirected' as const };
      }),
      catchError(error => from([{
        status: 'error' as const,
        message: error.message ?? 'Google sign-in failed.'
      }]))
    );
  }
}
