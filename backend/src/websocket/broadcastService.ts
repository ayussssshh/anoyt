import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import { RoomMapConnection } from "./connection.js";
import type { Connection } from "./connection.js";
import {
  ClientChatMessage,
  BroadcastMessage,
  ServerMessageType,
  encodeServerMessage,
} from "./protocol.js";

export function broadcastService(conn: Connection, msg: ClientChatMessage) {
  const out: BroadcastMessage = {
    type: ServerMessageType.Message,
    userId: conn.userId,
    username: conn.username,
    message: msg.message,
    timestamp: Date.now(),
  };

  const text = encodeServerMessage(out);

  for (const c of RoomMapConnection.get(conn.roomId) ?? []) {
    if (c.socket.readyState === WebSocket.OPEN) c.socket.send(text);
  }
}