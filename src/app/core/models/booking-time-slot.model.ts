/**
 * Represents a booking time slot with separate user and block times
 * for implementing buffer time between bookings
 */
export interface BookingTimeSlot {
  // What the user sees and books
  userStartTime: Date;
  userEndTime: Date;
  
  // Actual blocking time (includes buffer)
  blockStartTime: Date;
  blockEndTime: Date;
  
  // Metadata
  bufferBefore: number;  // Minutes
  bufferAfter: number;   // Minutes
  
  // Optional fields
  roomType?: string;
  bookingId?: string;
}

/**
 * Represents a time range on the timeline
 */
export interface TimeRange {
  startMinutes: number;
  endMinutes: number;
  type: 'user' | 'buffer' | 'block';
}

/**
 * Enhanced booking availability status
 */
export interface BookingAvailability {
  status: 'available' | 'conflict' | 'blocked';
  conflictRanges: TimeRange[];
  availabilityScore: number;
  canConfirm: boolean;
  
  // New fields for buffer time handling
  bufferConflicts?: TimeRange[];
  allowedBufferOverlaps?: TimeRange[];
}

/**
 * Configuration for buffer time strategies
 */
export interface BufferTimeConfig {
  strategy: 'none' | 'symmetric' | 'asymmetric' | 'room-specific';
  
  // For symmetric strategy
  bufferMinutes?: number;
  
  // For asymmetric strategy
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  
  // For room-specific strategy
  roomTypeBuffers?: {
    [roomType: string]: {
      before: number;
      after: number;
    };
  };
  
  // Whether to allow buffer overlaps for adjacent bookings
  allowBufferOverlaps?: boolean;
}
