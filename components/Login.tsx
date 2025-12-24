"use client";

import { useState } from "react";
import useSWR from 'swr';

interface Player {
    id: string;
    name: string;
    alo: number;
    pin: string;
}

const fetcher = async (url: string) => {
    try {
        const res = await fetch(url, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
        });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
};

export default function Login({ onLogin }: { onLogin: (player: Player) => void }) {
    const [mode, setMode] = useState<'select' | 'new'>('select');
    const [selectedPlayerId, setSelectedPlayerId] = useState("");
    const [pin, setPin] = useState("");
    const [newName, setNewName] = useState("");
    const [newPin, setNewPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { data: players, isLoading, error: swrError } = useSWR('/api/admin/players', fetcher, {
        refreshInterval: 2000,
        revalidateOnFocus: true,
        revalidateOnMount: true,
        revalidateIfStale: true,
        dedupingInterval: 500, // Reduced to fetch more aggressively
        fallbackData: [],
        keepPreviousData: false, // Changed to false to always show fresh data
        suspense: false,
        shouldRetryOnError: true,
        errorRetryCount: 3
    });

    // Debug logging
    console.log('Login - Players data:', players);
    console.log('Login - Is loading:', isLoading);
    console.log('Login - SWR Error:', swrError);

    async function handleExistingLogin(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedPlayerId || !pin) {
            setError("Please select a player and enter PIN");
            return;
        }

        setLoading(true);
        setError("");

        const player = players?.find((p: Player) => p.id === selectedPlayerId);
        if (!player) {
            setError("Player not found");
            setLoading(false);
            return;
        }

        if (player.pin !== pin) {
            setError("Incorrect PIN");
            setLoading(false);
            return;
        }

        onLogin(player);
    }

    async function handleNewUser(e: React.FormEvent) {
        e.preventDefault();
        if (!newName || !newPin) {
            setError("Please enter name and PIN");
            return;
        }

        if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
            setError("PIN must be 4 digits");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, pin: newPin })
            });

            if (res.ok) {
                const newPlayer = await res.json();
                onLogin(newPlayer);
            } else {
                const err = await res.json();
                setError(err.error || "Registration failed");
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="glass-panel p-8 rounded-xl w-full max-w-md">
            <h2 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                Welcome to Chess
            </h2>
            <p className="text-gray-400 text-center mb-6 text-sm">Family Chess Platform</p>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => {
                        setMode('select');
                        setError("");
                    }}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'select'
                        ? 'bg-primary text-black'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                >
                    Existing Player
                </button>
                <button
                    onClick={() => {
                        setMode('new');
                        setError("");
                    }}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'new'
                        ? 'bg-primary text-black'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                >
                    New Player
                </button>
            </div>

            {mode === 'select' ? (
                <form onSubmit={handleExistingLogin} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">
                            Select Player {players && players.length > 0 && `(${players.length} available)`}
                        </label>
                        <select
                            value={selectedPlayerId}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white"
                            required
                            disabled={isLoading}
                        >
                            <option value="">
                                {isLoading ? '⏳ Loading players...' :
                                    players && players.length > 0 ? 'Choose a player...' :
                                        '⚠️ No players found - Create one first'}
                            </option>
                            {players && players.length > 0 && players.map((p: Player) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (ALO: {p.alo})
                                </option>
                            ))}
                        </select>
                        {!isLoading && (!players || players.length === 0) && (
                            <p className="text-yellow-500 text-xs mt-2">
                                💡 No players registered yet. Switch to &quot;New Player&quot; to create one.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-2">PIN</label>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Enter your 4-digit PIN"
                            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white"
                            maxLength={4}
                            pattern="\d{4}"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleNewUser} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Your Name</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white"
                            maxLength={20}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Create PIN (4 digits)</label>
                        <input
                            type="password"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="Create a 4-digit PIN"
                            className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white"
                            maxLength={4}
                            pattern="\d{4}"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create Player"}
                    </button>
                </form>
            )}

            <p className="text-gray-500 text-xs text-center mt-4">
                {players?.length || 0} player{players?.length !== 1 ? 's' : ''} registered
            </p>
        </div>
    );
}
