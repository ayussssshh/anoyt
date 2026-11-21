# Room Creation: Public & Private Rooms

*Working draft. The design intent comes from the original room sketch. Blocks marked **Implementation status** describe what the code does today.*

## Overview

When a participant creates a room, they pick one of two types: **public** or **private**. Whoever creates the room is the **creator** and is recorded as a **moderator** of it. What the creator may do depends on the room type.

There are no user accounts. "Participant" below means someone holding a valid anonymous session cookie (`userCredential`), created when they pressed *Get Started*.

## Flow

1. Participant opens **Create Room** (`/create-room`, reached from the room list).
2. They enter a name (max 50 characters), a description (max 300), and choose **Public** or **Private**. The form blocks empty names and descriptions.
3. The frontend sends `POST /api/rooms/room-create`:

```json
{ "name": "Linux help", "description": "Ask anything", "visibility": "public" }
```

4. The server inserts a row in `room_list` (`name`, `description`, `is_private`) and gets the new room ID back.
5. The server adds the creator to `room_members` with `is_moderator = true`.
6. The room is then either a **public room** (listed, open) or a **private room** (not listed, restricted).

## Data

| Table | Relevant columns |
| --- | --- |
| `room_list` | `room_id`, `name`, `description`, `is_private` |
| `room_members` | `user_id`, `room_id`, `is_moderator` |

**Room IDs.** The database ID is numeric. The API and the page URL show it in base-36 uppercase (for example room `10` appears as `A`). This conversion happens in `lib/baseConversion.ts`.

## Public Room

A normal, open room.

- Anyone with a valid anonymous session can join.
- Joining needs only the session cookie. There is no login and nothing else to supply.
- The creator can remove anyone from the room.

**Implementation status.**

- Public rooms appear in the room list (`GET /api/rooms/room-list` returns only rooms where `is_private = FALSE`).
- Entering a room opens a WebSocket to `/ws?roomId=<id>`. The server accepts the connection if the room exists and is public.
- Removing a participant is **not implemented**. The moderator flag is stored but nothing checks it.

## Private Room

A restricted, invite-style room.

- The creator can add new members. Nobody joins on their own.
- The creator can remove any member they added.

**Implementation status.**

- The private flag is stored and private rooms are hidden from the room list.
- There is **no way to join a private room yet**. The WebSocket room check only looks up public rooms, so a private room is rejected as "not found" (close code 4002), including for its own creator.
- Adding or removing members is not implemented, and no invite mechanism exists.

## Quick Comparison

|  | Public Room | Private Room |
| --- | --- | --- |
| Listed on the room list | Yes (implemented) | No (implemented) |
| Who can join | Anyone | Only people the creator adds (**not implemented**) |
| What's needed to join | Anonymous session cookie | Being added by the creator (**not implemented**) |
| Who adds members | Nobody, open join | Creator (**not implemented**) |
| Who can remove members | Creator, anyone (**not implemented**) | Creator, any added member (**not implemented**) |

## Known Gaps and Bugs

Found while checking this document against the code. None of these are fixed by this document.

1. **Create-room never responds.** The handler inserts the room and member rows but never sends an HTTP response, so the request hangs until the client's 10-second timeout. The frontend also only logs the result and does not navigate to the new room.
2. **The creator's identity is not verified.** The handler reads the participant ID by splitting the raw cookie value. It does not run the signature check used elsewhere, so a forged cookie would be accepted. It should call `verifyCredential` first.
3. **No server-side validation.** Name and description limits exist only in the form. The server should validate length and presence, and that `visibility` is one of the two allowed values.
4. **Private rooms cannot be entered** (see above).
5. **Unknown room IDs break the WebSocket handshake.** The room lookup throws instead of returning "not found" when no row matches, which should produce close code 4002.
6. **The WebSocket path does not decode the base-36 room ID.** It passes the URL value straight to the database. Rooms with IDs of 10 or more (base-36 `A` and up) will not resolve until the WebSocket layer decodes the ID with `B32toB10` before querying.
7. **Membership is not tracked on join.** Only creators are added to `room_members`. Participants who simply open a public room are not recorded.
8. **The "online" count shown on cards and in the room's top bar is not real data yet.**

## Open Questions

Carried over from the sketch, still undecided:

- What exactly are the "certain privileges" the creator gets? (Rename, delete room, change type, transfer ownership?) Only "is moderator" exists today.
- Can a public room be switched to private later, or the other way around?
- Can the creator hand over the role, or what happens if the creator leaves or is removed?
- Do removed users get blocked from rejoining a public room, or can they just join again? Because identity is a cookie, a removed participant can get a fresh identity by clearing cookies, so "blocked" needs a clear definition.
- Can members of a private room invite others, or is it strictly the creator?

New:

- How is access to a private room granted: an invite link or code, or a member list the creator manages? The WebSocket layer would need to check it (see `WEBSOCKET_ARCHITECTURE.md`, section 9).
- Should creating a room also navigate the creator into it?
- Should rooms ever expire, or should an empty room be removed after some time?