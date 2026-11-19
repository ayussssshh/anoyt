import { Router } from "express";
import { 
    createUser,
    checkUser
} from "../controllers/User_Controller.js";


const router = Router();

router.get("/create-temp-session", createUser);
router.get("/check-temp-session", checkUser);


export default router;