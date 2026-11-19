import { Server } from "node:http";
import { WebSocketServer } from "ws";
import { handleConnection } from "./connection.js";
import { startHeartbeat } from "./heartbeat.js";
import logger from "../lib/logger.js";
import { CloseCode } from "./protocol.js";


export function initializeWebSocket(server: Server) {

    const wss = new WebSocketServer({
        server,
        path: "/ws"
    });

    startHeartbeat(wss)

    wss.on("connection",async (socket, request) => {
        try {
         handleConnection(socket, request);   
        } catch (error) {
            socket.close(CloseCode.ServerError)
        }
    });

}
