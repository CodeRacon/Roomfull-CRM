import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/components/login/login.component').then(
            (m) => m.LoginComponent
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/components/register/register.component').then(
            (m) => m.RegisterComponent
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import(
            './features/auth/components/forgot-password/forgot-password.component'
          ).then((m) => m.ForgotPasswordComponent),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  // Geschützte Routen für angemeldete Benutzer
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/profile/profile-routing.module').then(
        (m) => m.ProfileRoutingModule
      ),
  },
  {
    path: 'rooms',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/rooms/rooms-routing.module').then(
        (m) => m.RoomsRoutingModule
      ),
  },
  {
    path: 'bookings',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/bookings/bookings-routing.module').then(
        (m) => m.BookingsRoutingModule
      ),
  },
  // Admin-Bereich, geschützt durch AdminGuard
  {
    path: 'admin',
    canActivate: [AuthGuard, AdminGuard],
    loadChildren: () =>
      import('./features/admin/admin-routing.module').then(
        (m) => m.AdminRoutingModule
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
