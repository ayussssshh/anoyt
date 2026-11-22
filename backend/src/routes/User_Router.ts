import { Router } from "express";
import { 
    createUser,
    checkUser,
    endTempSession
} from "../controllers/User_Controller.js";


const router = Router();

router.get("/create-temp-session", createUser);
router.get("/check-temp-session", checkUser);
router.get("/end-temp-session", endTempSession)


export default router;