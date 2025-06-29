// Automatisches Zurücksetzen der rooms Collection mit originalen Room-Daten
// Führe dies im Browser-Console aus, wenn du in Firebase Console eingeloggt bist

console.log('🗑️ Starting rooms collection reset with original room data...');

// ORIGINAL Room Data aus room.service.ts mit korrigierten steps
const originalRooms = [
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
    steps: 30 // 30-minute steps for meetings
  },
  {
    name: "Drake's Fortune",
    type: 'meeting',
    capacity: 8,
    description: 'Kompakter Meetingraum im Abenteuerstil mit Weltkarten an den Wänden. Ausgestattet mit Whiteboard und großem Bildschirm. Perfekt für Brainstorming-Sessions und die Planung eurer nächsten großen Projekte.',
    minDuration: 30, // 30 minutes minimum
    pricePerHour: 20,
    pricePerDay: 140,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: 30 // 30-minute steps for meetings
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
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: 60 // 60-minute steps for offices
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
    steps: 60 // 60-minute steps for offices
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
    steps: 15 // 15-minute steps for booths
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
    steps: 15 // 15-minute steps for booths
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
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: 30 // 30-minute steps for open_world
  }
];

// Automatische Firestore-Integration (funktioniert nur wenn Firebase SDK verfügbar ist)
async function createRoomsInFirestore() {
  try {
    // Prüfe ob Firebase verfügbar ist
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase not available in this context');
    }

    const db = firebase.firestore();
    const batch = db.batch();

    console.log('🔥 Creating rooms in Firestore...');

    // Lösche erst alte rooms Collection
    const roomsSnapshot = await db.collection('rooms').get();
    console.log(`🗑️ Deleting ${roomsSnapshot.size} existing rooms...`);
    
    roomsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Erstelle neue rooms
    originalRooms.forEach(room => {
      const roomRef = db.collection('rooms').doc();
      batch.set(roomRef, room);
    });

    // Commit batch
    await batch.commit();
    console.log('✅ Successfully created all rooms in Firestore!');
    console.log('🎮 Room types with their step intervals:');
    console.log('📅 Meeting rooms: 30min steps');
    console.log('🏢 Office rooms: 60min steps');  
    console.log('📞 Booth rooms: 15min steps');
    console.log('🌍 Open world: 30min steps');
    
  } catch (error) {
    console.error('❌ Error creating rooms:', error);
    console.log('📋 Manual mode: Copy and paste these room objects into Firestore manually:');
    console.log(JSON.stringify(originalRooms, null, 2));
  }
}

// Führe automatische Erstellung aus
createRoomsInFirestore();
