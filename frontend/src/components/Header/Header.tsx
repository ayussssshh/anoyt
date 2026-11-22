import AnoytLogo from "./../AnoytLogo/AnoytLogo"
import "./Hearder.css"
import { api } from "../../modules/Apis"
import { useLocation, useNavigate } from "react-router-dom"



export default function TopNavBar() {

    const navigate = useNavigate()

    const { pathname } = useLocation()
    const showEndSession = pathname === "/room"

    async function handleEndsession() {
        const response = await api.get("/Users/end-temp-session")
        if (response.status == 200) {
            navigate('/')
        }
    }

    return (
        <div className="topnavbar">
            <AnoytLogo height={60} />
            {showEndSession && (
                <button className="end-session-btn" onClick={handleEndsession}>
                    End Session
                </button>
            )}
        </div>
    )
}