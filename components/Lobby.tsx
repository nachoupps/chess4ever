"use client";

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Room {
    id: string;
    name: string;
    whiteName: string | null;
    blackName: string | null;
}

interface Player {
    id: string;
    name: string;
    alo: number;
}

export default function Lobby({ player, onJoinRoom, onLogout }: { player: Player, onJoinRoom: (room: { id: string }, color: 'w' | 'b' | 'spectator') => void, onLogout: () => void }) {
    const { data: rooms, error, mutate } = useSWR<Room[]>('/api/rooms', fetcher, { refreshInterval: 2000 });
    const [newRoomName, setNewRoomName] = useState("");
    const [creating, setCreating] = useState(false);

    async function createRoom(e: React.FormEvent) {
        e.preventDefault();
        if (!newRoomName) return;
        setCreating(true);
        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRoomName, playerId: player.id })
            });
            if (res.ok) {
                setNewRoomName("");
                mutate(); // refresh list
            }
        } finally {
            setCreating(false);
        }
    }

    async function joinRoom(roomId: string, color: 'w' | 'b') {
        try {
            const res = await fetch(`/api/rooms/${roomId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: player.id, color })
            });
            if (res.ok) {
                onJoinRoom({ id: roomId }, color);
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch {
            alert("Failed to join");
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center glass-panel p-6 rounded-xl">
                <div>
                    <h2 className="text-2xl font-bold text-white">Welcome, {player.name}</h2>
                    <p className="text-secondary font-mono">ALO Rating: {player.alo}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onLogout}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg text-red-300 transition-colors"
                    >
                        Logout
                    </button>
                    <form onSubmit={createRoom} className="flex gap-2">
                        <input
                            value={newRoomName}
                            onChange={e => setNewRoomName(e.target.value)}
                            placeholder="New Room Name"
                            className="px-4 py-2 rounded-lg bg-black/30 border border-white/10"
                        />
                        <button
                            type="submit"
                            disabled={creating}
                            className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-lg font-bold text-black transition-colors"
                        >
                            Create
                        </button>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms?.map(room => (
                    <div key={room.id} className="glass-panel p-6 rounded-xl border-l-4 border-l-accent hover:border-l-primary transition-all">
                        <h3 className="text-xl font-bold text-white mb-4">{room.name}</h3>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">White</span>
                                {room.whiteName ? (
                                    <span className="font-bold text-white">{room.whiteName}</span>
                                ) : (
                                    <button onClick={() => joinRoom(room.id, 'w')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs">Join</button>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Black</span>
                                {room.blackName ? (
                                    <span className="font-bold text-white">{room.blackName}</span>
                                ) : (
                                    <button onClick={() => joinRoom(room.id, 'b')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs">Join</button>
                                )}
                            </div>
                        </div>

                        {(room.whiteName && room.blackName) && (
                            <button onClick={() => onJoinRoom(room, 'spectator')} className="w-full py-2 border border-white/10 rounded text-sm hover:bg-white/5">Spectate</button>
                        )}
                    </div>
                ))}
                {rooms?.length === 0 && (
                    <p className="text-gray-500 text-center col-span-full py-12">No active rooms. Create one to start!</p>
                )}
            </div>
        </div>
    );
}
