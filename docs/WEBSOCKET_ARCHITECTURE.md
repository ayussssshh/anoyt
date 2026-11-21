# WebSocket Architecture

Status: draft, partly implemented

Application version: v1.0.0, deployed on Render, still needs polishing.

This file holds the **rules** of the WebSocket layer: who a user is, what a connection is, how rooms work. The **wire format** (message shapes, validation) lives in `protocol.ts`. Don't duplicate one in the other.

Each rule below carries a status tag:

- **[done]** implemented as described
- **[partial]** implemented in part, difference noted
- **[todo]** specified but not implemented yet

---

## 0. Status at a glance

| Area | Status |
| --- | --- |
| Identity from the signed cookie, close `1008` on failure | [done] |
| Room chosen by `?roomId=`, close `4002` if missing | [partial] (see section 11) |
| Multiple tabs per user, no kicking | [done] |
| Broadcast to every connection in the room, including the sender's | [done] |
| Message parsing and validation (`protocol.ts`) | [done] |
| `ERROR` frames for rejected messages | [done] |
| Heartbeat | [partial] (interval differs from this doc) |
| Per-user connection cap (close `4003`) | [todo] |
| Presence: `WELCOME`, `USER_JOINED`, `USER_LEFT`, online counts | [todo] (types exist, nothing sends them) |
| `maxPayload` on the server | [todo] |
| Per-user rate limiting | [todo] |
| Registry module, router, handlers, `send.ts` | [todo] (see section 8) |
| Message storage and history | [todo] |
| Private-room access checks | [todo] |
| Client reconnect and close-code handling | [todo] |

---

## 1. Terms

- **User**: an anonymous participant, identified by the signed `userCredential` cookie. One user = one browser profile.
- **Connection**: one WebSocket. One per tab / page load. A user can have many.
- **Room**: a chat room, identified by `roomId`. The ID in the URL is the base-36 uppercase form of the database ID.

---

## 2. Decisions

1. **Identity is the cookie.** The `userId` is read from the credential once, at the handshake, and stored on the `Connection`. It is never re-read from the cookie afterwards. [done]
2. **A user may have multiple tabs**, all with the same identity (same `userId`, same username). [done]
3. **Tabs may be in different rooms.** The same user can be in room A in one tab and room B in another. The same room in two tabs is also allowed. [done]
4. **No kicking.** A new connection never closes an existing one. [done]
5. **A connection is in exactly one room**, chosen at connect time via `?roomId=`. To change rooms, open a new connection. [done]

---

## 3. Connection lifecycle

The endpoint is `wss://<host>/ws?roomId=<id>`. In local development it is `ws://localhost:3000/ws?roomId=<id>`.

The path is `/ws`, not `/room/`, so it cannot collide with the React routes `/room` and `/room/:room_id`. Make sure `WS_PATH` in `protocol.ts` and the `path` option in `websocket/index.ts` both say `/ws`.

In production the page, the API, and the WebSocket are all served by the same Render service, so the socket is same-origin and the cookie travels with the handshake because it is first-party. In local development the Vite dev server proxies `/ws` to the backend.

1. Client opens the socket. The browser sends the cookie automatically. [done]
2. Server verifies the credential and gets `userId`. On failure: close `1008`. [done]
3. Server looks up or creates the user's username. [done, but see the order note below]
4. Server checks that `roomId` is present and the room exists. On failure: close `4002`. [partial]
5. Server checks the per-user connection cap. On failure: close `4003`. [todo]
6. Server creates the `Connection`, adds it to the room's set, and starts tracking its heartbeat. [done] Registering in a user-to-connections map is [todo].
7. Message loop: parse JSON, validate, then broadcast. Every failure sends an `ERROR` frame and logs a warning; nothing is dropped silently. [done] There is no dispatch-by-type router yet, because there is only one client message type (`MESSAGE`), and the try/catch around dispatch is [todo].
8. On close (the `close` event, the only place cleanup happens): remove the connection from the room, and drop the room's set when it becomes empty. [done] Announcing "left" only for the user's last connection is [todo].

**Order note.** The code does the username lookup (which can insert a row into `anonymous_users`) before it checks the room. A connection to a nonexistent room can therefore still create a username row. Checking the room first avoids that.

---

## 4. State

**Target design.** All state lives in one registry module. Nothing else holds sockets.

```ts
connections: Map<connId, Connection>             // every live socket
userConnections: Map<userId, Set<Connection>>    // all tabs of one user
rooms: Map<roomId, Set<Connection>>              // who receives broadcasts

type Connection = {
  id: string;        // unique per socket
  userId: string;    // from the credential
  username: string;  // stable per user
  roomId: string;
  socket: WebSocket;
  isAlive: boolean;  // heartbeat flag
};
```

