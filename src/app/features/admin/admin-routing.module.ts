import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./components/user-management/user-management.component').then(
        (m) => m.UserManagementComponent
      ),
  },
  {
    path: 'rooms',
    loadComponent: () =>
      import('./components/room-management/room-management.component').then(
        (m) => m.RoomManagementComponent
      ),
  },
  {
    path: 'bookings',
    loadComponent: () =>
      import(
        './components/booking-management/booking-management.component'
      ).then((m) => m.BookingManagementComponent),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
