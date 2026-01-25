export interface Participant {
  id: string;
  name: string;
  isPresenter: boolean;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

export interface RoomState {
  roomId: string | null;
  participantId: string | null;
  participants: Participant[];
  hasPresenter: boolean;
  isConnected: boolean;
  isStreamReady: boolean;
}

export type MessageType = 
  | 'join'
  | 'joined'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'participant-joined'
  | 'participant-left'
  | 'stream-available'
  | 'stream-not-ready'
  | 'stream-ended'
  | 'stream-connected'
  | 'waiting-for-stream'
  | 'connection-failed'
  | 'chat'
  | 'hand-raised'
  | 'raise-hand'
  | 'request-stream'
  | 'error';

export interface WSMessage {
  type: MessageType;
  roomId?: string;
  name?: string;
  isPresenter?: boolean;
  participantId?: string;
  participants?: Participant[];
  hasPresenter?: boolean;
  payload?: unknown;
  message?: string;
}

// Auth types
export type UserRole = 'admin' | 'presenter' | 'student';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AdminStats {
  pendingCount: number;
  approvedCount: number;
  presenterCount: number;
  studentCount: number;
}

// Batch types
export interface Batch {
  id: string;
  name: string;
  description: string;
  presenterId: string;
  presenterName?: string;
  studentCount: number;
  createdAt: string;
}

export interface BatchDetail extends Batch {
  students: User[];
}

// Schedule types
export type ClassStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface ScheduledClass {
  id: string;
  title: string;
  description: string;
  batchId: string;
  batchName?: string;
  presenterId: string;
  presenterName?: string;
  startTime: string;
  endTime: string;
  status: ClassStatus;
  roomId?: string;
  canJoin: boolean;
}

// Recording types
export type RecordingStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface Recording {
  id: string;
  scheduleId: string;
  batchId: string;
  batchName?: string;
  presenterId: string;
  presenterName?: string;
  title: string;
  description: string;
  fileSize: number;
  duration: number;
  status: RecordingStatus;
  recordedAt: string;
  streamUrl?: string;
}

// Note types
export type NoteType = 'pdf' | 'document' | 'image' | 'other';

export interface Note {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: NoteType;
  mimeType: string;
  batchId: string;
  batchName: string;
  uploaderId: string;
  uploaderName: string;
  uploaderRole: string;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
}
