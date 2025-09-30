import { Server as NetServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";
import { Socket as NetSocket } from "net";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  Room,
  User,
  Vote,
  VotingSession,
  FIBONACCI_VALUES,
} from "@/types";
import { generateRoomId, calculateRoomStats } from "@/utils/roomUtils";

interface SocketServer extends NetServer {
  io?: SocketIOServer | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// In-memory storage for rooms (in production, use Redis or database)
const rooms = new Map<string, Room>();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
      res.socket.server,
      {
        path: "/api/socket",
        addTrailingSlash: false,
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
      }
    );

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      socket.on("joinRoom", ({ roomId, userName }) => {
        let room = rooms.get(roomId);

        if (!room) {
          // Create new room
          const host: User = {
            id: socket.id,
            name: userName,
            isHost: true,
            socketId: socket.id,
          };

          room = {
            id: roomId,
            name: `Room ${roomId}`,
            host,
            users: [host],
            createdAt: new Date(),
          };

          rooms.set(roomId, room);
        } else {
          // Join existing room
          const existingUser = room.users.find((u) => u.socketId === socket.id);
          if (!existingUser) {
            const newUser: User = {
              id: socket.id,
              name: userName,
              isHost: false,
              socketId: socket.id,
            };
            room.users.push(newUser);
          }
        }

        socket.join(roomId);
        socket.emit("roomJoined", room);
        socket
          .to(roomId)
          .emit(
            "userJoined",
            room.users.find((u) => u.socketId === socket.id)!
          );
        socket.to(roomId).emit("roomUpdated", room);
      });

      socket.on("startVoting", (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const user = room.users.find((u) => u.socketId === socket.id);
        if (!user || !user.isHost) return;

        const newSession: VotingSession = {
          id: generateRoomId(),
          isActive: true,
          votes: [],
          startedAt: new Date(),
        };

        room.currentVotingSession = newSession;
        io.to(roomId).emit("votingStarted", newSession);
        io.to(roomId).emit("roomUpdated", room);
      });

      socket.on("endVoting", (roomId) => {
        const room = rooms.get(roomId);
        if (!room || !room.currentVotingSession) return;

        const user = room.users.find((u) => u.socketId === socket.id);
        if (!user || !user.isHost) return;

        room.currentVotingSession.isActive = false;
        room.currentVotingSession.endedAt = new Date();

        const stats = calculateRoomStats(room.currentVotingSession.votes);
        io.to(roomId).emit("votingEnded", room.currentVotingSession, stats);
        io.to(roomId).emit("roomUpdated", room);
      });

      socket.on("submitVote", ({ roomId, value }) => {
        const room = rooms.get(roomId);
        if (
          !room ||
          !room.currentVotingSession ||
          !room.currentVotingSession.isActive
        )
          return;

        const user = room.users.find((u) => u.socketId === socket.id);
        if (!user) return;

        // Check if value is valid Fibonacci
        if (!FIBONACCI_VALUES.includes(value)) return;

        const existingVoteIndex = room.currentVotingSession.votes.findIndex(
          (v) => v.userId === user.id
        );
        const newVote: Vote = {
          userId: user.id,
          userName: user.name,
          value,
          timestamp: new Date(),
        };

        if (existingVoteIndex >= 0) {
          room.currentVotingSession.votes[existingVoteIndex] = newVote;
          io.to(roomId).emit("voteChanged", newVote);
        } else {
          room.currentVotingSession.votes.push(newVote);
          io.to(roomId).emit("voteReceived", newVote);
        }

        io.to(roomId).emit("roomUpdated", room);
      });

      socket.on("changeVote", ({ roomId, value }) => {
        const room = rooms.get(roomId);
        if (
          !room ||
          !room.currentVotingSession ||
          !room.currentVotingSession.isActive
        )
          return;

        const user = room.users.find((u) => u.socketId === socket.id);
        if (!user) return;

        if (!FIBONACCI_VALUES.includes(value)) return;

        const existingVoteIndex = room.currentVotingSession.votes.findIndex(
          (v) => v.userId === user.id
        );
        if (existingVoteIndex >= 0) {
          const newVote: Vote = {
            userId: user.id,
            userName: user.name,
            value,
            timestamp: new Date(),
          };
          room.currentVotingSession.votes[existingVoteIndex] = newVote;
          io.to(roomId).emit("voteChanged", newVote);
          io.to(roomId).emit("roomUpdated", room);
        }
      });

      socket.on("leaveRoom", (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const userIndex = room.users.findIndex((u) => u.socketId === socket.id);
        if (userIndex >= 0) {
          const user = room.users[userIndex];
          room.users.splice(userIndex, 1);

          // If host leaves, assign new host or delete room
          if (user.isHost) {
            if (room.users.length > 0) {
              room.users[0].isHost = true;
              room.host = room.users[0];
            } else {
              rooms.delete(roomId);
            }
          }

          socket.leave(roomId);
          socket.to(roomId).emit("userLeft", user.id);
          if (rooms.has(roomId)) {
            socket.to(roomId).emit("roomUpdated", room);
          }
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        // Find and remove user from all rooms
        for (const [roomId, room] of rooms.entries()) {
          const userIndex = room.users.findIndex(
            (u) => u.socketId === socket.id
          );
          if (userIndex >= 0) {
            const user = room.users[userIndex];
            room.users.splice(userIndex, 1);

            if (user.isHost) {
              if (room.users.length > 0) {
                room.users[0].isHost = true;
                room.host = room.users[0];
              } else {
                rooms.delete(roomId);
              }
            }

            socket.to(roomId).emit("userLeft", user.id);
            if (rooms.has(roomId)) {
              socket.to(roomId).emit("roomUpdated", room);
            }
          }
        }
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}
