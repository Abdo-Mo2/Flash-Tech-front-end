import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SupabaseLikeError {
  message?: string;
  code?: string;
}

export function fromSupabase<T>(
  query: PromiseLike<{ data: T; error: SupabaseLikeError | null }>
): Observable<T> {
  return from(query).pipe(
    map(({ data, error }) => {
      if (error) throw error;
      return data;
    })
  );
}

export function supabaseErrorMessage(error: unknown, fallback: string): string {
  const err = (error ?? {}) as SupabaseLikeError;
  const message = err.message ?? '';
  const code = err.code ?? '';

  if (code === 'PGRST205' || /could not find the table/i.test(message)) {
    return 'The catalog is not available yet. The Supabase tables still need to be created.';
  }
  if (code === 'PGRST116') {
    return 'This item could not be found.';
  }
  if (code === '42501' || code === 'PGRST301' || /row-level security|permission denied/i.test(message)) {
    return 'You do not have permission to complete this action.';
  }
  if (code === 'invalid_credentials' || /invalid login/i.test(message)) {
    return 'Incorrect email or password.';
  }
  if (code === 'email_not_confirmed') {
    return 'Confirm your email before signing in.';
  }
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(message)) {
    return 'An account with this email already exists.';
  }
  if (code === 'over_email_send_rate_limit') {
    return 'Too many emails were sent. Please wait a moment and try again.';
  }
  if (/Failed to fetch|NetworkError|fetch/i.test(message)) {
    return 'Network error. Check your connection and try again.';
  }
  if (/bucket.*not found|not found.*bucket/i.test(message)) {
    return 'Hero image storage is not configured. Run supabase/admin-workflows-migration.sql in your Supabase SQL editor, then try again.';
  }
  if (/insufficient stock/i.test(message)) {
    return 'Only the remaining available quantity can be ordered. Please update your cart and try again.';
  }
  if (/product is unavailable|product.*not found/i.test(message)) {
    return 'One of the products in your cart is no longer available. Please remove it and try again.';
  }
  if (/create_order_with_items|function.*does not exist/i.test(message)) {
    return 'Checkout setup is incomplete. Please ask the store administrator to apply the checkout database migration.';
  }
  return fallback;
}
