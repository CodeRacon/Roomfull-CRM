import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from, map, switchMap, of, combineLatest, catchError, timer } from 'rxjs';
import { PendingReservation } from '../models/pending-reservation.model';
import { AuthService } from './auth.service';
import { RoomService } from './room.service';

@Injectable({
  providedIn: 'root',
})
export class PendingReservationService {
  private readonly collectionName = 'pendingReservations';
  private readonly reservationDurationMinutes = 3; // 3 minutes TTL

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private roomService: RoomService
  ) {
    // Start automatic cleanup timer
    this.startAutomaticCleanup();
  }

  // Get buffer times for room type - same logic as booking service
  private getBufferTimes(roomType: string): { before: number; after: number } {
    const bufferConfig = {
      'meeting': { before: 0, after: 15 },
      'office': { before: 0, after: 15 },
      'booth': { before: 0, after: 15 },
      'open_world': { before: 0, after: 0 }
    };
    
    return bufferConfig[roomType as keyof typeof bufferConfig] || { before: 0, after: 0 };
  }

  // Create a new pending reservation
  createPendingReservation(reservationData: {
    roomId: string;
    startTime: Date;
    endTime: Date;
    notes?: string;
    roomType?: string;
  }): Observable<string> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          throw new Error('User must be logged in to create a reservation');
        }

        // Get room details to calculate price and validate availability
        return this.roomService.getRoomById(reservationData.roomId).pipe(
          switchMap((room) => {
            if (!room) {
              throw new Error('Room not found');
            }

            if (!room.isActive) {
              throw new Error('This room is not available for booking');
            }

            // Calculate duration in hours
            const durationMs = reservationData.endTime.getTime() - reservationData.startTime.getTime();
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
            const blockStartTime = new Date(reservationData.startTime.getTime() - (bufferTimes.before * 60000));
            const blockEndTime = new Date(reservationData.endTime.getTime() + (bufferTimes.after * 60000));

            // Calculate expiration time (3 minutes from now)
            const expiresAt = new Date(Date.now() + (this.reservationDurationMinutes * 60000));

            // Create pending reservation object
            const pendingReservation: Omit<PendingReservation, 'id'> = {
              roomId: room.id!,
              userId: user.uid,
              startTime: reservationData.startTime,
              endTime: reservationData.endTime,
              price: price,
              notes: reservationData.notes || '',
              roomName: room.name,
              userName: user.displayName || user.email,
              createdAt: new Date(),
              expiresAt: expiresAt,
              // Buffer time fields
              blockStartTime,
              blockEndTime,
              bufferBefore: bufferTimes.before,
              bufferAfter: bufferTimes.after,
            };

            // Add to Firestore
            const reservationsCollection = collection(this.firestore, this.collectionName);
            return from(addDoc(reservationsCollection, pendingReservation));
          })
        );
      }),
      map((docRef) => docRef.id)
    );
  }

  // Get all pending reservations for a room and date
  getPendingReservationsForRoomAndDate(roomId: string, date: Date): Observable<PendingReservation[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservationsCollection = collection(this.firestore, this.collectionName);
    const reservationsQuery = query(
      reservationsCollection,
      where('roomId', '==', roomId),
      where('startTime', '>=', startOfDay),
      where('startTime', '<=', endOfDay),
      orderBy('startTime')
    );

    return collectionData(reservationsQuery, { idField: 'id' }).pipe(
      map((reservations: any[]) => {
        // Filter out expired reservations
        const now = new Date();
        const activeReservations = reservations.filter(reservation => {
          const expiresAt = reservation.expiresAt instanceof Date 
            ? reservation.expiresAt 
            : reservation.expiresAt.toDate ? reservation.expiresAt.toDate() : new Date(reservation.expiresAt);
          
          return expiresAt > now;
        });
        
        return activeReservations;
      })
    ) as Observable<PendingReservation[]>;
  }

  // Get all pending reservations for the current user
  getUserPendingReservations(): Observable<PendingReservation[]> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          return of([]);
        }

        const reservationsCollection = collection(this.firestore, this.collectionName);
        const userReservationsQuery = query(
          reservationsCollection,
          where('userId', '==', user.uid),
          orderBy('startTime', 'desc')
        );

        return collectionData(userReservationsQuery, { idField: 'id' });
      }),
      map((reservations: any[]) => {
        // Filter out expired reservations
        const now = new Date();
        const activeReservations = reservations.filter(reservation => {
          const expiresAt = reservation.expiresAt instanceof Date 
            ? reservation.expiresAt 
            : reservation.expiresAt.toDate ? reservation.expiresAt.toDate() : new Date(reservation.expiresAt);
          
          return expiresAt > now;
        });
        
        return activeReservations;
      })
    ) as Observable<PendingReservation[]>;
  }

  // Delete a pending reservation
  deletePendingReservation(id: string): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user) {
          throw new Error('User must be logged in to delete a reservation');
        }

        const reservationDoc = doc(this.firestore, `${this.collectionName}/${id}`);
        return from(deleteDoc(reservationDoc));
      })
    );
  }

  // Check if a time slot conflicts with pending reservations
  checkPendingReservationConflicts(
    roomId: string,
    startTime: Date,
    endTime: Date,
    roomType?: string,
    excludeUserId?: string
  ): Observable<boolean> {
    const reservationsCollection = collection(this.firestore, this.collectionName);
    
    // Query for any pending reservations for this room
    const roomReservationsQuery = query(
      reservationsCollection,
      where('roomId', '==', roomId)
    );

    return collectionData(roomReservationsQuery).pipe(
      map((reservations) => {
        // Calculate buffer times if roomType is provided
        const bufferTimes = roomType ? this.getBufferTimes(roomType) : { before: 0, after: 0 };
        const bufferStartTime = new Date(startTime.getTime() - (bufferTimes.before * 60000));
        const bufferEndTime = new Date(endTime.getTime() + (bufferTimes.after * 60000));

        // Filter overlapping and active reservations
        const now = new Date();
        const conflictingReservations = reservations.filter((reservation) => {
          // Skip expired reservations
          const expiresAt = reservation['expiresAt'] instanceof Date 
            ? reservation['expiresAt'] 
            : reservation['expiresAt'].toDate ? reservation['expiresAt'].toDate() : new Date(reservation['expiresAt']);
          
          if (expiresAt <= now) {
            return false;
          }

          // Skip reservations from the same user (if excludeUserId is provided)
          if (excludeUserId && reservation['userId'] === excludeUserId) {
            return false;
          }

          // Use block times if available, otherwise fall back to user times
          const reservationStart = reservation['blockStartTime'] 
            ? (reservation['blockStartTime'].toDate ? reservation['blockStartTime'].toDate() : new Date(reservation['blockStartTime']))
            : (reservation['startTime'].toDate ? reservation['startTime'].toDate() : new Date(reservation['startTime']));
          const reservationEnd = reservation['blockEndTime']
            ? (reservation['blockEndTime'].toDate ? reservation['blockEndTime'].toDate() : new Date(reservation['blockEndTime']))
            : (reservation['endTime'].toDate ? reservation['endTime'].toDate() : new Date(reservation['endTime']));

          // Check if new reservation's buffer time overlaps with existing reservation's block time
          return bufferStartTime < reservationEnd && bufferEndTime > reservationStart;
        });

        return conflictingReservations.length > 0; // Return true if conflicts found
      }),
      catchError((error) => {
        console.error('❌ Error checking pending reservation conflicts:', error);
        // If collection doesn't exist or query fails, assume no conflicts
        return of(false);
      })
    );
  }

  // Automatic cleanup of expired reservations
  private startAutomaticCleanup(): void {
    // Run cleanup every minute
    timer(0, 60000).subscribe(() => {
      this.cleanupExpiredReservations().subscribe({
        next: (cleanedCount) => {
          if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired pending reservations`);
          }
        },
        error: (error) => {
          console.error('❌ Error during automatic cleanup:', error);
        }
      });
    });
  }

  // Clean up expired reservations
  private cleanupExpiredReservations(): Observable<number> {
    const reservationsCollection = collection(this.firestore, this.collectionName);
    
    return collectionData(reservationsCollection, { idField: 'id' }).pipe(
      switchMap((reservations: any[]) => {
        const now = new Date();
        const expiredReservations = reservations.filter(reservation => {
          const expiresAt = reservation.expiresAt instanceof Date 
            ? reservation.expiresAt 
            : reservation.expiresAt.toDate ? reservation.expiresAt.toDate() : new Date(reservation.expiresAt);
          
          return expiresAt <= now;
        });

        if (expiredReservations.length === 0) {
          return of(0);
        }

        // Delete expired reservations
        const deletePromises = expiredReservations.map(reservation => {
          const docRef = doc(this.firestore, `${this.collectionName}/${reservation.id}`);
          return deleteDoc(docRef);
        });

        return from(Promise.all(deletePromises)).pipe(
          map(() => expiredReservations.length)
        );
      }),
      catchError((error) => {
        console.error('❌ Error cleaning up expired reservations:', error);
        return of(0);
      })
    );
  }
}
