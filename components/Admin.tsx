"use client";

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Player {
    id: string;
    name: string;
    alo: number;
}

interface Room {
    id: string;
    name: string;
    createdAt: number;
}

export default function AdminConsole({ onClose }: { onClose: () => void }) {
    const [pin, setPin] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Data
    const { data: players, mutate: mutatePlayers } = useSWR<Player[]>(isAuthenticated ? '/api/admin/players' : null, fetcher);
    const { data: rooms, mutate: mutateRooms } = useSWR<Room[]>(isAuthenticated ? '/api/admin/rooms' : null, fetcher);

    function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        if (pin === "0000") {
            setIsAuthenticated(true);
        } else {
            alert("Invalid PIN");
        }
    }

    async function deletePlayer(id: string) {
        if (!confirm("Are you sure?")) return;
        await fetch('/api/admin/players', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, pin: "0000" }) // sending pin again for security on server if implementd
        });
        mutatePlayers();
    }

    async function deleteRoom(id: string) {
        if (!confirm("Are you sure?")) return;
        await fetch('/api/admin/rooms', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, pin: "0000" })
        });
        mutateRooms();
    }

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="glass-panel p-8 rounded-xl w-full max-w-sm relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400">X</button>
                    <h2 className="text-xl font-bold mb-4">Admin Access</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            className="w-full p-2 rounded bg-black/50 border border-white/10"
                            placeholder="Enter PIN"
                        />
                        <button className="w-full py-2 bg-red-600 rounded text-white font-bold">Access</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 overflow-y-auto">
            <div className="w-full max-w-4xl p-8 space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-red-500">Admin Console</h2>
                    <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded">Close</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="glass-panel p-6 rounded-xl">
                        <h3 className="text-xl font-bold mb-4">Players</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {players?.map(p => (
                                <div key={p.id} className="flex justify-between items-center bg-white/5 p-2 rounded">
                                    <span>{p.name} ({p.alo})</span>
                                    <button onClick={() => deletePlayer(p.id)} className="text-red-400 text-sm hover:underline">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-xl">
                        <h3 className="text-xl font-bold mb-4">Active Rooms</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {rooms?.map(r => (
                                <div key={r.id} className="flex justify-between items-center bg-white/5 p-2 rounded">
                                    <span>{r.name}</span>
                                    <button onClick={() => deleteRoom(r.id)} className="text-red-400 text-sm hover:underline">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
