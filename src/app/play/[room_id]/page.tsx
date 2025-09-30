"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  Room,
  User,
  Vote,
  VotingSession,
  RoomStats,
  FIBONACCI_VALUES,
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types";
import { formatVoteValue } from "@/utils/roomUtils";

export default function PlayRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.room_id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(true);
  const [votingSession, setVotingSession] = useState<VotingSession | null>(
    null
  );
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [myVote, setMyVote] = useState<number | string | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);

  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  useEffect(() => {
    // Get stored username
    const storedName = localStorage.getItem("userName");
    if (storedName) {
      setUserName(storedName);
    }

    // Initialize socket
    socketRef.current = io(
      process.env.NODE_ENV === "production" ? "" : "http://localhost:3000",
      {
        path: "/api/socket",
      }
    );

    const socket = socketRef.current;

    // Socket event listeners
    const handleRoomJoined = (roomData: Room) => {
      setRoom(roomData);
      setCurrentUser(
        roomData.users.find((u) => u.socketId === socket.id) || null
      );
      setShowJoinForm(false);
      setIsJoining(false);
    };

    const handleUserJoined = (user: User) => {
      if (room) {
        const updatedRoom = { ...room, users: [...room.users, user] };
        setRoom(updatedRoom);
      }
    };

    const handleUserLeft = (userId: string) => {
      if (room) {
        const updatedRoom = {
          ...room,
          users: room.users.filter((u) => u.id !== userId),
        };
        setRoom(updatedRoom);
      }
    };

    socket.on("roomJoined", handleRoomJoined);
    socket.on("userJoined", handleUserJoined);
    socket.on("userLeft", handleUserLeft);

    const handleVotingStarted = (session: VotingSession) => {
      setVotingSession(session);
      setVotes([]);
      setMyVote(null);
      setRoomStats(null);
    };

    const handleVotingEnded = (session: VotingSession, stats: RoomStats) => {
      setVotingSession(session);
      setRoomStats(stats);
    };

    const updateVotes = (prev: Vote[], vote: Vote) => {
      const existing = prev.find((v) => v.userId === vote.userId);
      if (existing) {
        return prev.map((v) => (v.userId === vote.userId ? vote : v));
      }
      return [...prev, vote];
    };

    const handleVoteReceived = (vote: Vote) => {
      setVotes((prev) => updateVotes(prev, vote));
    };

    const updateVote = (prev: Vote[], vote: Vote) => {
      return prev.map((v) => (v.userId === vote.userId ? vote : v));
    };

    const handleVoteChanged = (vote: Vote) => {
      setVotes((prev) => updateVote(prev, vote));
    };

    const handleRoomUpdated = (roomData: Room) => {
      setRoom(roomData);
      if (roomData.currentVotingSession) {
        setVotingSession(roomData.currentVotingSession);
        setVotes(roomData.currentVotingSession.votes);
      }
    };

    socket.on("votingStarted", handleVotingStarted);
    socket.on("votingEnded", handleVotingEnded);
    socket.on("voteReceived", handleVoteReceived);
    socket.on("voteChanged", handleVoteChanged);
    socket.on("roomUpdated", handleRoomUpdated);

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !socketRef.current) return;

    setIsJoining(true);
    socketRef.current.emit("joinRoom", { roomId, userName: userName.trim() });
  };

  const handleStartVoting = () => {
    if (socketRef.current && currentUser?.isHost) {
      socketRef.current.emit("startVoting", roomId);
    }
  };

  const handleEndVoting = () => {
    if (socketRef.current && currentUser?.isHost) {
      socketRef.current.emit("endVoting", roomId);
    }
  };

  const handleVote = (value: number | string) => {
    if (socketRef.current && votingSession?.isActive && value !== null) {
      setMyVote(value);
      socketRef.current.emit("submitVote", { roomId, value: value as number });
    }
  };

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit("leaveRoom", roomId);
    }
    router.push("/");
  };

  const renderVotingArea = () => {
    if (!votingSession) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Chờ bắt đầu vote
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {currentUser?.isHost
              ? 'Nhấn "Bắt đầu vote" để bắt đầu lượt vote mới'
              : "Chờ chủ phòng bắt đầu vote"}
          </p>
        </div>
      );
    }

    if (votingSession.isActive) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Chọn điểm ước lượng (Fibonacci)
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
            {FIBONACCI_VALUES.map((value) => (
              <button
                key={value}
                onClick={() => handleVote(value)}
                className={`p-4 rounded-lg font-bold text-lg transition-all duration-200 ${
                  myVote === value
                    ? "bg-blue-600 text-white shadow-lg transform scale-105"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:scale-105"
                }`}
              >
                {formatVoteValue(value)}
              </button>
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Đã có {votes.length}/{room?.users?.length} người vote
            </p>
            {room?.users?.length && room?.users?.length > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (room?.users?.length
                        ? votes.length / room?.users?.length
                        : 0) * 100
                    }%`,
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Kết quả vote
        </h2>

        {/* Statistics */}
        {roomStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {roomStats.totalVotes}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                Tổng vote
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {roomStats.average}
              </div>
              <div className="text-sm text-green-800 dark:text-green-200">
                Trung bình
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {roomStats.min}
              </div>
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                Thấp nhất
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {roomStats.max}
              </div>
              <div className="text-sm text-red-800 dark:text-red-200">
                Cao nhất
              </div>
            </div>
          </div>
        )}

        {/* Vote Results */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Kết quả từng người:
          </h3>
          {votes.map((vote) => (
            <div
              key={vote.userId}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {vote.userName}
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatVoteValue(vote.value)}
              </span>
            </div>
          ))}
        </div>

        {/* Distribution */}
        {roomStats && Object.keys(roomStats.distribution).length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Phân bố vote:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(roomStats.distribution).map(([value, count]) => (
                <div
                  key={value}
                  className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-600 rounded"
                >
                  <span className="font-medium">{value}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {count} vote{count > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (showJoinForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Tham gia phòng
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Phòng: <span className="font-mono font-bold">{roomId}</span>
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-6">
              <div>
                <label
                  htmlFor="userName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Tên của bạn
                </label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Nhập tên của bạn..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  required
                  maxLength={50}
                />
              </div>

              <button
                type="submit"
                disabled={!userName.trim() || isJoining}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                {isJoining ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang tham gia...
                  </>
                ) : (
                  "Tham gia phòng"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/")}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
              >
                ← Quay lại trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!room || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                🃏 Planning Poker
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Phòng: <span className="font-mono font-bold">{roomId}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              {currentUser.isHost && (
                <div className="flex gap-2">
                  {!votingSession?.isActive ? (
                    <button
                      onClick={handleStartVoting}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Bắt đầu vote
                    </button>
                  ) : (
                    <button
                      onClick={handleEndVoting}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Kết thúc vote
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleLeaveRoom}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Rời phòng
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Thành viên ({room.users.length})
              </h2>
              <div className="space-y-2">
                {room.users.map((user) => {
                  const hasVoted = votes.some(
                    (vote) => vote.userId === user.id
                  );

                  const getCardClassName = () => {
                    if (user.isHost) {
                      return "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800";
                    }
                    if (hasVoted) {
                      return "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800";
                    }
                    return "bg-gray-50 dark:bg-gray-700";
                  };

                  const getAvatarClassName = () => {
                    if (user.isHost) {
                      return "bg-blue-600 text-white";
                    }
                    if (hasVoted) {
                      return "bg-green-600 text-white";
                    }
                    return "bg-gray-400 text-white";
                  };

                  const getTextClassName = () => {
                    if (user.isHost) {
                      return "text-blue-900 dark:text-blue-100";
                    }
                    if (hasVoted) {
                      return "text-green-900 dark:text-green-100";
                    }
                    return "text-gray-900 dark:text-white";
                  };

                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${getCardClassName()}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getAvatarClassName()}`}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`font-medium ${getTextClassName()}`}>
                          {user.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasVoted && votingSession?.isActive && (
                          <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                            ✓ Đã vote
                          </span>
                        )}
                        {user.isHost && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                            Chủ phòng
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Voting Area */}
          <div className="lg:col-span-2">{renderVotingArea()}</div>
        </div>
      </div>
    </div>
  );
}
