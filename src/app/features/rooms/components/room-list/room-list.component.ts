import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

import { RoomService } from '../../../../core/services/room.service';
import { Room } from '../../../../core/models/room.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
  ],
  templateUrl: './room-list.component.html',
  styleUrl: './room-list.component.scss',
})
export class RoomListComponent implements OnInit {
  rooms$!: Observable<Room[]>;
  selectedType: Room['type'] | 'all' = 'all';
  minCapacity: number | null = null;

  roomTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'meeting', label: 'Meeting Rooms' },
    { value: 'office', label: 'Office Spaces' },
    { value: 'booth', label: 'Booths' },
    { value: 'open_world', label: 'Open World' },
  ];

  constructor(private roomService: RoomService) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    const options: any = { onlyActive: true };

    if (this.selectedType !== 'all') {
      options.type = this.selectedType;
    }

    if (this.minCapacity) {
      options.minCapacity = this.minCapacity;
    }

    this.rooms$ = this.roomService.getRooms(options);
  }

  onFilterChange(): void {
    this.loadRooms();
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

  // Helper method to format price for display
  formatPrice(price: number): string {
    return `${price.toFixed(2)} €`;
  }
}
