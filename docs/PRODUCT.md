# anoyt

## Product Definition — v0.2

**Status:** Draft, partly implemented
**Application version:** v1.0.0, deployed on Render, still needs polishing (this is the version of the app, separate from this document's version)
**Version:** 0.2
**Purpose:** Establish the product's identity, core philosophy, fundamental entities, and boundaries, and record which decisions the implementation has already made.

> **How to read this document.** The product definition (sections 1–13) is unchanged in intent. Blocks marked **Implementation status** describe what the code does today. Where the code made a decision that was previously open, section 17 says so explicitly. Anything not marked is still a design intention.

---

## 1. Product Summary

This project is an anonymous, topic-oriented conversation platform.

People can enter the platform without creating a traditional account or establishing a permanent identity. They can discover conversations, join conversations that interest them, or create their own conversations.

The primary object of the platform is **the conversation**, not the user.

Participants are temporary identities that exist for the purpose of participating in conversations.

The initial communication medium is text.

The project is primarily intended to demonstrate a well-engineered, maintainable, and reasonably robust full-stack application rather than to solve large-scale social-network growth or infrastructure problems.

---

## 2. Core Philosophy

### 2.1 Conversation over identity

The platform should encourage people to communicate based on:

* ideas
* interests
* questions
* opinions
* topics

rather than their real-world identity.

A participant should not need:

* a real name
* an email address
* a profile
* a permanent username
* a follower network
* a friend list

to participate in a conversation.

---

### 2.2 Temporary identity

A participant receives an identity for their active participation in the system.

This identity is temporary rather than a permanent account.

The platform should not maintain a permanent social identity for a participant merely because they previously visited the site.

**Implementation status.** Pressing "Get Started" calls `GET /api/Users/create-temp-session`. The server creates a random participant ID and sets a signed cookie, `userCredential`. The first time that participant opens a room, the server generates a random 8-character username and stores the pair `(user_id, username)` in the `anonymous_users` table. Nothing else about the participant is stored.

---

### 2.3 No traditional user accounts

The initial product will not implement traditional user accounts.

There will be no requirement for:

* registration
* login
* password
* email verification
* permanent user profile

The absence of accounts is a deliberate product decision, not merely a missing feature.

---

### 2.4 The platform mediates communication

Participants communicate through the platform.

Conceptually:

Participant A → Server → Participant B

Participants should not be given direct access to another participant's network identity or connection details through the application.

The system should avoid exposing unnecessary information that could allow participants to directly identify or contact one another.

This does not mean the platform can guarantee that participants can never identify one another. Participants may voluntarily reveal information through their messages or behavior.

**Implementation status.** Messages go from a participant's socket to the server, which broadcasts them to every socket in the room. The broadcast contains a username, a participant ID, the text, and a server timestamp. It contains no network information. Note that the broadcast currently includes the sender's internal participant ID (`userId`); see the open item in section 17.

---

## 3. Fundamental Entities

The initial product consists primarily of three conceptual entities:

```text
Participant
     │
     │ participates in
     ▼
Conversation
     │
     │ contains
     ▼
Message
```

These relationships are more important than any particular database implementation.

**Implementation status.** In the database, a participant is a row in `anonymous_users`, a conversation (called a *room* in the code) is a row in `room_list`, and membership is a row in `room_members`. There is no `messages` table yet; messages exist only in transit (see section 10).

---

## 4. Participant

A participant represents a person currently participating in the platform.

A participant is not equivalent to a permanent user account.

### A participant may:

* enter the platform
* receive a temporary identity
* join multiple conversations
* send messages
* receive messages
* leave conversations
* leave the platform entirely

### A participant does not initially have:

* permanent account identity
* profile
* email
* password
* friends
* followers
* permanent social history

### Internal identity

The system will require some internal mechanism for distinguishing active participants.

This identity may be completely meaningless to humans.

Example:

```text
Internal participant identity:
7f8c...a92e
```

The human-facing representation may instead be something like:

```text
Anonymous Fox
```

The exact generation and naming system is intentionally deferred.

**Implementation status.** The internal identity is a random 128-bit value (32 hex characters). The human-facing name is currently a random 8-character alphanumeric string, not a word-based name like "Anonymous Fox". A friendlier naming scheme is still open.

---

## 5. Participant Identity and Network Identity

The product must distinguish between:

**Application identity**

and

**Network identity**.

The platform should not conceptually define:

> IP address = user

An IP address may be useful as one technical signal, but it is not a reliable representation of a human participant.

Multiple people may share an IP address, while one person may appear through different IP addresses.

Therefore:

> Every active participant should receive a distinct temporary application identity.

**Implementation status.** The application identity is the signed cookie described in 2.2. The credential is `participantId.issuedAt.expiresAt.signature`, signed with HMAC-SHA256 using a server secret (`ANON_ID_SECRET`), so it cannot be forged or altered. The server does not store IP addresses.

---

## 6. Participant Lifecycle

The current intended lifecycle is:

```text
Enter platform
      ↓
Temporary participant created
      ↓
Join one or more conversations
      ↓
Participate
      ↓
Leave conversations
      ↓
Session ends
      ↓
Temporary identity eventually expires
```

The system should not assume that a participant who returns later is necessarily the same participant.

**Implementation status.**

* A session is the lifetime of the `userCredential` cookie.
* The signed credential itself is valid for 30 days, but the cookie is set with a 24-hour `maxAge`. In practice the browser discards it after 24 hours. These two numbers should be aligned deliberately.
* The home page checks for an existing valid session (`GET /api/Users/check-temp-session`) and skips straight to the room list if one exists.
* Closing a tab or losing a connection does not end the session. Reopening within the cookie lifetime keeps the same identity and username.
* A returning browser with a valid cookie *is* treated as the same participant, which is a deliberate simplification.

### Decisions still required

See section 17 for the current status of each question.

---

# 7. Conversation / Chat Room

A conversation is the primary social object of the platform.

A conversation provides a shared context in which multiple anonymous participants can communicate.

A conversation may contain:

* a subject/title
* a description
* tags
* participants
* messages
* lifecycle state

**Implementation status.** A room has a name (max 50 characters in the form), a description (max 300), and a public/private flag. Tags, lifecycle state, and expiry are not implemented. The API exposes the room ID in a base-36 uppercase form (for example `1A`), and the same form appears in the page URL `/room/:room_id`.

---

## 8. Conversation Creation

The current intended model is:

> Any participant may create a conversation.

Creating a conversation does not create a permanent relationship between the creator and the conversation.

The creator is simply the participant who initiated it.

Whether the creator receives special privileges is undecided.

Possible future permissions include:

* closing a conversation
* modifying conversation metadata
* removing participants
* moderating messages

These must be explicitly decided before implementation.

**Implementation status.** Any participant with a valid cookie can create a room (`POST /api/rooms/room-create`). The creator is recorded in `room_members` with `is_moderator = true`. No moderator action is implemented yet, so the flag currently has no effect. See `Room_Creation_Public___Private_Rooms.md`.

---

## 9. Conversation Membership

A participant may participate in multiple conversations simultaneously.

For example:

```text
Anonymous Fox
    │
    ├── Artificial Intelligence
    ├── Linux
    └── Philosophy
```

Participation in one conversation should not require the participant to leave another.

A participant's identity may or may not remain consistent across conversations. This is currently undecided and requires further discussion.

**Implementation status.** The username is stored per participant, not per room, so a participant has the **same name in every conversation**, and in every browser tab. Each WebSocket connection belongs to exactly one room, so several tabs can sit in different rooms. A participant is not currently added to `room_members` when they open a room; only the creator is.

---

# 10. Messages

Messages are fundamentally associated with the conversation in which they were created.

A message is not deleted merely because its sender leaves the platform.

Example:

```text
Conversation
│
├── Message A — Anonymous Fox
├── Message B — Anonymous Owl
├── Message C — Anonymous Fox
└── Message D — Anonymous Tiger
```

If Anonymous Fox leaves:

```text
Conversation
│
├── Message A — Anonymous Fox    ← remains
├── Message B — Anonymous Owl
├── Message C — Anonymous Fox    ← remains
└── Message D — Anonymous Tiger
```

The current rule is:

> **A message remains available for as long as its conversation remains available, unless a separate moderation or deletion rule removes it.**

The lifetime of a conversation has not yet been defined.

**Implementation status.** Messages are **not stored**. The server broadcasts each message to the sockets currently in the room and forgets it. A participant who joins later sees an empty room, and a page refresh clears the visible history. The rule above describes the intended behavior once message storage is added; until then messages are ephemeral.

---

# 11. Conversation Discovery

The homepage should primarily help participants discover conversations rather than people.

The initial conceptual homepage may contain three major paths:

### Live conversations

Show conversations that are currently active.

Possible signals:

* current participant count
* recent activity
* recent messages
* activity velocity

### Explore / Search

Allow participants to find conversations based on:

* topic
* subject
* description
* tags

### Create

Allow the current participant to start a new conversation.

The exact ranking algorithm is intentionally deferred.

The initial version should not depend on sophisticated recommendation or machine-learning systems.

**Implementation status.**

```text
/              Home: introduction and "Get Started" (creates or checks the session)
/room          Room list: all public rooms, plus a "Create Room" button
/create-room   Form: name, description, public/private
/room/:room_id Chat room
```

The room list shows every public room in the order the database returns them. There is no ranking, search, tags, or live activity signal. The "online" count on each card and in the room's top bar is not yet backed by real data.

---

# 12. Social Model

The platform is conversation-centric.

The intended social structure is:

```text
People
  ↓
temporary anonymous participants
  ↓
discover conversations
  ↓
join conversations
  ↓
communicate
  ↓
leave
```

The platform does not initially contain:

```text
Friends
Followers
Profiles
Likes
Permanent social graphs
Direct messages
```

These are outside the initial product model unless deliberately introduced later.

---

# 13. Anonymity Model

The product's anonymity goal is:

> Participants should not need to establish a permanent identity with the platform or with other participants.

The platform should minimize persistent identity information.

However, the product must not incorrectly claim that the server or underlying infrastructure is mathematically incapable of observing network information.

The distinction is:

```text
No permanent application identity
             ≠
No technically observable network information
```

A stronger server-anonymity model may be considered later.

**Implementation note.** The hosting providers in front of the app (Render and Neon) can observe network information as part of normal operation. The application itself does not store it.

---

# 14. Initial Technical Scope

The first implementation uses:

### Frontend

* TypeScript
* React, Vite, `react-router-dom`, `axios`

### Backend

* TypeScript
* Express 5, `ws`, `pino`

### Database

* PostgreSQL (hosted on Neon)

### Communication

* HTTP (JSON, under `/api`) for conventional application operations: session creation, room list, room creation
* **WebSocket** for realtime chat, one connection per tab, one room per connection. See `WEBSOCKET_ARCHITECTURE.md`.

### Hosting

* Frontend and backend both run on Render's free tier, as one web service. Express serves the built frontend, the `/api` routes, and the WebSocket from a single origin, which keeps the identity cookie first-party. The database is on Neon. The README has the full picture.

Scaling beyond a single server process is intentionally deferred. Realtime state lives in memory.

---

# 15. Project Engineering Goal

This project is primarily a serious engineering and learning project.

The objective is to demonstrate the ability to design and build a reasonably complete software system with:

* clear requirements
* maintainable architecture
* good backend design
* PostgreSQL data modeling
* realtime communication
* validation
* error handling
* security considerations
* testing
* documentation
* version control
* issue/backlog management
* deployment
* reasonable production readiness

The project should be capable of handling reasonable real-world usage.

It is **not currently optimized for**:

* millions of users
* global infrastructure
* multi-region deployment
* massive distributed systems
* viral growth
* monetization
* sophisticated recommendation systems

These may be future extensions rather than V1 requirements.

---

# 16. Explicit Non-Goals for V1

The following are not currently part of the initial product:

* Permanent user accounts
* User profiles
* Friend system
* Followers
* Direct messaging
* Voice communication
* Video communication
* File sharing
* Complex recommendation engine
* Large-scale distributed infrastructure
* Monetization
* Social-growth optimization

These may be reconsidered later, but should not influence the initial architecture unnecessarily.

---

# 17. Important Open Decisions

Legend: **[decided]** the implementation has settled it, **[partial]** partly settled, **[open]** still undecided.

## Participant

1. What exactly defines a participant session? **[decided]** The lifetime of the `userCredential` cookie (see 6 for the 24 h / 30 day mismatch to resolve).
2. How is a temporary participant identity generated? **[decided]** Random 128-bit ID, signed with HMAC-SHA256, delivered as a cookie.
3. Can a participant reconnect? **[decided]** Yes, while the cookie is valid. Reconnecting keeps the same ID and username.
4. How long does a disconnected identity remain valid? **[partial]** Until the cookie expires. The server keeps no per-connection state after a socket closes.
5. Can multiple browser tabs share one identity? **[decided]** Yes.
6. Can one participant have multiple simultaneous connections? **[decided]** Yes. A per-user cap of 5 is specified but not enforced yet.
7. Does a participant have the same anonymous name in every conversation? **[decided]** Yes.
8. What information, if any, is retained after a session ends? **[partial]** The `anonymous_users` row (`user_id`, `username`) is kept indefinitely. There is no cleanup job. Whether that is acceptable for a "temporary" identity is **[open]**.

## Conversations

9. What exactly makes a conversation active? **[open]**
10. When is a conversation considered inactive? **[open]**
11. When does a conversation expire? **[open]** Rooms currently never expire.
12. Does an empty conversation remain available? **[decided]** Yes, the database row stays. (The in-memory set of connections is dropped when the last socket leaves.)
13. Can conversations be reopened? **[open]**
14. Can any participant delete/close a conversation? **[open]** Not implemented.
15. Does the creator have special privileges? **[partial]** The creator is stored as a moderator, but no privilege is enforced.
16. Can participants be removed or muted? **[open]** Not implemented.
17. Can a participant join every conversation? **[partial]** Every public room is joinable. Private-room access is not built.

## Messages

18. Are messages permanently retained for the lifetime of a conversation? **[open]** Currently not stored at all (see 10).
19. Can messages be edited? **[open]**
20. Can participants delete their own messages? **[open]**
21. Can moderators delete messages? **[open]**
22. What happens to messages when a conversation expires? **[open]**
23. What ordering guarantee do messages have? **[partial]** Messages carry a server-assigned timestamp and are delivered in the order the server processes them, within one server process.

## Discovery

24. What exactly appears on the homepage? **[decided for now]** An introduction and a Get Started button. Discovery lives on `/room`.
25. How are active conversations ranked? **[open]**
26. How does search work? **[open]** Not implemented.
27. How are tags defined? **[open]** Not implemented.
28. Can a newly created conversation be immediately discoverable? **[decided]** Yes, if public.
29. What happens to conversations with no participants? **[open]** They stay listed.

## Moderation / Abuse

30. How can abusive participants be handled without permanent identities? **[open]**
31. What can be rate-limited? **[open]** An error code for rate limiting exists in the protocol; no limiter is implemented.
32. Who can moderate a conversation? **[open]**
33. What happens when someone repeatedly reconnects to evade restrictions? **[open]** Clearing cookies yields a fresh identity.
34. What information can the system temporarily retain for abuse prevention? **[open]**

## New questions raised by the implementation

35. Should the broadcast include the sender's internal participant ID? It is currently sent with every message, and it is stable across rooms, so other participants could link one anonymous person's activity across conversations. A per-room or per-message identifier may be preferable.
36. Should the 24 h cookie lifetime and the 30-day credential expiry be aligned?
37. Should the `anonymous_users` table be pruned?

These questions should be answered deliberately rather than implicitly through implementation.

---

# 18. Current Product Definition

At the current stage, the product can be summarized as:

> **A conversation-centric anonymous communication platform where people can temporarily participate in topic-based conversations without creating permanent identities.**

The fundamental model is:

```text
Temporary Participant
        │
        │ joins
        ▼
    Conversation
        │
        │ contains
        ▼
      Messages
```

The participant is temporary.

The conversation provides the social context.

Messages belong to the conversation rather than the lifetime of the participant.

The platform's job is to make it easy for anonymous participants to discover, join, create, and participate in conversations while minimizing unnecessary persistent identity.

---

## Document Status

This document is intentionally incomplete.

An unresolved decision is preferable to an undocumented assumption.

Before implementation of a feature begins, the related open decisions should be reviewed and either:

1. resolved in this document,
2. moved into a technical/design decision document, or
3. explicitly deferred to a later version.

Changes to fundamental product principles should be documented rather than silently changing the implementation.