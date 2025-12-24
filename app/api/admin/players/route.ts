import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    const players = await db.getPlayers();
    return NextResponse.json(players);
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { id, pin } = body;

        if (pin !== "0000") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await db.deletePlayer(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
