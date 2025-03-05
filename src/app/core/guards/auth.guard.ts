import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.user$.pipe(
      take(1),
      map((user) => {
        // if user is logged in, grant access
        if (user) {
          return true;
        }

        // else, lead to Login
        return this.router.createUrlTree(['/auth/login']);
      })
    );
  }
}
