/**
 * GoalSwap Oracle — WebSocket Server
 *
 * Socket.io server on port 8080 with per-match rooms.
 *
 * Events emitted:
 *  - match:update    → { matchId, homeTeam, awayTeam, homeScore, awayScore, minute, status, feeTier, feeReason }
 *  - goal:scored     → { matchId, team, scorer, minute, homeScore, awayScore, newFee, priceImpact }
 *  - match:settled   → { matchId, winner, settlementTxHash }
 *  - fee:changed     → { matchId, oldFee, newFee, reason }
 *  - match:created   → { matchId, homeTeam, awayTeam, startTime }
 *
 * Heartbeat: ping every 30s, disconnect clients not responding after 90s.
 * Rate limiting: max 10 connections per IP.
 */

import { Server as SocketServer, type Socket } from "socket.io";
import { createServer, type Server as HttpServer } from "http";
import { config } from "./config.js";
import type {
  WsMatchUpdate,
  WsGoalScored,
  WsMatchSettled,
  WsFeeChanged,
  MatchState,
  MatchMetadata,
} from "./types.js";

export class WebSocketServer {
  private io: SocketServer;
  private httpServer: HttpServer;
  private connectionCounts = new Map<string, number>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.httpServer = createServer();
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: "*", // In production, restrict to frontend domain
        methods: ["GET", "POST"],
      },
      pingInterval: config.ws.heartbeatIntervalMs,
      pingTimeout: config.ws.disconnectTimeoutMs,
      maxHttpBufferSize: 1e6, // 1MB max message size
    });

    this._setupEventHandlers();
  }

  /**
   * Start the WebSocket server.
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(config.ws.port, () => {
        console.log(`[WebSocket] Server listening on port ${config.ws.port}`);
        this._startHeartbeat();
        resolve();
      });
    });
  }

  /**
   * Stop the WebSocket server.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.io.close(() => {
        this.httpServer.close(() => resolve());
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Public Emitters
  // ═══════════════════════════════════════════════════════════════

  /**
   * Broadcast match state update to all clients in the match room.
   */
  emitMatchUpdate(matchId: string, data: WsMatchUpdate): void {
    this.io.to(this._room(matchId)).emit("match:update", data);
  }

  /**
   * Broadcast goal scored event to match room + all-live room.
   */
  emitGoalScored(data: WsGoalScored): void {
    // Notify specific match room
    this.io.to(this._room(data.matchId)).emit("goal:scored", data);

    // Also broadcast to global "live" room for non-subscribed users
    this.io.to("live:all").emit("goal:scored", data);
  }

  /**
   * Broadcast match settlement.
   */
  emitMatchSettled(data: WsMatchSettled): void {
    this.io.to(this._room(data.matchId)).emit("match:settled", data);
    this.io.to("live:all").emit("match:settled", data);
  }

  /**
   * Broadcast fee change.
   */
  emitFeeChanged(data: WsFeeChanged): void {
    this.io.to(this._room(data.matchId)).emit("fee:changed", data);
  }

  /**
   * Broadcast new match created (upcoming matches).
   */
  emitMatchCreated(data: { matchId: string; homeTeam: string; awayTeam: string; startTime: string }): void {
    this.io.to("live:all").emit("match:created", data);
  }

  /**
   * Emit match state snapshot to a specific socket (for new connections / replay).
   */
  emitSnapshot(socket: Socket, matchId: string, state: MatchState, metadata?: MatchMetadata): void {
    const snapshot: WsMatchUpdate = {
      matchId,
      homeTeam: metadata?.homeTeam ?? "Unknown",
      awayTeam: metadata?.awayTeam ?? "Unknown",
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      minute: state.minute,
      status: state.isFinished ? "FT" : "LIV",
      feeTier: 10000, // Will be calculated by hook
      feeReason: state.penaltyShootout ? "Penalty shootout" : "Normal play",
    };
    socket.emit("match:update", snapshot);
  }

  /**
   * Broadcast a global announcement (e.g., "System maintenance in 5 min").
   */
  broadcastAnnouncement(message: string): void {
    this.io.emit("announcement", { message, timestamp: new Date().toISOString() });
  }

  /**
   * Get current connection stats.
   */
  getConnectionStats() {
    return {
      totalConnections: this.io.engine ? (this.io.engine as any).clientsCount ?? 0 : 0,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()).length,
      connectionsByIp: new Map(this.connectionCounts),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Internal
  // ═══════════════════════════════════════════════════════════════

  private _setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      const clientIp = socket.handshake.address;
      const currentCount = this.connectionCounts.get(clientIp) ?? 0;

      // Rate limiting per IP
      if (currentCount >= config.ws.maxConnectionsPerIp) {
        console.warn(`[WebSocket] Rate limit exceeded for IP: ${clientIp}`);
        socket.emit("error", { message: "Rate limit exceeded. Max 10 connections per IP." });
        socket.disconnect();
        return;
      }

      this.connectionCounts.set(clientIp, currentCount + 1);
      console.log(`[WebSocket] Client connected: ${socket.id} (${clientIp})`);

      // Handle room subscriptions
      socket.on("subscribe:match", (matchId: string) => {
        if (typeof matchId !== "string") return;
        socket.join(this._room(matchId));
        socket.emit("subscribed", { matchId });
        console.log(`[WebSocket] Socket ${socket.id} subscribed to match ${matchId}`);
      });

      socket.on("unsubscribe:match", (matchId: string) => {
        if (typeof matchId !== "string") return;
        socket.leave(this._room(matchId));
        socket.emit("unsubscribed", { matchId });
      });

      // Subscribe to global live feed
      socket.on("subscribe:live", () => {
        socket.join("live:all");
        socket.emit("subscribed", { feed: "live" });
      });

      socket.on("unsubscribe:live", () => {
        socket.leave("live:all");
        socket.emit("unsubscribed", { feed: "live" });
      });

      // Handle ping/pong
      socket.on("ping", () => {
        socket.emit("pong", { timestamp: Date.now() });
      });

      socket.on("disconnect", (reason) => {
        const count = this.connectionCounts.get(clientIp) ?? 1;
        if (count <= 1) {
          this.connectionCounts.delete(clientIp);
        } else {
          this.connectionCounts.set(clientIp, count - 1);
        }
        console.log(`[WebSocket] Client disconnected: ${socket.id} (${reason})`);
      });
    });
  }

  private _startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.io.emit("heartbeat", { timestamp: Date.now() });
    }, config.ws.heartbeatIntervalMs);
  }

  private _room(matchId: string): string {
    return `match:${matchId}`;
  }
}