**Current implementation.** Only the rooms map exists, and it lives in `connection.ts`:

```ts
RoomMapConnection: Map<roomId, Set<Connection>>

type Connection = { userId; username; roomId; socket }   // no id, no isAlive
```

Heartbeat liveness is kept separately in a `WeakMap<WebSocket, boolean>` inside `heartbeat.ts`. The other two maps (`connections`, `userConnections`) are needed for the connection cap and for presence, and should be added together with those features.

State is in memory: it is lost on restart and works for a single server process only. On the free Render tier the process can restart at any time, which drops every open socket.

---

## 5. Rules

**Identity and usernames**
- The username is looked up or created once per connection and stored on the `Connection`. All tabs of a user show the same name. [done]

**Rooms and broadcasts**
- A broadcast goes to every open connection in the room, including the sender's own tabs. [done]
- Before sending, check `socket.readyState === OPEN`. [done]
- The broadcast `MESSAGE` frame currently carries the sender's real `userId`. The comment in `protocol.ts` describes that field as unique per message. The two disagree. Because `userId` is stable across rooms, other participants could link one person's messages across conversations. Prefer a per-message ID (or a per-room pseudonymous ID) instead. [open]

**Presence**
- Presence counts unique users, not sockets: `new Set([...room].map(c => c.userId)).size`. [todo]
- "Joined" is announced when a user's first connection in a room opens. "Left" is announced when their last one closes. [todo]
- Until this exists, the "online" numbers in the UI are placeholders.

**Limits** (proposed defaults, adjust freely)
- Max connections per user: 5. The constant exists; enforcement is [todo].
- Max message length: 2000 characters. [done] Enforced in `parseClientMessage` after trimming.
- Max websocket payload: `MAX_PAYLOAD_BYTES` is defined but not passed to `new WebSocketServer({ maxPayload })`. [todo]
- Rate limit per **user** across all their tabs, not per socket. The `RATE_LIMITED` error code exists; the limiter is [todo].

**Heartbeat**
- One `setInterval` for the whole server. [done]
- Mark each socket not alive, send `ping`. A `pong` marks it alive. A socket still not alive on the next round is `terminate()`d. [done]
- Cleanup runs in the `close` handler, so normal and terminated sockets take the same path. [done]
- **Interval mismatch.** This document and `HEARTBEAT_INTERVAL_MS` in `protocol.ts` say 30 seconds. `heartbeat.ts` uses its own constant of 3 seconds, and the protocol value is unused. Pick one value and have `heartbeat.ts` import it. [partial]

**Errors**
- Handlers never fail silently. Failure means an `ERROR` frame to the client plus a log line with the reason. [done for message parsing]
- The router wraps dispatch in a try/catch so a bad message cannot crash the server. [todo]
- Every socket has an `error` handler. [done]
- `handleConnection` is `async`, but its caller does not `await` it, so the try/catch in `websocket/index.ts` cannot catch errors thrown after the first `await` (for example a failed database lookup). Such an error becomes an unhandled promise rejection, which can stop a Node process. Await the call, or wrap the body of `handleConnection` in its own try/catch that closes the socket with `1011`. [open]

---

## 6. Close codes

| Code | Meaning | Client should | Server uses it today |
|------|---------|---------------|----------------------|
| 1000 | Normal (user left) | Not reconnect | No |
| 1001 | Going away (tab closed, server shutdown) | Reconnect if the server shut down | No |
| 1006 | Abnormal (network drop, no close frame) | Reconnect with backoff | n/a, observed by the client only |
| 1008 | Unauthorized (bad or missing credential) | Get a new session, then retry once | Yes |
| 1011 | Server error | Reconnect with backoff | Only in the outer catch, which rarely fires (see section 5) |
| 4001 | Reserved (unused) | n/a | No |
| 4002 | Room not found | Show a message, go back to the room list | Yes |
| 4003 | Too many connections | Show a message, do not reconnect | No |

The client currently ignores close codes (see section 9).

---

## 7. Logging

- Use the pino logger. No `console.log`. [done on the server]
- One child logger per connection: `logger.child({ connId, userId, roomId })`. [todo] Currently each log call passes the fields by hand.
- **info**: connected, joined, left, closed (with code and reason). [partial] "Connected" and "Closed" are logged; the close code and reason are not.
- **debug**: each incoming frame (type and size, never the content). [todo]
- **warn**: rejected messages, with the reason. [done] Note that the current warning also logs the first 200 characters of the raw message, which conflicts with the "never the content" principle. Log the error code and size only.
- **error**: exceptions. [done]
- Never log the credential. [done]

