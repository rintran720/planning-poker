import { Vote, RoomStats, FIBONACCI_VALUES } from "@/types";

export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function calculateRoomStats(votes: Vote[]): RoomStats {
  if (votes.length === 0) {
    return {
      totalVotes: 0,
      average: 0,
      min: 0,
      max: 0,
      distribution: {},
    };
  }

  const numericVotes = votes
    .map((vote) => vote.value)
    .filter((value) => typeof value === "number") as number[];

  if (numericVotes.length === 0) {
    return {
      totalVotes: votes.length,
      average: 0,
      min: 0,
      max: 0,
      distribution: { "?": votes.length },
    };
  }

  const sum = numericVotes.reduce((acc, value) => acc + value, 0);
  const average = sum / numericVotes.length;
  const min = Math.min(...numericVotes);
  const max = Math.max(...numericVotes);

  const distribution: { [key: number | string]: number } = {};
  votes.forEach((vote) => {
    const key = typeof vote.value === "number" ? vote.value : "?";
    distribution[key] = (distribution[key] || 0) + 1;
  });

  return {
    totalVotes: votes.length,
    average: Math.round(average * 100) / 100,
    min,
    max,
    distribution,
  };
}

export function isFibonacciValue(value: number | string): boolean {
  return FIBONACCI_VALUES.includes(value);
}

export function formatVoteValue(value: number | string): string {
  return value === "?" ? "?" : value.toString();
}
