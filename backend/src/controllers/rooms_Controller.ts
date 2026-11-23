import { send_response } from "../lib/sendResponse.js"
import { Request, Response } from "express"
import { createRoom, joinRoom, qureyRoomList, queryRoomName } from "../repositories/roomsRepositories.js"
import { B10toB32, B32toB10 } from "../lib/baseConversion.js"




const CTRL_getRoomList = async (req: Request, res: Response) => {

    const RoomList = await qureyRoomList()

    if (RoomList === undefined) {
        // handle the error rn now i am returning the function
        return
    }

    for (const room of RoomList) {
        room.room_id = B10toB32(room.room_id)
    }

    await send_response(res, true, "fetched the list of rooms", 200, RoomList)

}

const CTRL_createRoom = async (req: Request, res: Response) => {

    const part = req.cookies.userCredential.split(".")

    const userID = part[0]
    const name: string = req.body.name
    const description: string = req.body.description
    let is_private: boolean

    if (req.body.visibility === "private") {
        is_private = true
    }
    else {
        is_private = false
    }

    const room_id: number = await createRoom(name, description, is_private);

    await joinRoom(userID, room_id, true)
}


const CTRL_getRoomName = async (req: Request, res: Response) => {

    const room_id = req.query.room_id;

    if (typeof room_id !== "string" || !/^[0-9A-Za-z]+$/.test(room_id)) {
        send_response(res, false, "Invalid room id", 400);
        return;
    }

    const roomName = await queryRoomName(room_id)

    console.log(roomName)

    if (!roomName) {
        send_response(res, false, "Room Not Found", 404)
        return
    }

    send_response(res, true, "Room Found", 200, [roomName])

}

export { CTRL_getRoomList, CTRL_createRoom, CTRL_getRoomName }