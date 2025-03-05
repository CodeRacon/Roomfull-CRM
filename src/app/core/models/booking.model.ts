export interface Booking {
  id?: string;
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  price: number;
  notes?: string;
  roomName?: string; // denormalized field for faster rendering
  userName?: string; // denormalized field for faster rendering
  createdAt: Date;
  updatedAt: Date;
}
