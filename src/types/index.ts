export interface User {
  id: string;
  name: string;
  isHost: boolean;
  socketId: string;
}

export interface Vote {
  userId: string;
  userName: string;
  value: number;
  timestamp: Date;
}

export interface VotingSession {
  id: string;
  isActive: boolean;
  votes: Vote[];
  startedAt: Date;
  endedAt?: Date;
}

export interface Room {
  id: string;
  name: string;
  host: User;
  users: User[];
  currentVotingSession?: VotingSession;
  createdAt: Date;
}

export interface RoomStats {
  totalVotes: number;
  average: number;
  min: number;
  max: number;
  distribution: { [key: number | string]: number };
}

// Fibonacci sequence for planning poker
export const FIBONACCI_VALUES = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, "?"];

// Socket events
export interface ServerToClientEvents {
  roomJoined: (room: Room) => void;
  userJoined: (user: User) => void;
  userLeft: (userId: string) => void;
  votingStarted: (session: VotingSession) => void;
  votingEnded: (session: VotingSession, stats: RoomStats) => void;
  voteReceived: (vote: Vote) => void;
  voteChanged: (vote: Vote) => void;
  roomUpdated: (room: Room) => void;
}

export interface ClientToServerEvents {
  joinRoom: (data: { roomId: string; userName: string }) => void;
  startVoting: (roomId: string) => void;
  endVoting: (roomId: string) => void;
  submitVote: (data: { roomId: string; value: number }) => void;
  changeVote: (data: { roomId: string; value: number }) => void;
  leaveRoom: (roomId: string) => void;
}
