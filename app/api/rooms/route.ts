import { NextResponse } from 'next/server';
import { db, Room } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const roomsRaw = await db.getRooms();
    // Get all player names involved
    const playerIds = new Set<string>();
    roomsRaw.forEach(r => {
        if (r.whiteId) playerIds.add(r.whiteId);
        if (r.blackId) playerIds.add(r.blackId);
    });

    // Actually we need to fetch players individually or if we had mget logic exposed.
    // For now let's just fetch individual players if needed or rely on memory fallback speed.
    // Ideally, getPlayers() returns all.
    const allPlayers = await db.getPlayers();
    const playerMap = new Map(allPlayers.map(p => [p.id, p.name]));

    const rooms = roomsRaw.map(room => ({
        ...room,
        whiteName: room.whiteId ? playerMap.get(room.whiteId) : null,
        blackName: room.blackId ? playerMap.get(room.blackId) : null,
    }));

    return NextResponse.json(rooms);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, playerId } = body;

        if (!name || !playerId) {
            return NextResponse.json({ error: "Missing name or creator" }, { status: 400 });
        }

        const newRoom: Room = {
            id: uuidv4(),
            name,
            whiteId: null,
            blackId: null,
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            pgn: "",
            turn: 'w',
            lastMove: null,
            createdAt: Date.now(),
            drawOfferedBy: null,
            resignedBy: null,
            winner: null,
            chat: []
        };

        await db.saveRoom(newRoom);
        return NextResponse.json(newRoom);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
