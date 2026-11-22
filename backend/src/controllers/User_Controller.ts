import {
    createCredential,
    verifyCredential
} from "../module/UserIdentification.js"
import { Request, Response } from "express"
import { send_response } from "../lib/sendResponse.js"
import { } from "../module/UserIdentification.js"
import { removeUser, removeUserFromRooms } from "../repositories/usersRepositores.js"



// every res.json will must have {
//                               success: true/false
//                               massage: "string"
//                               response code
//                               data (if data it not given it become null)
//                               }



const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
    };




const createUser = async (req: Request, res: Response) => {

    const userCredential: string = createCredential()

    // if (userCredential == null) throw an error

    res.cookie("userCredential", userCredential, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 400,
    });

    await send_response(res, true, "Temporary session active successfully", 200)

}


const checkUser = async (req: Request, res: Response) => {

    const cookie: string = req.cookies.userCredential ?? ""

    if (!cookie) {
        send_response(res, false, "Cookie not found", 400)
        return
    }

    const participantId: string = verifyCredential(cookie) ?? ""

    if (!participantId) {
        send_response(res, false, "Invalid cookie", 401)
        return
    }

    send_response(res, true, "Success", 200)

}




//clear from db
//clear the cookie
//if he i moderetor of some room then clear that room too

const endTempSession = async (req: Request, res: Response) => {

    const cookie: string = req.cookies.userCredential ?? ""

    if (!cookie) {
        send_response(res, false, "Cookie not found", 400)
        return
    }

    const participantId: string = verifyCredential(cookie) ?? ""

    if (!participantId) {
        send_response(res, false, "Invalid cookie", 401)
        return
    }

    const roomsCleaned = await removeUserFromRooms(participantId)
    if (!roomsCleaned) return send_response(res, false, "Internal Server Error", 500)

    const userRemoved = await removeUser(participantId)
    if (!userRemoved) return send_response(res, false, "Internal Server Error", 500)

    res.clearCookie("userCredential", cookieOptions)
    send_response(res, true, "Session Ended", 200)

}




export {
    createUser,
    checkUser,
    endTempSession
}