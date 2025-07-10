export interface PendingReservation {
  id?: string;
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  price: number;
  notes?: string;
  roomName?: string; 
  userName?: string; 
  createdAt: Date;
  expiresAt: Date; 
  
  blockStartTime?: Date;  
  blockEndTime?: Date;    
  bufferBefore?: number;  
  bufferAfter?: number;   
}
