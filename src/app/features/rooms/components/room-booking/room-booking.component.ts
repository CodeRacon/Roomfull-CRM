import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { RoomService } from '../../../../core/services/room.service';
import { BookingService } from '../../../../core/services/booking.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Room } from '../../../../core/models/room.model';
import {
  Observable,
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

@Component({
  selector: 'app-room-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatSnackBarModule,
  ],
  templateUrl: './room-booking.component.html',
  styleUrl: './room-booking.component.scss',
})
export class RoomBookingComponent implements OnInit {
  room$!: Observable<Room | null>;
  bookingForm!: FormGroup;
  loading = false;
  error: string | null = null;
  success = false;

  // Time slots for the select fields
  timeSlots: string[] = [];

  // Minimum date for the datepicker (today)
  minDate = new Date();

  // Calculated price
  calculatedPrice = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private roomService: RoomService,
    private bookingService: BookingService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    // Initialize the booking form
    this.bookingForm = this.fb.group(
      {
        date: ['', Validators.required],
        startTime: ['', Validators.required],
        endTime: ['', Validators.required],
        notes: [''],
      },
      { validators: this.timeRangeValidator }
    );

    // Generate time slots (every 30 minutes)
    this.generateTimeSlots();
  }

  ngOnInit(): void {
    // Get room ID from route parameters and load room details
    this.room$ = this.route.paramMap.pipe(
      map((params) => params.get('id')),
      switchMap((id) => {
        if (!id) {
          this.error = 'Room ID not found';
          return of(null);
        }
        return this.roomService.getRoomById(id).pipe(
          catchError((err) => {
            this.error = `Error loading room: ${err.message}`;
            return of(null);
          })
        );
      })
    );

    // Calculate price when form values change
    this.bookingForm.valueChanges
      .pipe(
        startWith(this.bookingForm.value),
        switchMap((formValue) => {
          if (formValue.date && formValue.startTime && formValue.endTime) {
            return this.room$.pipe(
              map((room) => {
                if (!room) return 0;

                const startDateTime = this.combineDateTime(
                  formValue.date,
                  formValue.startTime
                );
                const endDateTime = this.combineDateTime(
                  formValue.date,
                  formValue.endTime
                );

                // Calculate duration in hours
                const durationMs =
                  endDateTime.getTime() - startDateTime.getTime();
                const durationHours = durationMs / (1000 * 60 * 60);

                // Calculate price
                return room.pricePerHour * durationHours;
              })
            );
          }
          return of(0);
        })
      )
      .subscribe((price) => {
        this.calculatedPrice = price;
      });
  }

  // Generate time slots for the select fields (every 30 minutes)
  private generateTimeSlots(): void {
    const slots = [];
    for (let hour = 8; hour < 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    this.timeSlots = slots;
  }

  // Combine date and time strings into a Date object
  private combineDateTime(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  }

  // Custom validator to ensure end time is after start time
  private timeRangeValidator(group: FormGroup): { [key: string]: any } | null {
    const date = group.get('date')?.value;
    const startTime = group.get('startTime')?.value;
    const endTime = group.get('endTime')?.value;

    if (date && startTime && endTime) {
      const startDateTime = new Date(date);
      const endDateTime = new Date(date);

      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      startDateTime.setHours(startHours, startMinutes, 0, 0);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      if (startDateTime >= endDateTime) {
        return { invalidTimeRange: true };
      }
    }

    return null;
  }

  // Check if the selected time range is valid for the room
  checkAvailability(): Observable<boolean> {
    return this.room$.pipe(
      switchMap((room) => {
        if (!room) return of(false);

        const formValue = this.bookingForm.value;
        const startDateTime = this.combineDateTime(
          formValue.date,
          formValue.startTime
        );
        const endDateTime = this.combineDateTime(
          formValue.date,
          formValue.endTime
        );

        // Check minimum duration
        const durationMs = endDateTime.getTime() - startDateTime.getTime();
        const durationMinutes = durationMs / (1000 * 60);

        if (durationMinutes < room.minDuration) {
          this.snackBar.open(
            `Minimum booking duration for this room is ${room.minDuration} minutes`,
            'Close',
            { duration: 5000 }
          );
          return of(false);
        }

        // Check if room is available
        return this.bookingService.checkRoomAvailability(
          room.id!,
          startDateTime,
          endDateTime
        );
      })
    );
  }

  // Submit the booking
  onSubmit(): void {
    if (this.bookingForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // First check if the user is authenticated
    this.authService.user$
      .pipe(
        switchMap((user) => {
          if (!user) {
            // Redirect to login if not authenticated
            this.router.navigate(['/auth/login']);
            return of(null);
          }

          // Then check availability
          return this.checkAvailability().pipe(
            switchMap((isAvailable) => {
              if (!isAvailable) {
                this.error =
                  'This time slot is not available. Please choose another time.';
                this.loading = false;
                return of(null);
              }

              // If available, create the booking
              return this.room$.pipe(
                switchMap((room) => {
                  if (!room) {
                    this.error = 'Room not found';
                    this.loading = false;
                    return of(null);
                  }

                  const formValue = this.bookingForm.value;
                  const startDateTime = this.combineDateTime(
                    formValue.date,
                    formValue.startTime
                  );
                  const endDateTime = this.combineDateTime(
                    formValue.date,
                    formValue.endTime
                  );

                  return this.bookingService
                    .createBooking({
                      roomId: room.id!,
                      startTime: startDateTime,
                      endTime: endDateTime,
                      notes: formValue.notes,
                    })
                    .pipe(
                      tap((bookingId) => {
                        this.success = true;
                        this.loading = false;
                        // Navigate to booking details or confirmation page
                        this.router.navigate(['/bookings', bookingId]);
                      }),
                      catchError((err) => {
                        this.error = `Error creating booking: ${err.message}`;
                        this.loading = false;
                        return of(null);
                      })
                    );
                })
              );
            })
          );
        })
      )
      .subscribe();
  }

  // Format price for display
  formatPrice(price: number): string {
    return `${price.toFixed(2)} €`;
  }

  // Helper method to get readable room type
  getRoomTypeLabel(type: Room['type']): string {
    switch (type) {
      case 'meeting':
        return 'Meetingraum';
      case 'office':
        return 'Büroraum';
      case 'booth':
        return 'Booth';
      case 'open_world':
        return 'Open World';
      default:
        return type;
    }
  }
}
