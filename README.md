# Anonymous Conversation Platform (anoyt)

A real-time, anonymous, topic-oriented communication platform.

**Current version: v1.0.0.** This is the first deployed release. It is live on Render and works end to end, but it still needs polishing (see Status).

The core idea is simple:

> **People should be able to communicate around ideas and conversations without needing to establish a permanent identity.**

Participants enter the platform without traditional user accounts. They receive temporary identities, discover or create conversations, and communicate with other anonymous participants through those conversations.

The project is being developed as a serious full-stack engineering project, with emphasis on:

* Backend architecture
* Realtime communication
* Anonymous session management
* PostgreSQL data modeling
* API design
* Security and abuse considerations
* Testing
* Documentation
* Project and backlog management
* Maintainable code

## Technology

### Frontend

* TypeScript, React 19, Vite
* `react-router-dom` for routing
* `axios` for HTTP calls (always with credentials, so the identity cookie is sent)
* Plain CSS per page/component

### Backend

* TypeScript (ESM), Express 5
* `ws` for WebSockets, on the same HTTP server as Express
* `pino` for logging
* `cookie-parser` and `cors`

### Database

* PostgreSQL, hosted on Neon (accessed with `pg`)
* Tables in use: `room_list`, `room_members`, `anonymous_users`

### Hosting

Frontend and backend both run on Render's free tier, as a single web service. The database is on Neon.

```text
Browser
   │
   ▼
Render web service (one Node process)
   ├── /api/*  → Express routes
   ├── /ws     → WebSocket server
   └── anything else → the built React app (frontend/dist)
              │
              ▼
        Neon (PostgreSQL)
```

One service serves the frontend, the API, and the WebSocket from a single address, so the browser sees one origin. That keeps the identity cookie first-party and means production needs no CORS. Details are in `docs/WEBSOCKET_ARCHITECTURE.md` and the Deployment section below.

## Core Product Model

The application is **conversation-centric rather than identity-centric**.

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

Participants:

* do not create traditional accounts
* receive temporary identities (a signed cookie plus a random username)
* can participate in multiple conversations
* are not represented by permanent social profiles

Conversations:

* are topic-oriented
* can be public (listed, anyone can join) or private
* can be created by participants
* contain messages
* have their own lifecycle

Messages belong to conversations rather than depending on the continued existence of their sender.

## Project Scope

The initial goal is **not** to build a massive social network or optimize for millions of users.

The goal is to build a reasonably robust system that demonstrates good software engineering and can handle meaningful real-world usage.

Large-scale concerns such as:

* multi-region infrastructure
* massive distributed systems
* sophisticated recommendation engines
* monetization
* large-scale growth

are intentionally outside the initial scope.

They may be considered as future extensions.

## Development Philosophy

The project is developed in stages:

```text
Product Definition
        ↓
Requirements
        ↓
System Design
        ↓
Data Model
        ↓
API / Realtime Design
        ↓
Implementation        ← current stage
        ↓
Testing
        ↓
Deployment            ← first deployment is live (free tier)
        ↓
Iteration
```

Important product and technical decisions are documented rather than being silently introduced through implementation.

The project also maintains a structured backlog so that features, technical improvements, bugs, and future ideas remain separate from the current development scope.

## Repository Layout

```text
anoyt/
├── frontend/   React + Vite app
│   └── src/
│       ├── pages/        HomePage, RoomsPage (room list), CreateRoomPage, RoomChatPage
│       ├── components/   Header, RoomCard, RoomTopBar, ChatMsg, RoomMsgSend, AnoytLogo
│       └── modules/      Apis.ts (axios instance)
└── backend/    Express + WebSocket server
    └── src/
        ├── routes/ controllers/ repositories/   HTTP API
        ├── module/       credential signing, username generation
        ├── websocket/    realtime layer
        └── lib/ config/  logger, response helper, base conversion, DB pool
```

## Running Locally

Backend (`backend/.env`):

```text
DATABASE_URL=postgresql://...        # Neon or local Postgres
ANON_ID_SECRET=<long random string>  # required, the server refuses to start without it
PORT=3000
```

Frontend (`frontend/.env.development`):

```text
VITE_API_URL=/api
```

In `frontend/vite.config.ts`, the dev server proxies `/api` and `/ws` to the backend, so local development uses the same relative URLs as production:

```ts
server: { proxy: {
  "/api": "http://localhost:3000",
  "/ws": { target: "ws://localhost:3000", ws: true },
}}
```

Run `npm run dev` in `backend/` and in `frontend/`. The frontend is on port 5173 and the backend on port 3000. (`CORS_ORIGIN` is only needed if you call the API from a different origin without the proxy.)

## Deployment

One Render web service, created from the repository root, serves everything.

* **Build command:** `cd frontend && npm ci --include=dev && npm run build && cd ../backend && npm ci --include=dev && npm run build`
* **Start command:** `cd backend && npm start`
* **Environment variables:** `DATABASE_URL` (Neon), `ANON_ID_SECRET`, `NODE_ENV=production`, `NODE_VERSION` (20.11 or newer), `VITE_API_URL=/api`. Optionally `FRONTEND_DIST` to override where the server looks for the built frontend.
* **How it serves the app:** Express registers the `/api` routes first, then serves `frontend/dist` as static files, with a fallback to `index.html` so client-side routes such as `/room/:id` survive a refresh. Unknown `/api/...` paths return a JSON 404.
* **Keep-alive:** `GET /api/ping` returns `ok` without touching the database. An external monitor can call it about every 10 minutes to stop the free instance from sleeping.
* **Database:** Neon. Use its connection string as `DATABASE_URL`.

Things that caught us out and are worth remembering:

* `npm ci` skips devDependencies when `NODE_ENV=production`, so the build command uses `--include=dev` (TypeScript and the `@types/*` packages are dev dependencies).
* `VITE_API_URL` is baked into the frontend at build time. Changing it requires a new build.
* `tsc -b` in the frontend fails the whole build on any type error. Run `npm run build` locally first.

Free-tier notes: the Render instance spins down when idle (the whole site then takes about a minute to wake) and can restart at any time, which drops open WebSockets. All realtime state is in memory (see `docs/WEBSOCKET_ARCHITECTURE.md`), so clients must be able to reconnect. Render's free plan also has a monthly allowance of instance hours, so watch usage if a monitor keeps the service awake.

## Documentation

| Document | Contents |
| --- | --- |
| `docs/PRODUCT.md` | Product definition, philosophy, open decisions, and what is implemented |
| `docs/Room_Creation_Public___Private_Rooms.md` | Room types, creator privileges, current behavior and gaps |
| `docs/WEBSOCKET_ARCHITECTURE.md` | Rules of the WebSocket layer, with implementation status |

These are living documents. Unresolved questions are explicitly marked rather than being converted into accidental implementation decisions.

## Status

**Current version: v1.0.0, deployed on Render. Still needs polishing.**

Working today: anonymous session creation, public room list, room creation (public/private flag), realtime chat in a room over WebSocket, and deployment of frontend and backend together on Render.

Needs polishing before it can be called finished:

* known bugs, such as the create-room request never responding, unknown room IDs breaking the WebSocket handshake, and private rooms being unreachable (the full list is in `docs/Room_Creation_Public___Private_Rooms.md` and `docs/WEBSOCKET_ARCHITECTURE.md`)
* the UI shows placeholder values (online counts, room name in the chat top bar) and does not surface errors or connection loss
* the client does not reconnect after a dropped connection

Not built yet: private-room access, presence (online counts), message history, moderation, rate limiting, tests.