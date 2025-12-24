import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const roomId = resolvedParams.id;
        const body = await request.json();
        const { playerId, color } = body;

        const room = await db.getRoom(roomId); // Async
        if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

        if (color === 'w') {
            if (room.whiteId && room.whiteId !== playerId) {
                return NextResponse.json({ error: "White slot taken" }, { status: 400 });
            }
            room.whiteId = playerId;
        } else if (color === 'b') {
            if (room.blackId && room.blackId !== playerId) {
                return NextResponse.json({ error: "Black slot taken" }, { status: 400 });
            }
            room.blackId = playerId;
        }

        await db.saveRoom(room); // Async
        return NextResponse.json(room);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
