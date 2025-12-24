"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import useSWR from 'swr';

const fetcher = async (url: string) => {
    const res = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) {
        console.error(`Fetch error for ${url}:`, res.status);
        return null;
    }
    return res.json();
};

interface GameProps {
    roomId: string;
    player: { id: string; name: string } | null;
    color: 'w' | 'b' | 'spectator';
    onExit: () => void;
}

export default function Game({ roomId, player, color, onExit }: GameProps) {
    const { data: roomState, mutate } = useSWR(
        roomId ? `/api/rooms/${roomId}/move` : null,
        fetcher,
        {
            refreshInterval: 1000,
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 500,
            errorRetryCount: 5,
            errorRetryInterval: 2000,
            keepPreviousData: true,
            fallbackData: null
        }
    );

    const game = useMemo(() => {
        if (roomState && roomState.fen) {
            return new Chess(roomState.fen);
        }
        return new Chess();
    }, [roomState]);

    const [chatMessage, setChatMessage] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [roomState?.chat]);

    function onDrop(sourceSquare: string, targetSquare: string) {
        if (game.turn() !== color) return false;
        if (roomState?.winner) return false; // Game over

        try {
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q",
            });
            if (!move) return false;

            if (!move) return false;

            fetch(`/api/rooms/${roomId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerId: player?.id,
                    move: { from: sourceSquare, to: targetSquare, promotion: 'q' }
                })
            }).then(res => {
                if (!res.ok) mutate();
            });

            return true;
        } catch (e) {
            return false;
        }
    }

    async function handleAction(action: string) {
        if (!player) return;
        await fetch(`/api/rooms/${roomId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: player.id, action })
        });
        mutate();
    }

    async function sendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!chatMessage.trim() || !player) return;

        await fetch(`/api/rooms/${roomId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: player.id, message: chatMessage })
        });

        setChatMessage("");
        mutate();
    }

    const isMyTurn = game.turn() === color;
    const gameOver = roomState?.winner || game.isGameOver();
    const drawOfferedByOpponent = roomState?.drawOfferedBy && player && roomState.drawOfferedBy !== player.id;
    const iOfferedDraw = player && roomState?.drawOfferedBy === player.id;

    let gameStatus = "Playing";
    if (roomState?.winner === 'draw') gameStatus = "Draw";
    else if (roomState?.winner === 'white') gameStatus = "White Wins!";
    else if (roomState?.winner === 'black') gameStatus = "Black Wins!";
    else if (game.isCheckmate()) gameStatus = "Checkmate!";
    else if (game.isDraw()) gameStatus = "Draw";
    else if (isMyTurn) gameStatus = "Your Turn";
    else gameStatus = "Opponent's Turn";

    return (
        <div className="flex flex-col lg:flex-row items-start justify-center w-full gap-6 max-w-7xl mx-auto">
            {/* Board */}
            <div className="w-full max-w-[600px] space-y-4">
                <div className="glass-panel p-4 rounded-xl relative">
                    <Chessboard
                        position={game.fen()}
                        onPieceDrop={onDrop}
                        arePiecesDraggable={!gameOver && isMyTurn}
                        boardOrientation={color === 'b' ? 'black' : 'white'}
                        customDarkSquareStyle={{ backgroundColor: "var(--board-dark)" }}
                        customLightSquareStyle={{ backgroundColor: "var(--board-light)" }}
                        customBoardStyle={{
                            borderRadius: "4px",
                            boxShadow: "0 5px 15px rgba(0, 0, 0, 0.5)",
                        }}
                    />
                    {!isMyTurn && !gameOver && (
                        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded text-xs backdrop-blur-md">
                            Waiting...
                        </div>
                    )}
                </div>

                {/* Game Actions */}
                {!gameOver && color !== 'spectator' && (
                    <div className="glass-panel p-4 rounded-xl">
                        <div className="flex gap-2 flex-wrap">
                            {!iOfferedDraw && !drawOfferedByOpponent && (
                                <button
                                    onClick={() => handleAction('offer_draw')}
                                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded-lg text-blue-300 transition-colors text-sm"
                                >
                                    Offer Draw
                                </button>
                            )}

                            {iOfferedDraw && (
                                <div className="px-4 py-2 bg-blue-600/20 border border-blue-500/50 rounded-lg text-blue-300 text-sm">
                                    Draw offered (waiting...)
                                </div>
                            )}

                            {drawOfferedByOpponent && (
                                <>
                                    <button
                                        onClick={() => handleAction('accept_draw')}
                                        className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 rounded-lg text-green-300 transition-colors text-sm"
                                    >
                                        Accept Draw
                                    </button>
                                    <button
                                        onClick={() => handleAction('decline_draw')}
                                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg text-red-300 transition-colors text-sm"
                                    >
                                        Decline
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to resign?")) {
                                        handleAction('resign');
                                    }
                                }}
                                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg text-red-300 transition-colors text-sm ml-auto"
                            >
                                Resign
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Panel */}
            <div className="flex flex-col gap-4 w-full max-w-[400px]">
                <div className="glass-panel p-6 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                            {roomState?.name || "Loading..."}
                        </h2>
                        <button onClick={onExit} className="text-xs text-gray-400 hover:text-white transition-colors">
                            ← Back to Menu
                        </button>
                    </div>

                    <div className="space-y-3 text-gray-300 bg-black/20 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${game.turn() === 'w' ? 'bg-white shadow-[0_0_10px_white]' : 'bg-gray-600'}`}></div>
                                <span className={game.turn() === 'w' ? 'text-white font-bold' : 'text-gray-500'}>White: {roomState?.whiteName || "..."}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${game.turn() === 'b' ? 'bg-white shadow-[0_0_10px_white]' : 'bg-gray-600'}`}></div>
                                <span className={game.turn() === 'b' ? 'text-white font-bold' : 'text-gray-500'}>Black: {roomState?.blackName || "..."}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center py-3 bg-black/20 rounded-lg">
                        <span className={`text-lg font-bold ${gameOver ? 'text-yellow-400' : (isMyTurn ? 'text-green-400' : 'text-gray-400')}`}>
                            {gameStatus}
                        </span>
                        {game.isCheck() && !gameOver && (
                            <p className="text-red-500 font-bold animate-pulse mt-1 text-sm">CHECK!</p>
                        )}
                    </div>

                    {roomState?.lastMove && (
                        <div className="bg-black/20 p-3 rounded-lg">
                            <p className="text-gray-400 text-xs mb-1">Last Move</p>
                            <p className="text-xl font-mono text-white">{roomState.lastMove}</p>
                        </div>
                    )}
                </div>

                {/* Chat */}
                <div className="glass-panel p-4 rounded-xl flex flex-col h-[400px]">
                    <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">Chat</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 mb-3 custom-scrollbar">
                        {roomState?.chat?.map((msg: { id: string; playerId: string; playerName: string; message: string }) => (
                            <div key={msg.id} className={`p-2 rounded ${player && msg.playerId === player.id ? 'bg-primary/10 ml-4' : 'bg-white/5 mr-4'}`}>
                                <p className="text-xs text-gray-400">{msg.playerName}</p>
                                <p className="text-sm text-white">{msg.message}</p>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <input
                            value={chatMessage}
                            onChange={e => setChatMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-3 py-2 rounded bg-black/30 border border-white/10 text-sm"
                            maxLength={200}
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary hover:bg-primary/80 rounded font-bold text-black text-sm transition-colors"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
