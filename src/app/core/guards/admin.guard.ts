import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { switchMap, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.whenReady().pipe(
    switchMap(() => auth.isAdmin()),
    map(isAdmin => {
      if (!auth.isLoggedIn()) {
        return router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
      }
      return isAdmin
        ? true
        : router.createUrlTree(['/']);
    })
  );
};
