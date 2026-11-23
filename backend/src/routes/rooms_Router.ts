import { Router } from "express";
import {
    CTRL_getRoomList,
    CTRL_createRoom, 
    CTRL_getRoomName
} from "../controllers/rooms_Controller.js";

const router = Router();


router.get("/room-list", CTRL_getRoomList);
router.post("/room-create", CTRL_createRoom);
router.get("/get-room-name", CTRL_getRoomName)

export default router
