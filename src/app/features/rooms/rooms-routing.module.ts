import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/room-list/room-list.component').then(
        (m) => m.RoomListComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/room-details/room-details.component').then(
        (m) => m.RoomDetailsComponent
      ),
  },
  {
    path: 'book/:id',
    loadComponent: () =>
      import('./components/room-booking/room-booking.component').then(
        (m) => m.RoomBookingComponent
      ),
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RoomsRoutingModule {}
