/**
 * GoalSwap Telegram Bot — JSON File-Based Storage
 *
 * Lightweight persistent storage for demo / hackathon use.
 * Stores users, subscriptions, and notifications as JSON files.
 *
 * Can be swapped for PostgreSQL in production — the interface
 * mirrors the SQL schema from about.md.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { TelegramUser, Subscription, Notification } from "../types.js";

const DATA_DIR = process.env.DATA_DIR ?? "./data";

// ── Helper: ensure directory exists ──
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Generic JSON read/write ──
function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ═══════════════════════════════════════════════════════════════════
//  Users
// ═══════════════════════════════════════════════════════════════════

const USERS_FILE = path.join(DATA_DIR, "users.json");

function _readUsers(): Map<number, TelegramUser> {
  const arr = readJson<Array<[number, TelegramUser]>>(USERS_FILE, []);
  return new Map(arr);
}

function _writeUsers(users: Map<number, TelegramUser>): void {
  writeJson(USERS_FILE, Array.from(users.entries()));
}

export function getUser(userId: number): TelegramUser | undefined {
  return _readUsers().get(userId);
}

export function getAllUsers(): TelegramUser[] {
  return Array.from(_readUsers().values());
}

export function upsertUser(user: Partial<TelegramUser> & { userId: number; firstName: string }): TelegramUser {
  const users = _readUsers();
  const existing = users.get(user.userId);

  const updated: TelegramUser = {
    userId: user.userId,
    username: user.username ?? existing?.username,
    firstName: user.firstName,
    lastName: user.lastName ?? existing?.lastName,
    language: user.language ?? existing?.language ?? "en",
    walletAddress: user.walletAddress ?? existing?.walletAddress,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    lastActive: new Date().toISOString(),
    goalAlerts: user.goalAlerts ?? existing?.goalAlerts ?? true,
    feeSpikeAlerts: user.feeSpikeAlerts ?? existing?.feeSpikeAlerts ?? true,
    settlementAlerts: user.settlementAlerts ?? existing?.settlementAlerts ?? true,
    dailySummary: user.dailySummary ?? existing?.dailySummary ?? false,
  };

  users.set(user.userId, updated);
  _writeUsers(users);
  return updated;
}

export function setWalletAddress(userId: number, address: string): void {
  const users = _readUsers();
  const user = users.get(userId);
  if (user) {
    user.walletAddress = address;
    user.lastActive = new Date().toISOString();
    users.set(userId, user);
    _writeUsers(users);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Subscriptions
// ═══════════════════════════════════════════════════════════════════

const SUBS_FILE = path.join(DATA_DIR, "subscriptions.json");

function _readSubscriptions(): Subscription[] {
  return readJson<Subscription[]>(SUBS_FILE, []);
}

function _writeSubscriptions(subs: Subscription[]): void {
  writeJson(SUBS_FILE, subs);
}

export function getUserSubscriptions(userId: number): Subscription[] {
  return _readSubscriptions().filter((s) => s.userId === userId && s.isActive);
}

export function getAllActiveSubscriptions(): Subscription[] {
  return _readSubscriptions().filter((s) => s.isActive);
}

export function getSubscriptionsByMatch(matchId: string): Subscription[] {
  return _readSubscriptions().filter(
    (s) => s.matchId === matchId && s.isActive,
  );
}

export function getSubscriptionsByMatchAndType(matchId: string, alertType: string): Subscription[] {
  return _readSubscriptions().filter(
    (s) => s.matchId === matchId && s.alertType === alertType && s.isActive,
  );
}

export function addSubscription(sub: Omit<Subscription, "id" | "createdAt">): Subscription {
  const subs = _readSubscriptions();
  const newSub: Subscription = {
    ...sub,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  subs.push(newSub);
  _writeSubscriptions(subs);
  return newSub;
}

export function removeSubscription(subId: string, userId: number): boolean {
  const subs = _readSubscriptions();
  const idx = subs.findIndex((s) => s.id === subId && s.userId === userId);
  if (idx === -1) return false;
  subs.splice(idx, 1);
  _writeSubscriptions(subs);
  return true;
}

export function deactivateSubscription(subId: string, userId: number): boolean {
  const subs = _readSubscriptions();
  const sub = subs.find((s) => s.id === subId && s.userId === userId);
  if (!sub) return false;
  sub.isActive = false;
  _writeSubscriptions(subs);
  return true;
}

export function removeUserSubscriptionsByMatch(userId: number, matchId: string): number {
  const subs = _readSubscriptions();
  const filtered = subs.filter(
    (s) => !(s.userId === userId && s.matchId === matchId),
  );
  const removed = subs.length - filtered.length;
  _writeSubscriptions(filtered);
  return removed;
}

// ═══════════════════════════════════════════════════════════════════
//  Notifications
// ═══════════════════════════════════════════════════════════════════

const NOTIFS_FILE = path.join(DATA_DIR, "notifications.json");

function _readNotifications(): Notification[] {
  return readJson<Notification[]>(NOTIFS_FILE, []);
}

function _writeNotifications(notifs: Notification[]): void {
  writeJson(NOTIFS_FILE, notifs);
}

export function addNotification(notif: Omit<Notification, "id" | "sentAt">): Notification {
  const notifs = _readNotifications();
  const newNotif: Notification = {
    ...notif,
    id: crypto.randomUUID(),
    sentAt: new Date().toISOString(),
  };
  notifs.push(newNotif);

  // Keep only last 1000 notifications per user
  const userNotifs = notifs.filter((n) => n.userId === notif.userId);
  if (userNotifs.length > 1000) {
    const cutoff = userNotifs.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    )[999].sentAt;
    const filtered = notifs.filter(
      (n) => n.userId !== notif.userId || n.sentAt >= cutoff,
    );
    _writeNotifications(filtered);
  } else {
    _writeNotifications(notifs);
  }

  return newNotif;
}

export function getUserNotifications(userId: number, limit = 20): Notification[] {
  return _readNotifications()
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .slice(0, limit);
}
