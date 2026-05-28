/**
 * GoalSwap Arena — Socket.io Client
 *
 * Manages WebSocket connections to the oracle service.
 * Emits typed events for match updates, goals, fee changes, etc.
 */

import { io, Socket } from "socket.io-client";

export interface WsMatchUpdate {
  matchId: string;
  sport?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: string;
  feeTier: number;
  feeReason: string;
}

export interface WsGoalScored {
  matchId: string;
  sport?: string;
  team: string;
  scorer: string;
  minute: number;
  homeScore: number;
  awayScore: number;
  newFee: number;
  priceImpact: string;
}

export interface WsFeeChanged {
  matchId: string;
  oldFee: number;
  newFee: number;
  reason: string;
}

export interface WsMatchSettled {
  matchId: string;
  sport?: string;
  winner: string;
  homeScore: number;
  awayScore: number;
  settlementTxHash: string;
}

export interface WsMatchCreated {
  matchId: string;
  sport?: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
}

export interface WsAnnouncement {
  message: string;
  timestamp: string;
}

export type MatchEventCallback = {
  "match:update": (data: WsMatchUpdate) => void;
  "goal:scored": (data: WsGoalScored) => void;
  "fee:changed": (data: WsFeeChanged) => void;
  "match:settled": (data: WsMatchSettled) => void;
  "match:created": (data: WsMatchCreated) => void;
  announcement: (data: WsAnnouncement) => void;
  subscribed: (data: { matchId?: string; feed?: string }) => void;
  unsubscribed: (data: { matchId?: string; feed?: string }) => void;
  error: (data: { message: string }) => void;
};

class SocketManager {
  private socket: Socket | null = null;
  private wsUrl: string;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private intentionalDisconnect = false;

  constructor() {
    this.wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8081";
  }

  /**
   * Connect to the WebSocket server.
   */
  connect(): void {
    if (this.socket?.connected) return;

    this.intentionalDisconnect = false;

    this.socket = io(this.wsUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
    });

    this.socket.on("connect", () => {
      console.log("[Socket] Connected:", this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    this.socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
      this.reconnectAttempts++;
    });

    // Re-attach all registered listeners on reconnect
    this.socket.on("connect", () => {
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((cb) => {
          this.socket?.on(event, cb as (...args: unknown[]) => void);
        });
      });
    });
  }

  /**
   * Disconnect from the WebSocket server.
   */
  disconnect(): void {
    this.intentionalDisconnect = true;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  /**
   * Subscribe to a match room.
   */
  subscribeMatch(matchId: string): void {
    this.socket?.emit("subscribe:match", matchId);
  }

  /**
   * Unsubscribe from a match room.
   */
  unsubscribeMatch(matchId: string): void {
    this.socket?.emit("unsubscribe:match", matchId);
  }

  /**
   * Subscribe to global live feed.
   */
  subscribeLive(): void {
    this.socket?.emit("subscribe:live");
  }

  /**
   * Unsubscribe from global live feed.
   */
  unsubscribeLive(): void {
    this.socket?.emit("unsubscribe:live");
  }

  /**
   * Register an event listener.
   */
  on<E extends keyof MatchEventCallback>(
    event: E,
    callback: MatchEventCallback[E],
  ): () => void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(callback as (...args: unknown[]) => void);

    if (this.socket) {
      this.socket.on(event as string, callback as (...args: unknown[]) => void);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(event as string)?.delete(callback as (...args: unknown[]) => void);
      this.socket?.off(event as string, callback as (...args: unknown[]) => void);
    };
  }

  /**
   * Check if connected.
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the socket ID.
   */
  get id(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
export const socketManager = new SocketManager();
