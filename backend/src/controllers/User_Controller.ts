import { createCredential } from "../module/UserIdentification.js"
import { Request, Response } from "express"
import { send_response } from "../lib/sendResponse.js"
import { verifyCredential } from "../module/UserIdentification.js"



// every res.json will must have {
//                               success: true/false
//                               massage: "string"
//                               response code
//                               data (if data it not given it become null)
//                               }


const createUser = async (req: Request, res: Response) => {

    const userCredential: string = createCredential()

    // if (userCredential == null) throw an error

    res.cookie('userCredential', userCredential, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24
})

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




export {
    createUser,
    checkUser
}