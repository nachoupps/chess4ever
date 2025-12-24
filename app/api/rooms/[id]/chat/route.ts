import { NextResponse } from 'next/server';
import { db, ChatMessage } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const roomId = resolvedParams.id;
        const body = await request.json();
        const { playerId, message } = body;

        if (!message || message.trim().length === 0) {
            return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
        }

        const room = await db.getRoom(roomId);
        if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

        // Get player name
        const player = await db.getPlayer(playerId);
        if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

        const chatMessage: ChatMessage = {
            id: uuidv4(),
            playerId,
            playerName: player.name,
            message: message.trim().substring(0, 200), // Limit message length
            timestamp: Date.now()
        };

        room.chat.push(chatMessage);

        // Keep only last 50 messages
        if (room.chat.length > 50) {
            room.chat = room.chat.slice(-50);
        }

        await db.saveRoom(room);
        return NextResponse.json({ success: true, message: chatMessage });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
