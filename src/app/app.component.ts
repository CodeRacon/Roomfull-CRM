import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { RoomService } from './core/services/room.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'roomfull';

  constructor(private roomService: RoomService) {}

  ngOnInit(): void {
    // Seed initial rooms if none exist
    this.roomService.seedInitialRooms().subscribe();
  }
}
