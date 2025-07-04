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
import { Observable, from, map, switchMap, of, combineLatest, catchError } from 'rxjs';
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

  // NEW: Get buffer times for room type
  private getBufferTimes(roomType: string): { before: number; after: number } {
    const bufferConfig = {
      'meeting': { before: 0, after: 15 },
      'office': { before: 0, after: 15 },
      'booth': { before: 0, after: 10 },
      'open_world': { before: 0, after: 5 }
    };
    
    return bufferConfig[roomType as keyof typeof bufferConfig] || { before: 0, after: 0 };
  }

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
    roomType?: string; // NEW: for buffer time calculation
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

            // Calculate buffer times based on room type
            const bufferTimes = this.getBufferTimes(room.type);
            const blockStartTime = new Date(bookingData.startTime.getTime() - (bufferTimes.before * 60000));
            const blockEndTime = new Date(bookingData.endTime.getTime() + (bufferTimes.after * 60000));

            // Create booking object
            const booking: Omit<Booking, 'id'> = {
              roomId: room.id!,
              userId: user.uid,
              startTime: bookingData.startTime,
              endTime: bookingData.endTime,
              status: 'confirmed', // Directly confirmed (no payment required)
              price: price,
              notes: bookingData.notes || '',
              roomName: room.name, // Denormalized for faster rendering
              userName: user.displayName || user.email, // Denormalized for faster rendering
              createdAt: new Date(),
              updatedAt: new Date(),
              // NEW: Buffer time fields
              blockStartTime,
              blockEndTime,
              bufferBefore: bufferTimes.before,
              bufferAfter: bufferTimes.after,
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
  checkRoomAvailability(
    roomId: string,
    startTime: Date,
    endTime: Date,
    roomType?: string // NEW: for buffer time calculation
  ): Observable<boolean> {
    const bookingsCollection = collection(this.firestore, this.collectionName);

    // Query for any bookings that overlap with the requested time period
    // Firestore doesn't support multiple range queries, so we'll filter in memory
    const roomBookingsQuery = query(
      bookingsCollection,
      where('roomId', '==', roomId),
      where('status', '!=', 'cancelled')
    );

    return collectionData(roomBookingsQuery).pipe(
      map((bookings) => {
        // Calculate buffer times if roomType is provided
        const bufferTimes = roomType ? this.getBufferTimes(roomType) : { before: 0, after: 0 };
        const bufferStartTime = new Date(startTime.getTime() - (bufferTimes.before * 60000));
        const bufferEndTime = new Date(endTime.getTime() + (bufferTimes.after * 60000));

        // Filter overlapping bookings in memory
        const overlappingBookings = bookings.filter((booking) => {
          // Use block times if available, otherwise fall back to user times
          const bookingStart = booking['blockStartTime'] 
            ? (booking['blockStartTime'].toDate ? booking['blockStartTime'].toDate() : new Date(booking['blockStartTime']))
            : (booking['startTime'].toDate ? booking['startTime'].toDate() : new Date(booking['startTime']));
          const bookingEnd = booking['blockEndTime']
            ? (booking['blockEndTime'].toDate ? booking['blockEndTime'].toDate() : new Date(booking['blockEndTime']))
            : (booking['endTime'].toDate ? booking['endTime'].toDate() : new Date(booking['endTime']));

          // Check if new booking's buffer time overlaps with existing booking's block time
          return bufferStartTime < bookingEnd && bufferEndTime > bookingStart;
        });

        return overlappingBookings.length === 0; // Return true if no overlapping bookings found
      }),
      catchError((error) => {
        console.error('❌ Error checking room availability:', error);
        // If collection doesn't exist or query fails, assume room is available
        return of(true);
      })
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

  getBookingsForRoomAndDate(roomId: string, date: Date): Observable<Booking[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookingsCollection = collection(this.firestore, this.collectionName);

    // FIXED: Firestore erlaubt nur 1 Range-Filter pro Query ohne Index
    // Verwende nur startTime als Range-Filter und filtere endTime clientseitig
    const bookingsQuery = query(
      bookingsCollection,
      where('roomId', '==', roomId),
      where('startTime', '>=', startOfDay),
      where('startTime', '<=', endOfDay)
    );

    return collectionData(bookingsQuery, { idField: 'id' }).pipe(
      map((bookings: any[]) => {
        // Filter clientseitig: stornierte Buchungen und Datum-Überschneidungen
        const filteredBookings = bookings.filter(booking => {
          // Filter cancelled bookings
          if (booking.status === 'cancelled') {
            return false;
          }
          
          // Convert timestamps to dates
          const bookingStart = booking.startTime instanceof Date 
            ? booking.startTime 
            : booking.startTime.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
          const bookingEnd = booking.endTime instanceof Date 
            ? booking.endTime 
            : booking.endTime.toDate ? booking.endTime.toDate() : new Date(booking.endTime);
          
          // Check if booking overlaps with selected day
          const overlapsWithDay = bookingStart <= endOfDay && bookingEnd >= startOfDay;
          
          return overlapsWithDay;
        });
        
        return filteredBookings;
      })
    ) as Observable<Booking[]>;
  }
}
