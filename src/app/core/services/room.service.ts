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
  writeBatch,
  DocumentReference,
} from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, take } from 'rxjs';
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
    return docData(roomDoc, { idField: 'id' }) as Observable<Room | null>;
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

  seedInitialRooms(): Observable<void> {
    return this.getRooms().pipe(
      take(1),
      switchMap((rooms) => {
        // Only seed if no rooms exist
        if (rooms.length === 0) {
          const batch = writeBatch(this.firestore);

          // Sample rooms based on requirements with creative game-inspired names
          const sampleRooms: Room[] = [
            {
              name: 'Croft Manor',
              type: 'meeting',
              capacity: 16,
              description: 'Unser größter Meetingraum im Stil eines englischen Herrenhauses. Ausgestattet mit modernster Präsentationstechnik, Beamer, Whiteboard und Videokonferenz-System. Ideal für Team-Meetings und wichtige Präsentationen.',
              minDuration: 60, // 1 hour minimum
              pricePerHour: 30,
              pricePerDay: 200,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: 30, // FIXED: 30-minute steps for meetings
              bracketSteps: 15 // 15-minute steps for bracket snapping
            },
            {
              name: "Drake's Fortune",
              type: 'meeting',
              capacity: 8,
              description: 'Kompakter Meetingraum im Abenteuerstil mit Weltkarten an den Wänden. Ausgestattet mit Whiteboard und großem Bildschirm. Perfekt für Brainstorming-Sessions und die Planung eurer nächsten großen Projekte.',
              minDuration: 30, // 30 minutes minimum
              pricePerHour: 20,
              pricePerDay: 140,
              discountPercentage: 20,
              discountThresholdMinutes: 180, // 3 hours
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: 30, // FIXED: 30-minute steps for meetings
              bracketSteps: 15 // 15-minute steps for bracket snapping
            },
            {
              name: 'Monteriggioni',
              type: 'office',
              capacity: 10,
              description: 'Büroraum im italienischen Renaissance-Stil mit 10 Arbeitsplätzen. Bietet eine inspirierende Atmosphäre mit schnellem WLAN, Druckernutzung und Klimaanlage. Ideal für Teams, die längere Zeit zusammenarbeiten möchten.',
              minDuration: 120, // 2 hours minimum
              pricePerHour: 40,
              pricePerDay: 250,
              pricePerWeek: 1000,
              discountPercentage: 15,
              discountThresholdMinutes: 240, // 4 hours
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: 60, // FIXED: 60-minute steps for offices
              bracketSteps: 15 // 15-minute steps for bracket snapping
            },
            {
              name: 'Jackson',
              type: 'office',
              capacity: 10,
              description: 'Gemütlicher Büroraum im rustikalen Stil mit 10 Arbeitsplätzen. Die warme Holzatmosphäre schafft ein produktives Umfeld mit allen notwendigen Annehmlichkeiten für konzentriertes Arbeiten.',
              minDuration: 120, // 2 hours minimum
              pricePerHour: 40,
              pricePerDay: 220,
              pricePerWeek: 900,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: 60, // FIXED: 60-minute steps for offices
              bracketSteps: 15 // 15-minute steps for bracket snapping
            },
            {
              name: "Ellie's Hideout",
              type: 'booth',
              capacity: 3,
              description: 'Kleine, gemütliche Kabine für bis zu 3 Personen. Der perfekte Rückzugsort für vertrauliche Gespräche, Interviews oder wenn ihr einfach eure Ruhe braucht.',
              minDuration: 60, // 60 minutes minimum
              pricePerHour: 25,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: 15, // FIXED: 15-minute steps for booths
              bracketSteps: 15 // 15-minute steps for bracket snapping
            },
            {
              name: "Joel's Workshop",
              type: 'booth',
              capacity: 3,
              description: 'Kreative Kabine mit Werkstatt-Charme für bis zu 3 Personen. Ideal für Projektbesprechungen oder wenn ihr an detaillierten Konzepten arbeiten wollt.',
              minDuration: 60, // 60 minutes minimum
              pricePerHour: 25,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: 15, // FIXED: 15-minute steps for booths
              bracketSteps: 15 // 15-minute steps for bracket snapping
            },
            {
              name: 'Animus',
              type: 'open_world',
              capacity: 30,
              description: 'Unser weitläufiger Open-Space-Bereich mit flexiblen Arbeitsplätzen. Die futuristische Gestaltung mit historischen Elementen schafft eine einzigartige Atmosphäre für kreatives Arbeiten. Mit Lounge-Bereich, Kaffeebar und verschiedenen Arbeitszonen.',
              minDuration: 60, // 1 hour minimum
              pricePerHour: 10,
              pricePerDay: 60,
              discountPercentage: 10,
              discountThresholdMinutes: 480, // 8 hours
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              steps: 30, // FIXED: 30-minute steps for open_world
              bracketSteps: 15 // 15-minute steps for bracket snapping
            },
          ];

          // Add each room to the batch
          sampleRooms.forEach((room) => {
            const roomRef = doc(
              collection(this.firestore, this.collectionName)
            );
            batch.set(roomRef, room);
          });

          // Commit the batch
          return from(batch.commit());
        }

        return of(undefined);
      })
    );
  }
}
