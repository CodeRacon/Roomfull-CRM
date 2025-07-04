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
  
  // NEW: Buffer time fields for hybrid approach
  blockStartTime?: Date;  // Actual blocking start time (optional for backward compatibility)
  blockEndTime?: Date;    // Actual blocking end time (optional for backward compatibility)
  bufferBefore?: number;  // Buffer minutes before booking (optional)
  bufferAfter?: number;   // Buffer minutes after booking (optional)
}
