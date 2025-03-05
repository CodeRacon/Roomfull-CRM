import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.user$.pipe(
      take(1),
      map((user) => {
        // grant access, if user is admin
        if (user && this.authService.isAdmin(user)) {
          return true;
        }

        // else, lead to landing page
        return this.router.createUrlTree(['/']);
      })
    );
  }
}
