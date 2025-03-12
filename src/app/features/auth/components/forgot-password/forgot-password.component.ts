import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  resetForm: FormGroup;
  resetError: string | null = null;
  loading = false;
  emailSent = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit() {
    if (this.resetForm.valid) {
      this.loading = true;
      this.resetError = null;

      const { email } = this.resetForm.value;

      this.authService.resetPassword(email).subscribe({
        next: () => {
          this.loading = false;
          this.emailSent = true;
          this.snackBar.open(
            'Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet. Bitte überprüfe dein E-Mail-Postfach.',
            'OK',
            { duration: 5000 }
          );
        },
        error: (error) => {
          this.loading = false;
          this.resetError = this.getErrorMessage(error.code);
        },
      });
    }
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Es wurde kein Benutzerkonto mit dieser E-Mail-Adresse gefunden.';
      case 'auth/invalid-email':
        return 'Die eingegebene E-Mail-Adresse ist ungültig.';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';
    }
  }
}
