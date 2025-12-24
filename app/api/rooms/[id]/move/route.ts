import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Chess } from 'chess.js';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const roomId = resolvedParams.id;
        const body = await request.json();
        const { playerId, move } = body;

        const room = await db.getRoom(roomId);
        if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

        // Validate turn
        if (room.turn === 'w' && room.whiteId !== playerId) {
            return NextResponse.json({ error: "Not your turn (You are not White)" }, { status: 403 });
        }
        if (room.turn === 'b' && room.blackId !== playerId) {
            return NextResponse.json({ error: "Not your turn (You are not Black)" }, { status: 403 });
        }

        // Validate move logic
        const game = new Chess(room.fen);

        // Attempt move
        try {
            const result = game.move(move);
            if (!result) throw new Error("Invalid move");

            // Update room
            room.fen = game.fen();
            room.turn = game.turn();
            room.lastMove = result.san;
            room.pgn = game.pgn();

            await db.saveRoom(room);
            return NextResponse.json({ success: true, fen: room.fen, turn: room.turn });
        } catch (e) {
            return NextResponse.json({ error: "Invalid Move" }, { status: 400 });
        }

    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const roomId = resolvedParams.id;
    const room = await db.getRoom(roomId);
    if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Enrich with names
    let whiteName = null;
    let blackName = null;
    if (room.whiteId) {
        const p = await db.getPlayer(room.whiteId);
        whiteName = p?.name;
    }
    if (room.blackId) {
        const p = await db.getPlayer(room.blackId);
        blackName = p?.name;
    }

    const enriched = {
        ...room,
        whiteName,
        blackName,
    };
    return NextResponse.json(enriched);
}
