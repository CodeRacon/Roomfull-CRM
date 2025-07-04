// Room seeding trigger for Angular Fire v18
// Usage: ng serve -> localhost:4200 -> F12 Console -> Paste & Enter

function triggerSeedRooms() {
  if (typeof ng === 'undefined') {
    console.log('Angular DevTools not available. Please run this in development mode.');
    return false;
  }

  // Known components that use RoomService
  const componentSelectors = [
    'app-root',
    'app-room-list', 
    'app-room-details',
    'app-room-booking'
  ];

  for (const selector of componentSelectors) {
    const element = document.querySelector(selector);
    if (!element) continue;

    try {
      const component = ng.getComponent(element);
      if (!component || !component.roomService) continue;

      const roomService = component.roomService;
      if (typeof roomService.seedInitialRooms === 'function') {
        console.log('Seeding rooms...');
        
        roomService.seedInitialRooms().subscribe({
          next: () => {
            console.log('Rooms seeded successfully');
            console.log('Discount configurations:');
            console.log('- Drake\'s Fortune: 20% discount after 3 hours');
            console.log('- Monteriggioni: 15% discount after 4 hours');
            console.log('- Animus: 10% discount after 8 hours');
          },
          error: (error) => console.error('Error seeding rooms:', error)
        });
        
        return true;
      }
    } catch (error) {
      continue;
    }
  }

  console.log('No suitable component found. Alternative approaches:');
  console.log('1. Add temporary button to component template:');
  console.log('   <button (click)="roomService.seedInitialRooms().subscribe()">Seed Rooms</button>');
  console.log('2. Navigate to /rooms to trigger auto-seeding');
  return false;
}

triggerSeedRooms();
