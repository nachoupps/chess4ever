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
        const { playerId, action } = body; // action: 'offer_draw' | 'accept_draw' | 'decline_draw' | 'resign'

        const room = await db.getRoom(roomId);
        if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

        // Verify player is in the game
        if (room.whiteId !== playerId && room.blackId !== playerId) {
            return NextResponse.json({ error: "You are not a player in this game" }, { status: 403 });
        }

        switch (action) {
            case 'offer_draw':
                room.drawOfferedBy = playerId;
                break;

            case 'accept_draw':
                if (room.drawOfferedBy && room.drawOfferedBy !== playerId) {
                    room.winner = 'draw';
                    room.drawOfferedBy = null;
                } else {
                    return NextResponse.json({ error: "No draw offer to accept" }, { status: 400 });
                }
                break;

            case 'decline_draw':
                room.drawOfferedBy = null;
                break;

            case 'resign':
                room.resignedBy = playerId;
                // Determine winner
                if (playerId === room.whiteId) {
                    room.winner = 'black';
                } else {
                    room.winner = 'white';
                }
                break;

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        await db.saveRoom(room);
        return NextResponse.json({ success: true, room });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
