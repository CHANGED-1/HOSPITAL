import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);

  const addToken = (r: HttpRequest<unknown>, token: string | null) =>
    token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;

  return next(addToken(req, auth.accessToken)).pipe(
    catchError((err: HttpErrorResponse) => {
      // Auto-refresh on 401 (but not on the login/refresh endpoints themselves)
      if (err.status === 401 && !req.url.includes('/auth/')) {
        return from(auth.refreshAccessToken()).pipe(
          switchMap(refreshed => {
            if (refreshed) {
              return next(addToken(req, auth.accessToken));
            }
            auth.logout();
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};