import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';

import { RoomService } from '../../../../core/services/room.service';
import { Room } from '../../../../core/models/room.model';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-room-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatListModule,
  ],
  templateUrl: './room-details.component.html',
  styleUrl: './room-details.component.scss',
})
export class RoomDetailsComponent implements OnInit {
  room$!: Observable<Room | null>;
  error: string | null = null;
  isAdmin$: Observable<boolean>;

  constructor(
    private route: ActivatedRoute,
    private roomService: RoomService,
    private authService: AuthService
  ) {
    // Check if user is admin for conditional UI elements
    this.isAdmin$ = this.authService.user$.pipe(
      map((user) => user !== null && this.authService.isAdmin(user))
    );
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
  }

  // Helper method to get appropriate icon for room type
  getRoomTypeIcon(type: Room['type']): string {
    switch (type) {
      case 'meeting':
        return 'groups';
      case 'office':
        return 'business';
      case 'booth':
        return 'meeting_room';
      case 'open_world':
        return 'workspaces';
      default:
        return 'room';
    }
  }

  // Helper method to get readable room type
  getRoomTypeLabel(type: Room['type']): string {
    switch (type) {
      case 'meeting':
        return 'Meeting Room';
      case 'office':
        return 'Office Space';
      case 'booth':
        return 'Booth';
      case 'open_world':
        return 'Open World';
      default:
        return type;
    }
  }

  // Helper method to format price for display
  formatPrice(price: number): string {
    return `${price.toFixed(2)} €`;
  }
}
