"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomId } from "@/utils/roomUtils";

export default function Home() {
  const [userName, setUserName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setIsCreating(true);
    const roomId = generateRoomId();

    // Store user name in localStorage for the room
    localStorage.setItem("userName", userName.trim());

    // Navigate to the room
    router.push(`/play/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🃏 Planning Poker
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Tạo phòng mới và bắt đầu ước lượng story points
            </p>
          </div>

          <form onSubmit={handleCreateRoom} className="space-y-6">
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
              disabled={!userName.trim() || isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isCreating ? (
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
                  Đang tạo phòng...
                </>
              ) : (
                "Tạo phòng mới"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Bạn sẽ trở thành chủ phòng và có thể bắt đầu/kết thúc các lượt
              vote
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Chia sẻ link phòng để mọi người cùng tham gia
          </p>
        </div>
      </div>
    </div>
  );
}
