import { kv } from '@vercel/kv';

// Types
export interface Player {
    id: string;
    name: string;
    pin: string; // Stored as string to keep leading zeros
    alo: number;
}

export interface ChatMessage {
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
}

export interface Room {
    id: string;
    name: string;
    whiteId: string | null;
    blackId: string | null;
    fen: string;
    pgn: string;
    turn: 'w' | 'b';
    lastMove: string | null;
    createdAt: number;
    drawOfferedBy: string | null; // playerId who offered draw
    resignedBy: string | null; // playerId who resigned
    winner: string | null; // 'white' | 'black' | 'draw' | null
    chat: ChatMessage[];
}

// In-memory fallback
const memPlayers = new Map<string, Player>();
const memRooms = new Map<string, Room>();

const isKvEnabled = !!process.env.KV_REST_API_URL;

export const db = {
    // --- Players ---
    async getPlayers(): Promise<Player[]> {
        if (!isKvEnabled) return Array.from(memPlayers.values());
        try {
            const keys = await kv.keys('player:*');
            if (keys.length === 0) return [];
            // kv.mget returns array of values
            const players = await kv.mget<Player[]>(...keys);
            return players.filter((p): p is Player => !!p).sort((a, b) => b.alo - a.alo);
        } catch (e) { console.error(e); return []; }
    },

    async getPlayer(id: string): Promise<Player | null> {
        if (!isKvEnabled) return memPlayers.get(id) || null;
        return await kv.get<Player>(`player:${id}`);
    },

    async createPlayer(player: Player): Promise<void> {
        if (!isKvEnabled) { memPlayers.set(player.id, player); return; }
        await kv.set(`player:${player.id}`, player);
    },

    async deletePlayer(id: string): Promise<void> {
        if (!isKvEnabled) { memPlayers.delete(id); return; }
        await kv.del(`player:${id}`);
    },

    // --- Rooms ---
    async getRooms(): Promise<Room[]> {
        if (!isKvEnabled) return Array.from(memRooms.values());
        try {
            const keys = await kv.keys('room:*');
            if (keys.length === 0) return [];
            const rooms = await kv.mget<Room[]>(...keys);
            return rooms.filter((r): r is Room => !!r).sort((a, b) => b.createdAt - a.createdAt);
        } catch (e) { console.error(e); return []; }
    },

    async getRoom(id: string): Promise<Room | null> {
        if (!isKvEnabled) return memRooms.get(id) || null;
        return await kv.get<Room>(`room:${id}`);
    },

    async saveRoom(room: Room): Promise<void> {
        if (!isKvEnabled) { memRooms.set(room.id, room); return; }
        await kv.set(`room:${room.id}`, room);
    },

    async deleteRoom(id: string): Promise<void> {
        if (!isKvEnabled) { memRooms.delete(id); return; }
        await kv.del(`room:${id}`);
    },

    // --- Admin ---
    async debugClearAll(): Promise<void> {
        if (!isKvEnabled) {
            memPlayers.clear();
            memRooms.clear();
            return;
        }
        await kv.flushall();
    }
};
