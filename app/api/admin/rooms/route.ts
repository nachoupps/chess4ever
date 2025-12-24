import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    const rooms = await db.getRooms();
    return NextResponse.json(rooms);
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { id, pin } = body;

        if (pin !== "0000") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await db.deleteRoom(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
