"use client";

import { useEffect, useRef, useState } from "react";
import RoomTopBar from "../../components/RoomTopBar/RoomTopBar";
import SendMsg from "../../components/RoomMsgSend/RoomMsgSend";
import ChatMsg from "../../components/ChatMsg/ChatMsg";
import { 
    useParams,
    useNavigate,
    useLocation
     } from "react-router-dom";
import "./RoomChatPage.css";
import { api } from "../../modules/Apis";
import axios from "axios";


interface Message {
    type: "MESSAGE";
    username: string;
    message: string;
    timestamp: number;
}

export default function RoomChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const listRef = useRef<HTMLElement>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const { room_id } = useParams<{ room_id: string }>()

    const navigate = useNavigate()
    const Location = useLocation()

    const stateName = (Location.state as { roomName?: string } | null)?.roomName ?? "Room"

    const [roomName, setRoomName] = useState(stateName ?? "")



    // Called when the user presses Send.
    // The message is NOT added locally: the server broadcasts it back to
    // every client (including the sender), and onmessage adds it.

    function handleSend(text: string) {

        const socket = socketRef.current;

        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        const msg: Message = {
            type: "MESSAGE",
            username: "me",
            message: text,
            timestamp: Date.now(),
        };

        socket.send(JSON.stringify(msg));
    }


    // function on handle the close

    function handleLeave(){
        navigate("/room")
    }


    useEffect(() => {
    if (!room_id) return;

    const controller = new AbortController();

    async function loadRoomName() {
        try {
            const res = await api.get("/rooms/get-room-name", { params: { room_id } })

            setRoomName(res.data.data[0]);
        } catch (err) {
            if (axios.isCancel(err)) return; // we aborted it ourselves
            console.error("Failed to load room name:", err);
            //navigate("/room");
        }
    }

    loadRoomName();

    return () => controller.abort();
}, [room_id, navigate]);


    // Open the websocket connection (port 3000) and close it on unmount.
    useEffect(() => {

        if (!room_id) return;

        const proto = location.protocol === "https:" ? "wss" : "ws";
        const socket = new WebSocket(`${proto}://${location.host}/ws?roomId=${encodeURIComponent(room_id)}`);

        socketRef.current = socket;

        // socket.onopen = () => {

        //     console.log("WebSocket connected");

        //     socket.send(JSON.stringify({
        //         type: "SOCKET_CONNECTION",
        //         roomId: room_id
        //     }));
        // };

        socket.onmessage = (event) => {

            try {
                const msg: Message = JSON.parse(event.data);

                if (msg.type === "MESSAGE") {
                    setMessages(prev => [...prev, msg]);
                }

            } catch {
                console.error("Bad message:", event.data);
            }
        };

        socket.onclose = () => {
            console.log("WebSocket disconnected");
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        return () => {
            socketRef.current = null;
            socket.close();
        };

    }, [room_id]);

    // Keep the view scrolled to the newest message.
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, [messages]);

    // Match the page to the area that is actually visible
    // (shrinks when the mobile keyboard opens, grows back when it closes).
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const root = document.documentElement;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden"; // stop the page itself from scrolling

        const update = () => {
            root.style.setProperty("--vv-height", `${vv.height}px`);
            root.style.setProperty("--vv-top", `${vv.offsetTop}px`);

            // keep the latest message visible when the keyboard opens/closes
            const el = listRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        };

        update();
        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);

        return () => {
            vv.removeEventListener("resize", update);
            vv.removeEventListener("scroll", update);
            root.style.removeProperty("--vv-height");
            root.style.removeProperty("--vv-top");
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    return (
        <div className="room-chat-page">
            <RoomTopBar roomName={roomName} activeUser={18} onLeave={handleLeave}/>

            <main className="chat-messages" ref={listRef}>
                {messages.length === 0 && (
                    <p className="chat-empty">No messages yet. Say something.</p>
                )}

                {messages.map((msg, i) => (
                    <ChatMsg
                        key={`${msg.timestamp}-${i}`}
                        username={msg.username}
                        message={msg.message}
                        timestamp={msg.timestamp}
                    />
                ))}
            </main>

            <SendMsg onSend={handleSend} />
        </div>
    );
}
