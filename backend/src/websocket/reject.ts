import WebSocket from "ws";
import {
    CloseCode,
    CLOSE_REASION,
    ErrorCode,
    ERROR_TEXT,
    encodeServerMessage,
    makeError
} from "./protocol.js";
import logger from "../lib/logger.js";

export function WSreject(socket: WebSocket, code: CloseCode){

    const reasion = CLOSE_REASION[code]
    logger.warn({reasion, code}, "connection reject")
    socket.close(code, reasion)

}

export function WSsendError(socket: WebSocket, code: ErrorCode): void {
  logger.warn({ code }, "message rejected");
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(encodeServerMessage(makeError(code)));
}