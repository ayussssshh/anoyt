import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import cors from "cors";
import cookieParser from "cookie-parser";

import User_Router from "./routes/User_Router.js";
import rooms_Router from "./routes/rooms_Router.js";

export function buildApp() {
    const app = express();

    app.use(cookieParser());

    // Only needed in local dev, where the frontend runs on another port.
    app.use(
        cors({
            origin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").replace(/\/+$/, ""),
            credentials: true
        })
    );
    app.use(express.json());

    app.use("/api/Users", User_Router);
    app.use("/api/rooms", rooms_Router);

    // Unknown /api paths return JSON, not the React page.
    app.use("/api", (_req, res) => {
        res.status(404).json({ success: false, massage: "Not found", data: null });
    });

    // Serve the built frontend. Compiled file lives at backend/dist/app.js.
    const frontendDist =
        process.env.FRONTEND_DIST ??
        path.resolve(import.meta.dirname, "../../frontend/dist");

    if (existsSync(frontendDist)) {
        app.use(express.static(frontendDist));

        // SPA fallback: /room/abc must return index.html, not 404.
        app.get("/{*splat}", (_req, res) => {
            res.sendFile(path.join(frontendDist, "index.html"));
        });
    }

    return app;
}