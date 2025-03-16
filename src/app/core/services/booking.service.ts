import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentReference,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, from, map, switchMap, of, combineLatest } from 'rxjs';
import { Booking } from '../models/booking.model';
import { AuthService } from './auth.service';
import { RoomService } from './room.service';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly collectionName = 'bookings';

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private roomService: RoomService
  ) {}

  // Get all bookings for the current user
  getUserBookings(): Observable<Booking[]> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return of([]);
        }

        const bookingsCollection = collection(
          this.firestore,
          this.collectionName
        );
        const userBookingsQuery = query(
          bookingsCollection,
          where('userId', '==', user.uid),
          orderBy('startTime', 'desc')
        );

        return collectionData(userBookingsQuery, {
          idField: 'id',
        }) as Observable<Booking[]>;
      })
    );
  }

  // Get a single booking by ID
  getBookingById(id: string): Observable<Booking | null> {
    const bookingDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(bookingDoc, { idField: 'id' }) as Observable<Booking>;
  }

  // Create a new booking
  createBooking(bookingData: {
    roomId: string;
    startTime: Date;
    endTime: Date;
    notes?: string;
  }): Observable<string> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          throw new Error('User must be logged in to create a booking');
        }

        // Get room details to calculate price and validate availability
        return this.roomService.getRoomById(bookingData.roomId).pipe(
          switchMap((room) => {
            if (!room) {
              throw new Error('Room not found');
            }

            if (!room.isActive) {
              throw new Error('This room is not available for booking');
            }

            // Calculate duration in hours
            const durationMs =
              bookingData.endTime.getTime() - bookingData.startTime.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);

            // Validate minimum duration
            const durationMinutes = durationMs / (1000 * 60);
            if (durationMinutes < room.minDuration) {
              throw new Error(
                `Minimum booking duration for this room is ${room.minDuration} minutes`
              );
            }

            // Calculate price
            const price = room.pricePerHour * durationHours;

            // Create booking object
            const booking: Omit<Booking, 'id'> = {
              roomId: room.id!,
              userId: user.uid,
              startTime: bookingData.startTime,
              endTime: bookingData.endTime,
              status: 'pending', // Initial status
              price: price,
              notes: bookingData.notes || '',
              roomName: room.name, // Denormalized for faster rendering
              userName: user.displayName || user.email, // Denormalized for faster rendering
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Add to Firestore
            const bookingsCollection = collection(
              this.firestore,
              this.collectionName
            );
            return from(addDoc(bookingsCollection, booking));
          })
        );
      }),
      map((docRef) => docRef.id)
    );
  }

  // Update booking status
  updateBookingStatus(id: string, status: Booking['status']): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          throw new Error('User must be logged in to update a booking');
        }

        const bookingDoc = doc(this.firestore, `${this.collectionName}/${id}`);
        return from(
          updateDoc(bookingDoc, {
            status,
            updatedAt: new Date(),
          })
        );
      })
    );
  }

  // Cancel a booking
  cancelBooking(id: string): Observable<void> {
    return this.updateBookingStatus(id, 'cancelled');
  }

  // Check if a room is available for a specific time period
  // Check if a room is available for a specific time period
  checkRoomAvailability(
    roomId: string,
    startTime: Date,
    endTime: Date
  ): Observable<boolean> {
    const bookingsCollection = collection(this.firestore, this.collectionName);

    // Query for any bookings that overlap with the requested time period
    const overlappingBookingsQuery = query(
      bookingsCollection,
      where('roomId', '==', roomId),
      where('status', '!=', 'cancelled'),
      where('startTime', '<', endTime),
      where('endTime', '>', startTime)
    );

    return collectionData(overlappingBookingsQuery).pipe(
      map((bookings) => bookings.length === 0) // Return true if no overlapping bookings found
    );
  }

  // Get all bookings (admin only)
  getAllBookings(): Observable<Booking[]> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user || !this.authService.isAdmin(user)) {
          throw new Error(
            'Permission denied: Only admins can view all bookings'
          );
        }

        const bookingsCollection = collection(
          this.firestore,
          this.collectionName
        );
        const allBookingsQuery = query(
          bookingsCollection,
          orderBy('startTime', 'desc')
        );

        return collectionData(allBookingsQuery, {
          idField: 'id',
        }) as Observable<Booking[]>;
      })
    );
  }
}
