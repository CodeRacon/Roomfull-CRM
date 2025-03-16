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
} from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap } from 'rxjs';
import { Room } from '../models/room.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly collectionName = 'rooms';

  constructor(private firestore: Firestore, private authService: AuthService) {}

  // Get all rooms with optional filtering
  getRooms(options?: {
    type?: Room['type'];
    minCapacity?: number;
    maxCapacity?: number;
    onlyActive?: boolean;
  }): Observable<Room[]> {
    const roomsCollection = collection(this.firestore, this.collectionName);

    // Build query based on options
    let roomsQuery = query(roomsCollection);

    if (options) {
      if (options.type) {
        roomsQuery = query(roomsQuery, where('type', '==', options.type));
      }

      if (options.minCapacity) {
        roomsQuery = query(
          roomsQuery,
          where('capacity', '>=', options.minCapacity)
        );
      }

      if (options.maxCapacity) {
        roomsQuery = query(
          roomsQuery,
          where('capacity', '<=', options.maxCapacity)
        );
      }

      if (options.onlyActive) {
        roomsQuery = query(roomsQuery, where('isActive', '==', true));
      }
    }

    // Add default ordering
    roomsQuery = query(roomsQuery, orderBy('name'));

    return collectionData(roomsQuery, { idField: 'id' }) as Observable<Room[]>;
  }

  // Get a single room by ID
  getRoomById(id: string): Observable<Room | null> {
    const roomDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(roomDoc, { idField: 'id' }) as Observable<Room>;
  }

  // Create a new room (admin only)
  createRoom(
    room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>
  ): Observable<string> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user || !this.authService.isAdmin(user)) {
          throw new Error('Permission denied: Only admins can create rooms');
        }

        const roomData: Omit<Room, 'id'> = {
          ...room,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const roomsCollection = collection(this.firestore, this.collectionName);
        return from(addDoc(roomsCollection, roomData));
      }),
      map((docRef) => docRef.id)
    );
  }

  // Update an existing room (admin only)
  updateRoom(id: string, data: Partial<Room>): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user || !this.authService.isAdmin(user)) {
          throw new Error('Permission denied: Only admins can update rooms');
        }

        const roomDoc = doc(this.firestore, `${this.collectionName}/${id}`);
        const updateData = {
          ...data,
          updatedAt: new Date(),
        };

        return from(updateDoc(roomDoc, updateData));
      })
    );
  }

  // Delete a room (admin only)
  deleteRoom(id: string): Observable<void> {
    return this.authService.user$.pipe(
      switchMap((user) => {
        if (!user || !this.authService.isAdmin(user)) {
          throw new Error('Permission denied: Only admins can delete rooms');
        }

        const roomDoc = doc(this.firestore, `${this.collectionName}/${id}`);
        return from(deleteDoc(roomDoc));
      })
    );
  }

  // Check if a room is available for a specific time period
  checkRoomAvailability(
    roomId: string,
    startTime: Date,
    endTime: Date
  ): Observable<boolean> {
    // This is a placeholder - in a real implementation, you would:
    // 1. Query the bookings collection
    // 2. Check if there are any bookings for this room that overlap with the requested time period
    // 3. Return true if available, false if not

    // For now, we'll just return true as a placeholder
    return of(true);
  }

  // Get rooms by type
  getRoomsByType(type: Room['type']): Observable<Room[]> {
    return this.getRooms({ type, onlyActive: true });
  }

  // Get featured rooms (e.g., for homepage)
  getFeaturedRooms(count: number = 4): Observable<Room[]> {
    const roomsCollection = collection(this.firestore, this.collectionName);
    const featuredQuery = query(
      roomsCollection,
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(count)
    );

    return collectionData(featuredQuery, { idField: 'id' }) as Observable<
      Room[]
    >;
  }
}
