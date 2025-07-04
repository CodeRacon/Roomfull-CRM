import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { DragDropModule, CdkDragDrop, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';

import { RoomService } from '../../../../core/services/room.service';
import { BookingService } from '../../../../core/services/booking.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Room } from '../../../../core/models/room.model';
import { Booking } from '../../../../core/models/booking.model';
import {
  Observable,
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
  tap,
  take,
  BehaviorSubject,
} from 'rxjs';





// Interface für Slider-Konfiguration
interface SliderConfig {
  min: number;
  max: number;
  step: number;
  value: number;
}

// Interface für verfügbare Slots (überarbeitet)
interface AvailableSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number; // Buchungsdauer
  cleaningTime: number; // Reinigungszeit
  totalDuration: number; // Buchung + Reinigung
  price: number;
  available: boolean;
}

// Interface für Preisberechnung
interface PricingInfo {
  currentPrice: number;
  fullDayPrice: number;
  savings: number;
  discountPercentage: number;
  showFullDayOffer: boolean;
}

// Interface für Reservation-Timer
interface ReservationTimer {
  selectedSlot: AvailableSlot | null;
  expiresAt: Date | null;
  remainingSeconds: number;
}

// Interface für Bracket-Timeline-System
interface TimelineBracket {
  id: string;
  startTimeMinutes: number; // Minutes since 08:00 (0-840)
  duration: number; // Duration in minutes
  endTimeMinutes: number; // Calculated: startTimeMinutes + duration
  position: BracketPosition; // CSS position data
  availability: BracketAvailability;
  isLocked: boolean; // User confirmed this position
  dragConstraints: DragConstraints;
}

interface BracketPosition {
  left: number; // CSS left position in pixels
  width: number; // CSS width in pixels
  snapPosition: number; // Snapped position based on room.steps
}

interface BracketAvailability {
  status: 'available' | 'conflict' | 'blocked';
  conflictRanges: TimeRange[]; // Overlapping existing bookings
  availabilityScore: number; // 0-100% available
  canConfirm: boolean; // Can this position be locked?
}

interface TimeRange {
  startMinutes: number;
  endMinutes: number;
}

interface DragConstraints {
  minLeft: number; // Earliest time (08:00 = 0px)
  maxLeft: number; // Latest time that fits duration before 22:00
  snapGrid: number; // Grid size based on room.steps
}

