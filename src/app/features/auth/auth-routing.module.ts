import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';
import { AdminGuard } from '../../core/guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('../../features/home/home.module').then((m) => m.HomeModule),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('../../features/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'rooms',
    loadChildren: () =>
      import('../../features/rooms/rooms.module').then((m) => m.RoomsModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'bookings',
    loadChildren: () =>
      import('../../features/bookings/bookings.module').then(
        (m) => m.BookingsModule
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'profile',
    loadChildren: () =>
      import('../../features/profile/profile.module').then(
        (m) => m.ProfileModule
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('../../features/admin/admin.module').then((m) => m.AdminModule),
    canActivate: [AuthGuard, AdminGuard],
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
