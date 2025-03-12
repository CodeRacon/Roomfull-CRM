import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/booking-list/booking-list.component').then(
        (m) => m.BookingListComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/booking-details/booking-details.component').then(
        (m) => m.BookingDetailsComponent
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BookingsRoutingModule {}
