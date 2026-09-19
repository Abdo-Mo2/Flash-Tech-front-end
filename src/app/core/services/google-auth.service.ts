import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map } from 'rxjs';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { supabaseErrorMessage } from '../supabase/supabase.util';

export type GoogleAuthResult =
  | { status: 'redirected' }
  | { status: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly supabase = inject(SupabaseClientService).client;

  signIn(): Observable<GoogleAuthResult> {
    return from(this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth' }
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
