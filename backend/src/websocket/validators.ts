import { ClientChatMessage } from "./protocol.js";
import { ClientMessageType } from "./protocol.js";

export function isClientChatMessage(data: unknown): data is ClientChatMessage {
    return (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        "message" in data &&
        data.type === ClientMessageType.Message &&
        typeof data.message === "string"
    );
}