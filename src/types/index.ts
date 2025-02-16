// Add to existing types
export interface User {
  // ... existing fields
  pushToken?: string;
  pushTokenUpdatedAt?: Date;
}

export interface Notification {
  id: string;
  type: 'chat' | 'event' | 'candidacy';
  title: string;
  body: string;
  senderId: string;
  receiverId: string;
  seen: boolean;
  data?: Record<string, string>;
  createdAt: Date;
  chatId?: string;
  eventId?: string;
  candidacyId?: string;
}