export interface Room {
  id?: string;
  name: string;
  type: 'meeting' | 'office' | 'booth' | 'open_world';
  capacity: number;
  description: string;
  minDuration: number; // in minutes
  pricePerHour: number;
  pricePerDay?: number;
  pricePerWeek?: number;
  discountPercentage?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
