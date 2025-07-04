export interface Room {
  id?: string;
  name: string;
  type: 'meeting' | 'office' | 'booth' | 'open_world';
  capacity: number;
  description: string;
  minDuration: number; // in minutes
  steps: number; // step size for duration slider in minutes
  pricePerHour: number;
  pricePerDay?: number;
  pricePerWeek?: number;
  discountPercentage?: number;
  discountThresholdMinutes?: number; // minimum duration in minutes to apply discount
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
