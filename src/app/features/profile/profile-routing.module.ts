import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/profile-details/profile-details.component').then(
        (m) => m.ProfileDetailsComponent
      ),
  },
  {
    path: 'edit',
    loadComponent: () =>
      import('./components/profile-details/profile-details.component').then(
        (m) => m.ProfileDetailsComponent
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfileRoutingModule {}
