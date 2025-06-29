import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-edit-container">
      <h2>Profil bearbeiten</h2>
      <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="firstName">Vorname</label>
          <input 
            type="text" 
            id="firstName" 
            formControlName="firstName"
            class="form-control"
          />
        </div>
        
        <div class="form-group">
          <label for="lastName">Nachname</label>
          <input 
            type="text" 
            id="lastName" 
            formControlName="lastName"
            class="form-control"
          />
        </div>
        
        <div class="form-group">
          <label for="email">E-Mail</label>
          <input 
            type="email" 
            id="email" 
            formControlName="email"
            class="form-control"
          />
        </div>
        
        <div class="form-actions">
          <button type="submit" [disabled]="!profileForm.valid" class="btn btn-primary">
            Speichern
          </button>
          <button type="button" (click)="cancel()" class="btn btn-secondary">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./profile-edit.component.scss']
})
export class ProfileEditComponent {
  profileForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      // TODO: Implement profile update logic
      console.log('Profile updated:', this.profileForm.value);
      this.router.navigate(['/profile']);
    }
  }

  cancel(): void {
    this.router.navigate(['/profile']);
  }
}
