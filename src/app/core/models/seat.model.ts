export interface Seat {
  id?: string;
  roomId: string;
  name: string;
  positionX: number;
  positionY: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
