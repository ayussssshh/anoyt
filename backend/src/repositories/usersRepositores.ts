import e from "express";
import { pool } from "../config/database.js";
import logger from "../lib/logger.js";
import type { Pool, PoolClient } from "pg"

export async function mapUserIdtoUsername(userId: string, username: string) {

    try {

        const result = await pool.query(`INSERT INTO anonymous_users (user_id, username) VALUES ($1, $2) RETURNING user_id , username`, [userId, username])

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].username

    } catch (error) {
        logger.error(error)
    }

}


export async function getUsernamebyUID(
    userId: string
): Promise<string | null> {

    try {
        const result = await pool.query(
            `SELECT username
             FROM anonymous_users
             WHERE user_id = $1
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].username;

    } catch (error) {
        logger.error(error);
        return null;
    }
}



export async function removeUser(userId: string) {

    try {

        const result = await pool.query(`DELETE FROM anonymous_users WHERE user_id = $1`, [userId])

        return true

    } catch (error) {
        logger.error(error)
        return false
    }

}




export async function removeRoom(roomId: string | number, db: Pool | PoolClient = pool) {

    try {

        const result = await db.query(`DELETE FROM room_list WHERE room_id = $1`, [roomId])

        if (result.rowCount == 1) {
            return true
        } else {
            return false
        }

    } catch (error) {
        logger.error(error)
        return false
    }

}

export async function removeUserFromRooms(userId: string) {

    const client = await pool.connect()

    try {

        await client.query("BEGIN")

        // rooms where this user is a moderator
        const moderated = await client.query(
            `SELECT room_id FROM room_members WHERE user_id = $1 AND is_moderator = true`,
            [userId]
        )

        // deleting a room cascades to its room_members rows
        for (const row of moderated.rows) {
            const removed = await removeRoom(row.room_id, client)
            if (!removed) {
                throw new Error(`Failed to remove room ${row.room_id}`)
            }
        }

        // remaining memberships (rooms where the user was a normal member)
        await client.query(`DELETE FROM room_members WHERE user_id = $1`, [userId])

        await client.query("COMMIT")
        return true

    } catch (error) {
        await client.query("ROLLBACK")
        logger.error(error)
        return false
    } finally {
        client.release()
    }

}