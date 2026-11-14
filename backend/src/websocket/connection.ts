import WebSocket from "ws";
import { IncomingMessage } from "node:http";
import { trackHeartbeat } from "./heartbeat.js";
import { WSauth } from "./auth.js";
import { setUsername } from "../module/CreateUserName.js";
import { broadcastService } from "./broadcastService.js";
import { isClientChatMessage } from "./validators.js";
import { parseClientMessage } from "./protocol.js";
import { ParseResult } from "./protocol.js";
import logger from "../lib/logger.js";
import { error } from "node:console";




export type Connection = {
    userId: string;
    username: string;
    roomId: string;
    socket: WebSocket;
}

type RoomId = string;


export const RoomMapConnection = new Map<RoomId, Set<Connection>>()


export async function handleConnection(socket: WebSocket, request: IncomingMessage) {

    const userId: string = WSauth(request) ?? ""

    if (!userId) {
        console.log("auth error")
        return 
    } // do systamatic response for invalid cred

    const username: string = await setUsername(userId) ?? ""

    const url = new URL(request.url!, "http://localhost");

    const roomId: RoomId = url.searchParams.get("roomId") ?? "";

    trackHeartbeat(socket)

    const connection: Connection= {roomId, userId, username, socket}

    setRoomMapConnection(connection)
    
    socket.on("message", (rawData) => {

        const data: ParseResult = parseClientMessage(rawData.toString())

        if (!data.ok) {
            return //do a better error handiling
        }

        broadcastService(connection, data.msg)
    })

    socket.on("close", () => {
        removeRoomMapConnection(connection, roomId)
    })

    socket.on("error", () => {
        logger.error(error)
    })
}




function setRoomMapConnection(
    connection: Connection
) {
    const roomId: RoomId = connection.roomId

    // Check whether the room already exists
    let connections = RoomMapConnection.get(roomId);

    if (!connections) {
        connections = new Set<Connection>();
        RoomMapConnection.set(roomId, connections);
    }

    // Add the connection to the room
    connections.add(connection);
}


function removeRoomMapConnection(
    connection: Connection,
    roomId: RoomId,
    removeEntireRoom: boolean = false
): void {
    if (removeEntireRoom) {
        RoomMapConnection.delete(roomId);
        return;
    }

    const connections = RoomMapConnection.get(roomId);
    if (!connections) return;

    connections.delete(connection);

    if (connections.size === 0) {
        RoomMapConnection.delete(roomId);
    }
}

