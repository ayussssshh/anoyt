import WebSocket from "ws";
import { IncomingMessage } from "node:http";
import { trackHeartbeat } from "./heartbeat.js";
import { WSauth } from "./auth.js";
import { setUsername } from "../module/CreateUserName.js";
import { broadcastService } from "./broadcastService.js";
import { parseClientMessage, ParseResult } from "./protocol.js";
import logger from "../lib/logger.js";
import { WSreject, WSsendError } from "./reject.js";
import { queryRoom } from "../repositories/roomsRepositories.js";




export type Connection = {
    userId: string;
    username: string;
    roomId: string;
    socket: WebSocket;
}

type RoomId = string;


export const RoomMapConnection = new Map<RoomId, Set<Connection>>()


export async function handleConnection(socket: WebSocket, request: IncomingMessage) {


    socket.on("error", (error) => {
        logger.error({ error }, "socket error")
    })



    const userId: string = WSauth(request) ?? ""

    if (!userId) {
        WSreject(socket, 1008)
        return
    }

    const username: string = await setUsername(userId) ?? ""

    const url = new URL(request.url!, "http://localhost");

    const roomId: RoomId = url.searchParams.get("roomId") ?? "";

    if (roomId !== await queryRoom(roomId)) {
        WSreject(socket, 4002)
        return
    }

    if (socket.readyState !== WebSocket.OPEN) return

    trackHeartbeat(socket)

    const connection: Connection = { roomId, userId, username, socket }

    setRoomMapConnection(connection)

    logger.info({
        roomId:connection.roomId,
        userId:connection.userId,
        username:connection.username
    }, "Connected")

    socket.on("message", (rawData) => {

        const data: ParseResult = parseClientMessage(rawData.toString())

        if (!data.ok) {
            logger.warn({ code: data.code, raw: rawData.toString().slice(0, 200) }, "bad client message")
            WSsendError(socket, data.code)
            return
        }

        broadcastService(connection, data.msg)
    })

    socket.on("close", () => {
        logger.info({
            roomId: connection.roomId,
            userId: connection.userId,
            username: connection.username
        }, "Closed")
        removeRoomMapConnection(connection, roomId)
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