---

## 8. Folder layout

**Target.**

```
websocket/
├── index.ts       wiring only: create the server, call handleConnection
├── connection.ts  one connection's lifecycle
├── auth.ts        cookie from the handshake, verifyCredential, userId
├── protocol.ts    wire format: message types, validation, constants
├── router.ts      parse, validate, dispatch by type
├── handlers/      one file per message type
├── registry.ts    the state in section 4
├── heartbeat.ts   the interval in section 5
└── send.ts        sendTo, broadcastToRoom, sendError
```

**Current.**

```
websocket/
├── index.ts            creates the WebSocketServer, starts the heartbeat
├── connection.ts       lifecycle, the rooms map, the message loop
├── auth.ts             WSauth: cookie from the handshake, verifyCredential
├── protocol.ts         wire format, validation, constants
├── broadcastService.ts builds the MESSAGE frame and sends it to the room
├── heartbeat.ts        ping/pong interval
└── reject.ts           WSreject (close with code) and WSsendError (ERROR frame)
```

`router.ts`, `handlers/`, `registry.ts`, and `send.ts` are worth introducing when a second client message type or presence appears. Until then `connection.ts` plus `broadcastService.ts` do the same job with less structure.

---

## 9. Frontend behavior

What `RoomChatPage` does today:

- Opens one WebSocket when the page mounts, using the `room_id` from the URL, and closes it on unmount. [done]
- Sends `{ "type": "MESSAGE", "message": "<text>" }`. The page currently also includes `username` and `timestamp` fields. The server ignores them, and they can be removed. [done]
- Does **not** add its own message to the list. It waits for the server's broadcast, which also reaches the sender. [done]
- Handles only `MESSAGE` frames. `WELCOME`, `USER_JOINED`, `USER_LEFT`, and `ERROR` frames are ignored, so rejected messages and errors are invisible to the user. [todo]
- Does not reconnect and does not react to close codes (section 6). [todo]
- Builds the socket URL by hand. It must be built from the page's own location so it works in production and in local development (through the Vite proxy): `wss://` when the page is `https:`, host from `location.host`, path `/ws`. A hardcoded `ws://localhost:3000/...` URL will not work in production.
- The room name and online count in the top bar are placeholders, not real data. [todo]

---

## 10. Deployment notes

- Frontend and backend both run on one Render web service. Express serves the built frontend, the `/api` routes, and the WebSocket on the same address. Because everything is one origin, the identity cookie is first-party and is sent on both HTTP requests and the WebSocket handshake, and no CORS configuration is needed in production.
- `GET /api/ping` returns `ok` without touching the database. An external monitor can call it to keep the free instance from idling.
- The Render free tier spins an idle service down and may restart it at any time. All realtime state is in memory, so a restart disconnects everyone and empties every room's connection set. Clients need reconnect with backoff to recover.
- The heartbeat keeps connections from sitting idle, but the service can still restart, so it is not a substitute for reconnect logic.
- Scaling past one server process needs shared state (for example Redis pub/sub) because rooms live in a process-local map.

---

## 11. Known gaps and bugs

1. An unknown `roomId` makes the room lookup throw instead of returning "not found" (it reads a field of a missing row). The socket should be closed with `4002`.
2. The room lookup receives the base-36 ID from the URL without decoding it, so it only works while the encoded and database forms coincide (small IDs). Decode with `B32toB10` first.
3. Private rooms are rejected as not found, because the lookup only matches public rooms.
4. The un-awaited `async` handler and missing try/catch (section 5).
5. Heartbeat interval mismatch (section 5).
6. The broadcast exposes the real `userId` (section 5).
7. The warn log includes raw message content (section 7).

---

## 12. Open questions

- Are messages stored, or ephemeral? **Currently ephemeral.** If stored: history on join, and a `messages` table.
- Private rooms: how is access granted (invite code or link), and where is it checked? **Currently nothing grants access.** The check belongs in the handshake, after step 4.
- Moderator actions for v1 (kick, close room, delete message)? **None implemented.** A moderator flag is stored in `room_members` for the creator.
- Room cleanup: when does an empty room expire? **Never today.** The in-memory connection set is dropped when empty; the database row stays.
- Should the cap of 5 connections per user and the rate limit be per user (as specified) given that a user can clear cookies to get a new identity?