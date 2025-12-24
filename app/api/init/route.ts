import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Player, Room } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
    try {
        // Create 10 random players
        const playerNames = [
            'Magnus', 'Hikaru', 'Fabiano', 'Ding', 'Nepo',
            'Alireza', 'Wesley', 'Levon', 'Anish', 'Maxime'
        ];

        const players: Player[] = [];

        for (let i = 0; i < playerNames.length; i++) {
            const player: Player = {
                id: uuidv4(),
                name: playerNames[i],
                pin: String((i + 1) * 1111).padStart(4, '0'), // PINs: 1111, 2222, 3333, etc.
                alo: 10 + Math.floor(Math.random() * 20) // Random ALO between 10-30
            };
            await db.createPlayer(player);
            players.push(player);
        }

        // Create 5 random games with some moves
        const games: Room[] = [];

        for (let i = 0; i < 5; i++) {
            const whitePlayer = players[i * 2];
            const blackPlayer = players[i * 2 + 1];

            // Sample game positions with different move counts
            const sampleGames = [
                {
                    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
                    pgn: '1. e4',
                    lastMove: 'e4'
                },
                {
                    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
                    pgn: '1. e4 e5 2. Nf3',
                    lastMove: 'Nf3'
                },
                {
                    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
                    pgn: '1. e4 e5 2. Nf3 Nc6',
                    lastMove: 'Nc6'
                },
                {
                    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
                    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6',
                    lastMove: 'Nf6'
                },
                {
                    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
                    pgn: '1. e4 e5 2. Nf3 Nf6 3. d3',
                    lastMove: 'd3'
                }
            ];

            const gameData = sampleGames[i];
            const moveCount = gameData.pgn.split('.').length - 1;

            const room: Room = {
                id: uuidv4(),
                name: `Game ${i + 1}: ${whitePlayer.name} vs ${blackPlayer.name}`,
                whiteId: whitePlayer.id,
                blackId: blackPlayer.id,
                fen: gameData.fen,
                pgn: gameData.pgn,
                turn: moveCount % 2 === 0 ? 'w' : 'b',
                lastMove: gameData.lastMove,
                createdAt: Date.now() - (i * 3600000), // Stagger creation times
                drawOfferedBy: null,
                resignedBy: null,
                winner: null,
                chat: [
                    {
                        id: uuidv4(),
                        playerId: whitePlayer.id,
                        playerName: whitePlayer.name,
                        message: 'Good luck!',
                        timestamp: Date.now() - (i * 3600000) + 1000
                    },
                    {
                        id: uuidv4(),
                        playerId: blackPlayer.id,
                        playerName: blackPlayer.name,
                        message: 'You too!',
                        timestamp: Date.now() - (i * 3600000) + 2000
                    }
                ]
            };

            await db.saveRoom(room);
            games.push(room);
        }

        return NextResponse.json({
            success: true,
            message: 'Database initialized successfully',
            players: players.length,
            games: games.length,
            playerList: players.map(p => ({ id: p.id, name: p.name, pin: p.pin, alo: p.alo })),
            gameList: games.map(g => ({ id: g.id, name: g.name }))
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Init error:', error);
        return NextResponse.json(
            { error: message || 'Failed to initialize database' },
            { status: 500 }
        );
    }
}
