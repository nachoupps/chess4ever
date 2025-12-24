"use client";

import { useState, useMemo, useEffect } from "react";
import Login from "@/components/Login";
import Game from "@/components/Game";
import SinglePlayerGame from "@/components/SinglePlayerGame";
import Admin from "@/components/Admin";
import useSWR from 'swr';

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

    if (!res.ok) {
      console.error(`Fetch error for ${url}:`, res.status);
      // Return empty array instead of null to prevent data disappearing
      return [];
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Network error for ${url}:`, error);
    // Return empty array on network error
    return [];
  }
};

interface Player {
  id: string;
  name: string;
  alo: number;
}

interface Room {
  id: string;
  name: string;
  whiteId?: string;
  blackId?: string;
  whiteName?: string;
  blackName?: string;
  fen?: string;
  winner?: string;
  lastMove?: string;
  chat?: { id: string; playerId: string; playerName: string; message: string; timestamp: number }[];
}

export default function Home() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [room, setRoom] = useState<{ id: string } | null>(null);
  const [color, setColor] = useState<'w' | 'b' | 'spectator'>('spectator');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; color: 'w' | 'b' | 'spectator' } | null>(null);

  // Single player states
  const [singlePlayerMode, setSinglePlayerMode] = useState<'computer' | 'learning' | null>(null);
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedColor, setSelectedColor] = useState<'w' | 'b'>('w');

  const { data: playersData, mutate: mutatePlayers, isLoading: playersLoading } = useSWR<Player[]>('/api/admin/players', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false, // Don't revalidate on focus to prevent flashing
    revalidateOnReconnect: true,
    dedupingInterval: 3000,
    errorRetryCount: 5,
    errorRetryInterval: 2000,
    fallbackData: [],
    keepPreviousData: true,
    revalidateOnMount: false, // Don't revalidate on mount if we have data
    suspense: false
  });

  const { data: roomsData, mutate: mutateRooms, isLoading: roomsLoading } = useSWR<Room[]>('/api/rooms', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 3000,
    errorRetryCount: 5,
    errorRetryInterval: 2000,
    fallbackData: [],
    keepPreviousData: true,
    revalidateOnMount: false,
    suspense: false
  });

  const players = playersData || [];
  const rooms = roomsData || [];

  // Use stable references to prevent re-renders
  const topPlayers = useMemo(() =>
    players.length > 0 ? players.slice(0, 10).sort((a, b) => b.alo - a.alo) : []
    , [players]);

  const activeGames = useMemo(() =>
    rooms.length > 0 ? rooms : []
    , [rooms]);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    if (!player) {
      setShowLogin(true);
      return;
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName, playerId: player.id })
      });

      if (res.ok) {
        const newRoom = await res.json();
        setNewRoomName("");
        setShowCreateRoom(false);
        mutateRooms();
        // Auto-join as white
        await joinRoom(newRoom.id, 'w');
      }
    } catch {
      alert("Failed to create room");
    }
  }

  function handleJoinAsPlayer(game: Room, selectedColor: 'w' | 'b') {
    if (!player) {
      setSelectedRoom({ id: game.id, color: selectedColor });
      setShowLogin(true);
    } else {
      joinRoom(game.id, selectedColor);
    }
  }

  async function joinRoom(roomId: string, selectedColor: 'w' | 'b' | 'spectator') {
    if (selectedColor === 'spectator') {
      setRoom({ id: roomId });
      setColor('spectator');
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player?.id, color: selectedColor })
      });

      if (res.ok) {
        setRoom({ id: roomId });
        setColor(selectedColor);
        setSelectedRoom(null);
        mutateRooms();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch {
      alert("Failed to join");
    }
  }

  function handleLoginSuccess(newPlayer: Player) {
    setPlayer(newPlayer);
    setShowLogin(false);
    mutatePlayers();

    if (selectedRoom) {
      joinRoom(selectedRoom.id, selectedRoom.color);
    }
  }

  // Single player mode
  if (singlePlayerMode) {
    return (
      <main className="flex min-h-screen flex-col items-center p-4 md:p-12 relative overflow-hidden bg-slate-900">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[100px] pointer-events-none" />

        <SinglePlayerGame
          mode={singlePlayerMode}
          difficulty={selectedDifficulty}
          playerColor={selectedColor}
          onExit={() => setSinglePlayerMode(null)}
        />
      </main>
    );
  }

  if (room) {
    return (
      <main className="flex min-h-screen flex-col items-center p-4 md:p-12 relative overflow-hidden bg-slate-900">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[100px] pointer-events-none" />

        <Game
          roomId={room.id}
          player={player}
          color={color}
          onExit={() => {
            setRoom(null);
            // Don't reset color - player can rejoin
            mutateRooms(); // Refresh room list
          }}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-12 relative overflow-hidden bg-slate-900">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="z-10 w-full text-center space-y-2 mb-8">
        <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">
          Ajedrez Vercel
        </h1>
        <p className="text-gray-400 text-lg">Professional Online Chess Platform</p>
        {player && (
          <p className="text-gray-300">
            Welcome <span className="text-primary font-bold">{player.name}</span> - ALO: <span className="text-secondary font-bold">{player.alo}</span>
            <button onClick={() => setPlayer(null)} className="ml-4 text-xs text-red-400 hover:text-red-300 underline">Logout</button>
          </p>
        )}
        {(playersLoading || roomsLoading) && (
          <p className="text-xs text-yellow-500 animate-pulse">⚡ Loading data...</p>
        )}
        {!playersLoading && !roomsLoading && players && rooms && (
          <p className="text-xs text-green-500">✓ Connected ({players.length} players, {rooms.length} games)</p>
        )}

        {/* Init Database Button for Testing */}
        <div className="flex gap-2 justify-center items-center mt-2">
          <button
            onClick={async () => {
              if (confirm('Initialize database with 10 test players and 5 games?')) {
                try {
                  const res = await fetch('/api/init', { method: 'POST' });
                  const data = await res.json();
                  if (data.success) {
                    alert(`✅ Database initialized!\n${data.players} players and ${data.games} games created.`);
                    mutatePlayers();
                    mutateRooms();
                  } else {
                    alert('❌ Error: ' + data.error);
                  }
                } catch {
                  alert('❌ Network error');
                }
              }
            }}
            className="text-xs px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded text-blue-300 transition-colors"
          >
            🔄 Init Test Data
          </button>
          <button onClick={() => setShowAdmin(!showAdmin)} className="text-xs px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded text-purple-300 transition-colors">
            {showAdmin ? '← Back' : '⚙️ Admin'}
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowAdmin(true)}
        className="absolute top-4 right-4 z-20 px-3 py-1 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded text-xs text-red-300 transition-colors"
      >
        Admin
      </button>

      {/* Main Dashboard */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6 z-10">
        {/* Game Modes */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            🎮 Game Modes
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => {
                if (!player) {
                  setShowLogin(true);
                } else {
                  setShowCreateRoom(true);
                }
              }}
              className="w-full p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 border border-green-500/50 rounded-lg transition-all text-left"
            >
              <h3 className="font-bold text-green-300 mb-1">➕ Create New Game</h3>
              <p className="text-sm text-gray-400">Start a new multiplayer match</p>
            </button>

            <button
              onClick={() => {
                setSinglePlayerMode('computer');
                setShowDifficultySelect(true);
              }}
              className="w-full p-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/50 rounded-lg transition-all text-left"
            >
              <h3 className="font-bold text-blue-300 mb-1">🤖 vs Computer</h3>
              <p className="text-sm text-gray-400">Play against AI with different levels</p>
            </button>

            <button
              onClick={() => {
                setSinglePlayerMode('learning');
                setShowDifficultySelect(true);
              }}
              className="w-full p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/50 rounded-lg transition-all text-left"
            >
              <h3 className="font-bold text-purple-300 mb-1">📚 Learning Mode</h3>
              <p className="text-sm text-gray-400">Practice with hints and analysis</p>
            </button>
          </div>
        </div>

        {/* Active Games */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-accent to-pink-500">
            ⚔️ Active Games ({activeGames.length})
          </h2>

          {/* My Active Games */}
          {player && activeGames.filter((g: Room) => g.whiteId === player.id || g.blackId === player.id).length > 0 && (
            <div className="mb-4 pb-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-primary mb-2">🎮 My Games</h3>
              <div className="space-y-2">
                {activeGames
                  .filter((g: Room) => g.whiteId === player.id || g.blackId === player.id)
                  .map((game: Room) => (
                    <div key={game.id} className="bg-primary/10 p-3 rounded-lg border border-primary/30">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-white text-sm">{game.name}</h4>
                        <span className="text-xs text-primary">Your Game</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-gray-400">
                          You: {game.whiteId === player.id ? '⚪ White' : '⚫ Black'}
                        </span>
                        <span className="text-gray-400">
                          vs {game.whiteId === player.id ? game.blackName || 'Waiting...' : game.whiteName || 'Waiting...'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setRoom({ id: game.id });
                          setColor(game.whiteId === player.id ? 'w' : 'b');
                        }}
                        className="w-full px-3 py-1.5 bg-primary hover:bg-primary/80 rounded text-black font-bold text-xs transition-colors"
                      >
                        ↩️ Return to Game
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {activeGames.map((game: Room) => (
              <div key={game.id} className="bg-white/5 p-4 rounded-lg border border-white/10 hover:border-primary/50 transition-all">
                <h3 className="font-bold text-white mb-2">{game.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">⚪ White:</span>
                    {game.whiteName ? (
                      <span className="text-white font-mono">{game.whiteName}</span>
                    ) : (
                      <button
                        onClick={() => handleJoinAsPlayer(game, 'w')}
                        className="px-2 py-1 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 rounded text-xs text-green-300"
                      >
                        Join
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">⚫ Black:</span>
                    {game.blackName ? (
                      <span className="text-white font-mono">{game.blackName}</span>
                    ) : (
                      <button
                        onClick={() => handleJoinAsPlayer(game, 'b')}
                        className="px-2 py-1 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 rounded text-xs text-green-300"
                      >
                        Join
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (!player) {
                        setShowLogin(true);
                        setSelectedRoom({ id: game.id, color: 'spectator' });
                      } else {
                        joinRoom(game.id, 'spectator');
                      }
                    }}
                    className="w-full mt-2 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded text-xs text-blue-300"
                  >
                    👁️ Spectate
                  </button>
                </div>
              </div>
            ))}
            {activeGames.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No active games</p>
                <button
                  onClick={() => {
                    if (!player) {
                      setShowLogin(true);
                    } else {
                      setShowCreateRoom(true);
                    }
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-lg text-black font-bold"
                >
                  Create First Game
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ranking */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
            🏆 Top 10 Ranking
          </h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
            {topPlayers.map((p: Player, i: number) => (
              <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${i < 3 ? 'text-yellow-400' : 'text-gray-400'} w-6`}>
                    #{i + 1}
                  </span>
                  <span className="text-white">{p.name}</span>
                </div>
                <span className="text-secondary font-mono font-bold">{p.alo}</span>
              </div>
            ))}
            {topPlayers.length === 0 && (
              <p className="text-gray-500 text-center py-8">No players yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Login/Register Button */}
      {!player && !showLogin && (
        <button
          onClick={() => setShowLogin(true)}
          className="mt-8 px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-primary/25 transition-all text-lg z-10"
        >
          Login / Register
        </button>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass-panel p-8 rounded-xl w-full max-w-md relative">
            <button
              onClick={() => {
                setShowCreateRoom(false);
                setNewRoomName("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-6 text-white">Create New Game</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Room Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white"
                  maxLength={30}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg hover:shadow-lg transition-all"
              >
                Create & Join as White
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Difficulty Selection Modal */}
      {showDifficultySelect && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass-panel p-8 rounded-xl w-full max-w-md relative">
            <button
              onClick={() => {
                setShowDifficultySelect(false);
                setSinglePlayerMode(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-6 text-white">
              {singlePlayerMode === 'computer' ? '🤖 vs Computer' : '📚 Learning Mode'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedDifficulty === diff
                        ? 'bg-primary text-black'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Play as</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedColor('w')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedColor === 'w'
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                  >
                    ⚪ White
                  </button>
                  <button
                    onClick={() => setSelectedColor('b')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${selectedColor === 'b'
                      ? 'bg-gray-800 text-white border-2 border-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                  >
                    ⚫ Black
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowDifficultySelect(false)}
                className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg hover:shadow-lg transition-all"
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="relative">
            <button
              onClick={() => {
                setShowLogin(false);
                setSelectedRoom(null);
              }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full text-white font-bold z-10"
            >
              ✕
            </button>
            <Login onLogin={handleLoginSuccess} />
          </div>
        </div>
      )}

      {showAdmin && <Admin onClose={() => setShowAdmin(false)} />}

      <footer className="w-full text-center py-8 text-gray-500 text-sm mt-auto z-10">
        <p>Built for the Modern Web • Real-time Sync via Vercel</p>
      </footer>
    </main>
  );
}
