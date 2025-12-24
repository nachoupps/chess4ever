import { NextResponse } from 'next/server';
import { db, Player } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, pin } = body;

        if (!name || !pin || pin.length !== 4 || isNaN(Number(pin))) {
            return NextResponse.json({ error: "Invalid Name or PIN (must be 4 digits)" }, { status: 400 });
        }

        const newPlayer: Player = {
            id: uuidv4(),
            name,
            pin,
            alo: 10,
        };

        await db.createPlayer(newPlayer); // Async now

        return NextResponse.json(newPlayer);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