// Timeline configuration
interface TimelineConfig {
  startHour: number; // 8 (08:00)
  endHour: number; // 22 (22:00)
  totalMinutes: number; // 840 minutes (14 hours)
  pixelsPerMinute: number; // Scale factor for positioning
  hourMarkInterval: number; // Hour grid lines
  stepInterval: number; // Based on room.steps
}

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
    MatButtonToggleModule,
    MatSliderModule,
    MatChipsModule,
    MatProgressBarModule,
    DragDropModule,
  ],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { showError: true },
    },
  ],
  templateUrl: './room-booking.component.html',
  styleUrl: './room-booking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomBookingComponent implements OnInit, AfterViewInit {
  @ViewChild('timelineContainer', { static: false }) timelineContainerRef!: ElementRef<HTMLElement>;
  // observable for room data
  room$!: Observable<Room | null>;

  // formgroups for each step
  dateFormGroup!: FormGroup;
  timeFormGroup!: FormGroup;
  detailsFormGroup!: FormGroup;

  // UI-Status
  loading = false;
  error: string | null = null;
  success = false;

  // timeselection
  minDate = new Date(); // Minimum Date (today)
  availableTimeSlots: AvailableSlot[] = []; // available time slots

  // Slider-System
  sliderConfig: SliderConfig = { min: 30, max: 480, step: 30, value: 120 };
  selectedDuration: number = 120; // Standard: 2 hours
  selectedSlot: AvailableSlot | null = null;

  // timeselection-status
  selectedDate: Date | null = null;

  // Slot-Reservation with Timer
  reservationTimer: ReservationTimer = {
    selectedSlot: null,
    expiresAt: null,
    remainingSeconds: 0
  };
  private timerInterval: any = null;
  private readonly RESERVATION_DURATION = 10 * 60; // 10 Minutes in Seconds

  // price calculation
  pricingInfo: PricingInfo = {
    currentPrice: 0,
    fullDayPrice: 0,
    savings: 0,
    discountPercentage: 10,
    showFullDayOffer: false
  };

  bookings: Booking[] = []; // existing booking for the chosen date

  // === BRACKET-TIMELINE-SYSTEM ===
  timelineConfig: TimelineConfig = {
    startHour: 8,
    endHour: 22,
    totalMinutes: 840, // 14 hours * 60 minutes
    pixelsPerMinute: 1.5, // Scale factor (will be calculated dynamically)
    hourMarkInterval: 60,
    stepInterval: 30 // Default, will be set from room.steps
  };

  timelineBracket: TimelineBracket = {
    id: 'user-bracket',
    startTimeMinutes: 120, // Default 10:00 (2 hours after 08:00)
    duration: 120, // Default 2 hours
    endTimeMinutes: 240, // 12:00
    position: { left: 0, width: 0, snapPosition: 0 },
    availability: {
      status: 'available',
      conflictRanges: [],
      availabilityScore: 100,
      canConfirm: false
    },
    isLocked: false,
    dragConstraints: { minLeft: 0, maxLeft: 0, snapGrid: 30 }
  };

  // Timeline drag state
  isDragging = false;
  timelineElement: HTMLElement | null = null;
  bracketElement: HTMLElement | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private roomService: RoomService,
    private bookingService: BookingService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    // FormGroups initialisieren
    this.dateFormGroup = this.fb.group({
      date: ['', Validators.required],
    });

    this.timeFormGroup = this.fb.group(
      {
        startTime: ['', Validators.required],
        endTime: ['', Validators.required],
      },
      { validators: this.timeRangeValidator }
    );

    this.detailsFormGroup = this.fb.group({
      notes: [''],
    });
  }

  ngOnInit(): void {
    // load room
    this.room$ = this.route.paramMap.pipe(
      map((params) => params.get('id')),
      switchMap((id) => {
        if (!id) {
          this.error = 'Raum-ID nicht gefunden';
          return of(null);
        }
        return this.roomService.getRoomById(id).pipe(
          catchError((err) => {
            this.error = `Fehler beim Laden des Raums: ${err.message}`;
            return of(null);
          })
        );
      })
    );

    // if date changes, load room and configure slider
    this.dateFormGroup.get('date')!.valueChanges.subscribe((date) => {
      if (date) {
        this.selectedDate = date;
        this.loadRoomAndConfigureSlider();
        this.resetSelection();
      }
    });

    // price calculation is triggered by time selection
  }

  ngAfterViewInit(): void {
    // Set timeline element reference after view initialization
    if (this.timelineContainerRef) {
      this.timelineElement = this.timelineContainerRef.nativeElement;
      // Recalculate pixels per minute with actual container width
      this.timelineConfig.pixelsPerMinute = this.calculatePixelsPerMinute();
      this.updateBracketPosition();



      this.cdr.detectChanges();
    }
  }

  // generates slider configuration based on room
  getSliderConfig(room: Room): SliderConfig {
    const min = room.minDuration;
    const max = 480; // 8 hours Maximum

    // Fallback for steps, if not existing
    let step = room.steps;
    if (!step || step === undefined) {
      const fallbackSteps = {
        'meeting': 30,
        'office': 60,
        'booth': 15,
        'open_world': 10
      };
      step = fallbackSteps[room.type] || 30;
    }

    // standard-value: minimum duration or first multiple of the step size
    const value = Math.max(room.minDuration, step);

    return { min, max, step, value };
  }

  // cleaning-time per room type
  getCleaningTime(roomType: Room['type']): number {
    const cleaningTimes = {
      'meeting': 15,      // +15 Min
      'office': 15,       // +15 Min
      'booth': 10,        // +10 Min
      'open_world': 5     // +5 Min
    };
    return cleaningTimes[roomType];
  }

  // alais for backwards compatibility
  getBufferTime(roomType: Room['type']): number {
    return this.getCleaningTime(roomType);
  }

  // calculate actual blocking time
  calculateTotalBlockTime(duration: number, roomType: Room['type']): number {
    return duration + this.getBufferTime(roomType);
  }

  // Load room and configure slider
  private loadRoomAndConfigureSlider(): void {
    this.room$.pipe(take(1)).subscribe((room) => {
      if (room) {
        this.sliderConfig = this.getSliderConfig(room);
        this.selectedDuration = this.sliderConfig.value;

        // Initialize timeline with room settings (fallback logic now in RoomService)
        this.initializeTimeline(room);

        // use setTimeout to avoid Change Detection Cycle
        setTimeout(() => {
          this.onDurationChange();
        });
      }
    });
  }

  // handle duration change
  onDurationChange(value?: number): void {
    if (value !== undefined) {
      this.selectedDuration = value;
    }

    // additional validation logic
    if (!this.selectedDate) {
      this.availableTimeSlots = [];
      this.cdr.detectChanges();
      return;
    }

    if (!this.selectedDuration || this.selectedDuration <= 0) {
      this.availableTimeSlots = [];
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.clearSlotReservation();
    this.selectedSlot = null;
    this.cdr.detectChanges();

    // get room and bookings for this day
    const roomId = this.route.snapshot.paramMap.get('id')!;

    combineLatest([
      this.room$,
      this.bookingService.getBookingsForRoomAndDate(roomId, this.selectedDate),
    ])
      .pipe(take(1))
      .subscribe({
        next: ([room, bookings]) => {
          if (!room) {
            this.error = 'Raum konnte nicht geladen werden';
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          // Room steps fallback is now handled in RoomService - clean architecture!
          this.bookings = bookings;
          this.generateAvailableSlots(this.selectedDate!, room, bookings);
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = `Fehler beim Laden der Verfügbarkeit: ${err.message}`;
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // gnereate available slots based on selected duration
  private generateAvailableSlots(date: Date, room: Room, bookings: Booking[]): void {
    this.availableTimeSlots = [];

    if (!this.selectedDuration) {
      return;
    }

    const duration = this.selectedDuration;
    const cleaningTime = this.getCleaningTime(room.type);
    const totalBlockTime = duration + cleaningTime;

    // for every half hour between 8:00 and 21:30 (so that even late bookings are possible)
    for (let hour = 8; hour < 22; hour++) {
      for (let minute of [0, 30]) {
        const startDateTime = new Date(date);
        startDateTime.setHours(hour, minute, 0, 0);

        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + duration);

        const blockEndDateTime = new Date(startDateTime);
        blockEndDateTime.setMinutes(blockEndDateTime.getMinutes() + totalBlockTime);

        // check if this time slot is available (no overlap with bookings)
        const isAvailable = !bookings.some((booking) => {
          const bookingStart = booking.startTime instanceof Date
            ? booking.startTime
            : new Date(booking.startTime);
          const bookingEnd = booking.endTime instanceof Date
            ? booking.endTime
            : new Date(booking.endTime);

          // check for overlap with actual booking time and cleaning time
          const overlaps = !(blockEndDateTime <= bookingStart || startDateTime >= bookingEnd);
          return overlaps;
        });

        // check if the end time is within the opening hours
        const withinHours = endDateTime.getHours() < 22 ||
          (endDateTime.getHours() === 22 && endDateTime.getMinutes() === 0);

        if (isAvailable && withinHours) {
          const slotId = `${hour}-${minute}-${duration}`;
          const startTimeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const endTimeStr = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

          // calculate price for this slot (with discount if available)
          let price = room.pricePerHour * (duration / 60);

          // Apply discount if eligible
          const hasDiscount = !!(room.discountPercentage && room.discountThresholdMinutes);
          const isDiscountEligible = hasDiscount && duration >= room.discountThresholdMinutes!;

          if (isDiscountEligible) {
            const discountMultiplier = 1 - (room.discountPercentage! / 100);
            price = price * discountMultiplier;
          }

          this.availableTimeSlots.push({
            id: slotId,
            startTime: startTimeStr,
            endTime: endTimeStr,
            duration: duration,
            cleaningTime: cleaningTime,
            totalDuration: totalBlockTime,
            price: price,
            available: true
          });
        }
      }
    }

    // update price calculation
    this.updatePricingInfo();

    // IMPORTANT: Trigger Change Detection after slot generation
    this.cdr.detectChanges();
  }

  // slot-selection with reservation 
  selectTimeSlot(slot: AvailableSlot): void {
    // cancel previoous slot reservation
    this.clearSlotReservation();

    this.selectedSlot = slot;
    this.timeFormGroup.patchValue({
      startTime: slot.startTime,
      endTime: slot.endTime
    });

    // update price calculation
    this.updatePricingInfo();

    // start reservation timer
    this.startSlotReservation();
  }

  // price calculation with discount display
  updatePricingInfo(): void {
    this.room$.pipe(take(1)).subscribe((room) => {
      if (!room || !this.selectedDuration) {
        return;
      }

      const basePrice = (this.selectedDuration / 60) * room.pricePerHour;
      let currentPrice = basePrice;

      // Check if discount should be applied
      const hasDiscount = !!(room.discountPercentage && room.discountThresholdMinutes);
      const isDiscountEligible = hasDiscount && this.selectedDuration >= room.discountThresholdMinutes!;

      if (isDiscountEligible) {
        // Apply the room's discount percentage
        const discountMultiplier = 1 - (room.discountPercentage! / 100);
        currentPrice = basePrice * discountMultiplier;
      }

      // Calculate full day pricing (8 hours)
      const fullDayBasePrice = 8 * room.pricePerHour;
      let fullDayPrice = fullDayBasePrice;

      if (hasDiscount && 480 >= room.discountThresholdMinutes!) {
        const discountMultiplier = 1 - (room.discountPercentage! / 100);
        fullDayPrice = fullDayBasePrice * discountMultiplier;
      }

      const savings = fullDayBasePrice - fullDayPrice;

      this.pricingInfo = {
        currentPrice: currentPrice,
        fullDayPrice: fullDayPrice,
        savings: savings,
        discountPercentage: room.discountPercentage || 0,
        showFullDayOffer: hasDiscount && this.selectedDuration < 480 // show only if discount is applicable
      };
    });
  }

  // handle slider change
  onSliderChange(event: any): void {
    const newValue = event.target?.value || event.value;
    this.selectedDuration = parseInt(newValue, 10);
    this.onDurationChange();
    this.updatePricingInfo();

    // Update bracket duration and recalculate position
    this.updateBracketDuration(this.selectedDuration);
  }

  // === BRACKET-TIMELINE-METHODS ===

  // Update bracket duration and recalculate constraints
  updateBracketDuration(newDuration: number): void {
    this.timelineBracket.duration = newDuration;
    this.timelineBracket.endTimeMinutes = this.timelineBracket.startTimeMinutes + newDuration;

    // Recalculate drag constraints
    this.updateDragConstraints();

    // Update visual position
    this.updateBracketPosition();

    // Check availability for new duration
    this.checkBracketAvailability();
  }

  // Initialize timeline configuration based on room settings
  initializeTimeline(room: Room): void {
    // IMPORTANT: Ensure stepInterval matches slider exactly
    this.timelineConfig.stepInterval = room.steps || 30;
    this.timelineConfig.pixelsPerMinute = this.calculatePixelsPerMinute();

    // Set initial bracket position - FIXED: Start at a sensible position
    this.timelineBracket.startTimeMinutes = 120; // 10:00 (2 hours after 08:00)
    this.timelineBracket.duration = this.selectedDuration;
    this.timelineBracket.endTimeMinutes = this.timelineBracket.startTimeMinutes + this.selectedDuration;

    this.updateDragConstraints();
    this.updateBracketPosition();
    this.checkBracketAvailability();
  }

  // Calculate pixels per minute to ensure full timeline visibility
  calculatePixelsPerMinute(): number {
    // For consistent timeline, use fixed pixels per minute based on min-width
    // min-width: 1260px for 14 hours = 90px per hour = 1.5px per minute
    const pixelsPerMinute = 1.5;
    return pixelsPerMinute;
  }

  // Update drag constraints based on current duration
  updateDragConstraints(): void {
    const maxStartTime = this.timelineConfig.totalMinutes - this.timelineBracket.duration;

    this.timelineBracket.dragConstraints = {
      minLeft: 0,
      maxLeft: maxStartTime * this.timelineConfig.pixelsPerMinute,
      snapGrid: this.timelineConfig.stepInterval * this.timelineConfig.pixelsPerMinute
    };
  }

  // Update bracket visual position
  updateBracketPosition(): void {
    const left = this.timelineBracket.startTimeMinutes * this.timelineConfig.pixelsPerMinute;
    const width = this.timelineBracket.duration * this.timelineConfig.pixelsPerMinute;

    this.timelineBracket.position = {
      left: left,
      width: width,
      snapPosition: this.snapToGrid(left)
    };
  }

  // Snap position to grid based on room steps (synchronized with slider)
  snapToGrid(position: number): number {
    // Use current step interval from timeline config (already set from room data)
    const snapSize = this.timelineConfig.stepInterval * this.timelineConfig.pixelsPerMinute;
    const snappedPosition = Math.round(position / snapSize) * snapSize;
    return snappedPosition;
  }

  // Check bracket availability against existing bookings
  checkBracketAvailability(): void {
    const startTime = this.timelineBracket.startTimeMinutes;
    const endTime = this.timelineBracket.endTimeMinutes;

    // Get room type for cleaning time calculation
    this.room$.pipe(take(1)).subscribe((room) => {
      if (!room) return;

      const cleaningTime = this.getCleaningTime(room.type);
      const totalEndTime = endTime + cleaningTime;

      // Check against existing bookings
      const conflicts = this.findConflictingBookings(startTime, totalEndTime);

      this.timelineBracket.availability = {
        status: conflicts.length === 0 ? 'available' :
                this.calculateAvailabilityScore(startTime, totalEndTime, conflicts) > 0 ? 'conflict' : 'blocked',
        conflictRanges: conflicts,
        availabilityScore: this.calculateAvailabilityScore(startTime, totalEndTime, conflicts),
        canConfirm: conflicts.length === 0
      };

      this.cdr.detectChanges();
    });
  }

  // Find conflicting bookings in the specified time range
  findConflictingBookings(startMinutes: number, endMinutes: number): TimeRange[] {
    const conflicts: TimeRange[] = [];

    this.bookings.forEach(booking => {
      const bookingStart = this.getMinutesFromMidnight(booking.startTime);
      const bookingEnd = this.getMinutesFromMidnight(booking.endTime);

      // Convert to minutes since 08:00
      const bookingStartMinutes = bookingStart - (8 * 60);
      const bookingEndMinutes = bookingEnd - (8 * 60);

      // Check for overlap
      if (!(endMinutes <= bookingStartMinutes || startMinutes >= bookingEndMinutes)) {
        conflicts.push({
          startMinutes: Math.max(startMinutes, bookingStartMinutes),
          endMinutes: Math.min(endMinutes, bookingEndMinutes)
        });
      }
    });

    return conflicts;
  }

  // Calculate availability score (0-100%)
  calculateAvailabilityScore(startMinutes: number, endMinutes: number, conflicts: TimeRange[]): number {
    if (conflicts.length === 0) return 100;

    const totalDuration = endMinutes - startMinutes;
    const conflictDuration = conflicts.reduce((sum, conflict) =>
      sum + (conflict.endMinutes - conflict.startMinutes), 0);

    return Math.max(0, Math.round(((totalDuration - conflictDuration) / totalDuration) * 100));
  }

  // Convert Date to minutes from midnight
  getMinutesFromMidnight(date: Date | string): number {
    const d = date instanceof Date ? date : new Date(date);
    return d.getHours() * 60 + d.getMinutes();
  }

  // Manual drag implementation (CDK Drag wasn't working properly)
  private dragStartX = 0;
  private bracketStartLeft = 0;
  private boundMouseMove = this.onMouseMove.bind(this);
  private boundMouseUp = this.onMouseUp.bind(this);

  onBracketMouseDown(event: MouseEvent): void {
    event.preventDefault();

    this.isDragging = true;
    this.timelineBracket.isLocked = false;
    this.dragStartX = event.clientX;
    this.bracketStartLeft = this.timelineBracket.position.left;

    // Add global mouse event listeners
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    // Calculate how much the mouse has moved
    const deltaX = event.clientX - this.dragStartX;
    const newLeft = this.bracketStartLeft + deltaX;

    // Convert to minutes
    const newStartMinutes = newLeft / this.timelineConfig.pixelsPerMinute;
    const snappedMinutes = this.snapToMinuteGrid(newStartMinutes);

    // Ensure within bounds
    const maxStartMinutes = this.timelineConfig.totalMinutes - this.timelineBracket.duration;
    const clampedStartMinutes = Math.max(0, Math.min(snappedMinutes, maxStartMinutes));

    // IMPORTANT: Update bracket time data
    this.timelineBracket.startTimeMinutes = clampedStartMinutes;
    this.timelineBracket.endTimeMinutes = clampedStartMinutes + this.timelineBracket.duration;

    // Update visual position
    this.updateBracketPosition();
    this.updateFormFromBracket();
    this.checkBracketAvailability();

    // Force change detection
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  private onMouseUp(event: MouseEvent): void {
    this.isDragging = false;

    // Remove global event listeners
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);

    // Final position update
    this.updateBracketPosition();
    this.checkBracketAvailability();
    this.updateFormFromBracket();
  }

  // Snap minutes to the step interval (same as slider)
  snapToMinuteGrid(minutes: number): number {
    const stepInterval = this.timelineConfig.stepInterval;
    if (!stepInterval || stepInterval <= 0) {
      console.warn('⚠️ Invalid stepInterval in snapToMinuteGrid:', stepInterval, 'using fallback 30');
      return Math.round(minutes / 30) * 30;
    }

    const snappedValue = Math.round(minutes / stepInterval) * stepInterval;
    return snappedValue;
  }

  // Lock bracket position (user confirmation)
  lockBracketPosition(): void {
    if (!this.timelineBracket.availability.canConfirm) return;

    this.timelineBracket.isLocked = true;
    this.updateFormFromBracket();

    // Start reservation timer
    this.startSlotReservation();
  }

  // Update form controls from bracket position
  updateFormFromBracket(): void {
    const startTime = this.minutesToTimeString(this.timelineBracket.startTimeMinutes);
    const endTime = this.minutesToTimeString(this.timelineBracket.endTimeMinutes);

    this.timeFormGroup.patchValue({
      startTime: startTime,
      endTime: endTime
    });
  }

  // Convert minutes since 08:00 to time string
  minutesToTimeString(minutes: number): string {
    const totalMinutes = minutes + (8 * 60); // Add 08:00 offset
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Get formatted time display for bracket
  getBracketTimeDisplay(): string {
    const startTime = this.minutesToTimeString(this.timelineBracket.startTimeMinutes);
    const endTime = this.minutesToTimeString(this.timelineBracket.endTimeMinutes);
    const display = `${startTime} - ${endTime}`;

    return display;
  }

  // Get bracket CSS styles
  getBracketStyles(): { [key: string]: string } {
    const position = this.timelineBracket.position;
    const availability = this.timelineBracket.availability;

    let backgroundColor = '#4CAF50'; // Green = available
    let borderColor = '#4CAF50';

    if (availability.status === 'conflict') {
      backgroundColor = '#FF9800'; // Orange = conflict
      borderColor = '#FF9800';
    } else if (availability.status === 'blocked') {
      backgroundColor = '#f44336'; // Red = blocked
      borderColor = '#f44336';
    }

    return {
      'left': `${position.left}px`,
      'width': `${position.width - 2}px`,
      'background-color': backgroundColor,
      'border-color': borderColor,
      'opacity': this.timelineBracket.isLocked ? '0.9' : '0.7'
    };
  }

  // Get booking visual position for existing bookings
  getBookingPosition(booking: Booking): { left: number; width: number } {
    const startMinutes = this.getMinutesFromMidnight(booking.startTime) - (8 * 60); // Subtract 08:00 offset
    const endMinutes = this.getMinutesFromMidnight(booking.endTime) - (8 * 60);

    return {
      left: Math.max(0, startMinutes * this.timelineConfig.pixelsPerMinute),
      width: Math.max(0, (endMinutes - startMinutes) * this.timelineConfig.pixelsPerMinute)
    };
  }

  // === ENHANCED GRID SYSTEM ===

  // Get half-hour marks (e.g., 8:30, 9:30, etc.)
  getHalfHourMarks(): { position: number }[] {
    const marks: { position: number }[] = [];
    for (let hour = 8; hour < 22; hour++) {
      // Half hour mark (e.g., 8:30)
      const halfHourMinutes = (hour - 8) * 60 + 30;
      const position = halfHourMinutes * this.timelineConfig.pixelsPerMinute;
      marks.push({ position });
    }
    return marks;
  }

  // Get quarter-hour marks (e.g., 8:15, 8:45, 9:15, etc.)
  getQuarterHourMarks(): { position: number }[] {
    const marks: { position: number }[] = [];
    for (let hour = 8; hour < 22; hour++) {
      // First quarter (e.g., 8:15)
      const firstQuarterMinutes = (hour - 8) * 60 + 15;
      const firstPosition = firstQuarterMinutes * this.timelineConfig.pixelsPerMinute;
      marks.push({ position: firstPosition });

      // Third quarter (e.g., 8:45)
      const thirdQuarterMinutes = (hour - 8) * 60 + 45;
      const thirdPosition = thirdQuarterMinutes * this.timelineConfig.pixelsPerMinute;
      marks.push({ position: thirdPosition });
    }
    return marks;
  }

  // start slot-reservation with timer
  startSlotReservation(): void {
    const now = new Date();
    this.reservationTimer.expiresAt = new Date(now.getTime() + this.RESERVATION_DURATION * 1000);
    this.reservationTimer.remainingSeconds = this.RESERVATION_DURATION;
    this.reservationTimer.selectedSlot = this.selectedSlot;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this.reservationTimer.remainingSeconds -= 1;

      if (this.reservationTimer.remainingSeconds <= 0) {
        this.clearSlotReservation();
        this.snackBar.open('Slot-Reservierung abgelaufen. Bitte wähle erneut.', 'OK', {
          duration: 5000
        });
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  // tidy up slot reservation
  clearSlotReservation(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.reservationTimer = {
      selectedSlot: null,
      expiresAt: null,
      remainingSeconds: 0
    };
  }

  // Verlängere Reservierung um weitere 10 Minuten
  // refresh reservation timer
  extendReservation(): void {
    if (this.selectedSlot) {
      this.startSlotReservation();
      this.snackBar.open('Reservierung um 10 Minuten verlängert', 'OK', {
        duration: 3000
      });
    }
  }

  // reset all selections
  resetSelection(): void {
    this.clearSlotReservation();
    this.selectedSlot = null;
    // keep selectedDuration (controlled by slider)
    this.availableTimeSlots = [];
    this.timeFormGroup.patchValue({
      startTime: '',
      endTime: ''
    });
    // reset pricing info
    this.pricingInfo = {
      currentPrice: 0,
      fullDayPrice: 0,
      savings: 0,
      discountPercentage: 10,
      showFullDayOffer: false
    };
    this.cdr.detectChanges();
  }

  // validator for time range (end must be after start)
  timeRangeValidator(group: FormGroup): { [key: string]: any } | null {
    const startTime = group.get('startTime')?.value;
    const endTime = group.get('endTime')?.value;

    if (!startTime || !endTime) {
      return null;
    }

    // parse time strings
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // compare hours and minutes
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (endMinutes <= startMinutes) {
      return { invalidTimeRange: true };
    }

    return null;
  }

  // Helper-Methodes for Template
  getDurationLabel(duration: number): string {
    // Schutz vor undefined/null/NaN Werten
    // protect from undefined/null/NaN values
    if (!duration || isNaN(duration) || duration <= 0) {
      return '0 Min';
    }

    if (duration < 60) {
      return `${duration} Min`;
    } else {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      if (minutes === 0) {
        return `${hours} Stunde${hours > 1 ? 'n' : ''}`;
      } else {
        return `${hours}:${minutes.toString().padStart(2, '0')} Stunden`;
      }
    }
  }

  // format remaining reservation time
  getFormattedReservationTime(): string {
    const totalSeconds = this.reservationTimer.remainingSeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // check if a slot is selected
  isSlotSelected(slot: AvailableSlot): boolean {
    return this.selectedSlot?.id === slot.id;
  }

  // Getter for Template-Access
  get hasActiveReservation(): boolean {
    return this.reservationTimer.remainingSeconds > 0;
  }

  get currentPrice(): number {
    return this.pricingInfo.currentPrice;
  }

  // Helper method to check if discount is applied for current selection
  isDiscountApplied(): boolean {
    let result = false;
    this.room$.pipe(take(1)).subscribe((room) => {
      if (room && room.discountPercentage && room.discountThresholdMinutes) {
        result = this.selectedDuration >= room.discountThresholdMinutes;
      }
    });
    return result;
  }





  // combine date and time to a Date object
  private combineDateTime(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  }

  // check if the minimum duration for the room is met
  private checkMinDuration(
    startDateTime: Date,
    endDateTime: Date,
    minDuration: number
  ): boolean {
    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    return durationMinutes >= minDuration;
  }

  // format the price for display
  formatPrice(price: number): string {
    return `${price.toFixed(2)} €`;
  }

  // readable Room Type
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

  // validate next step in stepper
  validateStep(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0: // validate date selection
        return this.dateFormGroup.valid;
      case 1: // validate time selection
        return this.timeFormGroup.valid;
      default:
        return true;
    }
  }

  // finalize booking
  onSubmit(): void {
    if (this.dateFormGroup.invalid || this.timeFormGroup.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // get form values
    const date = this.dateFormGroup.get('date')!.value;
    const startTime = this.timeFormGroup.get('startTime')!.value;
    const endTime = this.timeFormGroup.get('endTime')!.value;
    const notes = this.detailsFormGroup.get('notes')!.value;

    // create Date objects for start and end
    const startDateTime = this.combineDateTime(date, startTime);
    const endDateTime = this.combineDateTime(date, endTime);

    // check if the user is logged in
    this.authService.user$
      .pipe(
        take(1),
        switchMap((user) => {
          if (!user) {
            // if not logged in, navigate to login page
            this.snackBar
              .open('Bitte melde dich an, um buchen zu können', 'Zum Login', {
                duration: 5000,
              })
              .afterDismissed()
              .subscribe(() => {
                this.router.navigate(['/auth/login']);
              });
            this.loading = false;
            return of(null);
          }

          // check room availability
          return this.room$.pipe(
            take(1),
            switchMap((room) => {
              if (!room) {
                this.error = 'Raum konnte nicht gefunden werden';
                this.loading = false;
                return of(null);
              }

              // check minimum duration
              if (
                !this.checkMinDuration(
                  startDateTime,
                  endDateTime,
                  room.minDuration
                )
              ) {
                this.error = `Die Mindestbuchungsdauer für diesen Raum beträgt ${room.minDuration} Minuten`;
                this.loading = false;
                return of(null);
              }

              // create booking directly (availability was already checked during slot selection)
              return this.bookingService.createBooking({
                roomId: room.id!,
                startTime: startDateTime,
                endTime: endDateTime,
                notes: notes || '',
              });
            })
          );
        })
      )
      .subscribe({
        next: (bookingId) => {
          if (bookingId) {
            this.success = true;
            this.loading = false;

            // success message and redirect to booking detail page
            this.snackBar.open('Buchung erfolgreich erstellt!', 'Schließen', {
              duration: 5000,
              panelClass: 'success-snackbar',
            });

            this.router.navigate(['/bookings', bookingId]);
          }
        },
        error: (err) => {
          this.error = `Fehler bei der Buchung: ${err.message}`;
          this.loading = false;
          console.error('Buchungsfehler:', err);
        },
      });
  }

  // for template reference: alias for onSubmit
  onBookingSubmit(): void {
    this.onSubmit();
  }

  // reset of time selection (replaced by resetSelection)
  resetTimeSelection(): void {
    this.resetSelection();
  }
}
