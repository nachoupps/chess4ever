"use client";

import { useState, useEffect, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { ChessEngine } from "@/lib/chess-engine";
import { chessAvatars } from "@/lib/chess-avatars";

interface SinglePlayerGameProps {
    mode: 'computer' | 'learning';
    difficulty: 'easy' | 'medium' | 'hard';
    playerColor: 'w' | 'b';
    onExit: () => void;
}

export default function SinglePlayerGame({ mode, difficulty, playerColor, onExit }: SinglePlayerGameProps) {
    const game = useMemo(() => {
        return new Chess();
    }, []); // Only initialize once

    const [engine] = useState(new ChessEngine(difficulty));
    const [hint, setHint] = useState<{ move: string; explanation: string } | null>(null);
    const [feedback, setFeedback] = useState<string[]>([]);
    const [thinking, setThinking] = useState(false);
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [computerFeedback, setComputerFeedback] = useState<string>('');
    const [playerFeedback, setPlayerFeedback] = useState<string[]>([]);
    const [currentOpening, setCurrentOpening] = useState<{ name: string; description: string } | null>(null);

    // Track triggering of computer moves and feedback
    const [gameUpdateTrigger, setGameUpdateTrigger] = useState(0);

    // Computer makes move
    useEffect(() => {
        if (game.turn() !== playerColor && !game.isGameOver() && mode === 'computer') {
            Promise.resolve().then(() => setThinking(true));
            const timer = setTimeout(async () => {
                const result = await engine.getBestMove(game);
                if (result) {
                    game.move(result.move);
                    setMoveHistory(prev => [...prev, result.move]);
                    setComputerFeedback(result.explanation);

                    const opening = engine.detectOpening(game);
                    if (opening) {
                        setCurrentOpening(opening);
                    }
                    setGameUpdateTrigger(prev => prev + 1);
                }
                setThinking(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [gameUpdateTrigger, playerColor, mode, engine, game]);

    // Update feedback in learning mode
    useEffect(() => {
        if (mode === 'learning' && game.turn() === playerColor) {
            const analysis = engine.analyzePosition(game);
            Promise.resolve().then(() => setFeedback(analysis));
        }
    }, [gameUpdateTrigger, mode, playerColor, engine, game]);

    function onDrop(sourceSquare: string, targetSquare: string) {
        if (game.turn() !== playerColor) return false;
        if (game.isGameOver()) return false;

        try {
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q",
            });

            if (!move) return false;

            setMoveHistory(prev => [...prev, move.san]);
            setHint(null); // Clear hint after move

            // Analyze player's move
            const analysis = engine.analyzePlayerMove(game, move);
            setPlayerFeedback(analysis);

            // Check for opening
            const opening = engine.detectOpening(game);
            if (opening) {
                setCurrentOpening(opening);
            }

            setGameUpdateTrigger(prev => prev + 1);
            return true;
        } catch {
            return false;
        }
    }

    async function handleGetHint() {
        const hintData = await engine.getHint(game);
        setHint(hintData);
    }

    function handleUndoMove() {
        if (moveHistory.length === 0) return;

        // Undo moves on the mutable chess instance
        if (playerColor === game.turn()) {
            game.undo(); // Undo computer's move if player's turn
        }
        game.undo(); // Undo player's move

        const movesToReplay = playerColor === game.turn()
            ? moveHistory.slice(0, -1)
            : moveHistory.slice(0, -2);

        setMoveHistory(movesToReplay);
        setPlayerFeedback([]);
        setComputerFeedback('');
        setHint(null);
        setGameUpdateTrigger(prev => prev + 1);
    }

    function handleNewGame() {
        game.reset();
        setHint(null);
        setFeedback([]);
        setMoveHistory([]);
        setComputerFeedback('');
        setPlayerFeedback([]);
        setCurrentOpening(null);
        setGameUpdateTrigger(prev => prev + 1);
    }

    const isMyTurn = game.turn() === playerColor;
    const gameOver = game.isGameOver();

    let gameStatus = "Playing";
    if (game.isCheckmate()) {
        gameStatus = game.turn() === playerColor ? "You Lost!" : "You Won!";
    } else if (game.isDraw()) {
        gameStatus = "Draw";
    } else if (game.isStalemate()) {
        gameStatus = "Stalemate";
    } else if (isMyTurn) {
        gameStatus = "Your Turn";
    } else {
        gameStatus = mode === 'computer' ? "Computer Thinking..." : "Opponent's Turn";
    }

    return (
        <div className="flex min-h-screen flex-col items-center p-4 md:p-12 relative overflow-hidden bg-slate-900">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start justify-center w-full gap-6 max-w-[1800px] mx-auto z-10">
                {/* Board */}
                <div className="w-full max-w-[600px] space-y-4">
                    <div className="glass-panel p-4 rounded-xl relative">
                        <Chessboard
                            position={game.fen()}
                            onPieceDrop={onDrop}
                            arePiecesDraggable={!gameOver && isMyTurn && !thinking}
                            boardOrientation={playerColor === 'b' ? 'black' : 'white'}
                            customDarkSquareStyle={{ backgroundColor: "var(--board-dark)" }}
                            customLightSquareStyle={{ backgroundColor: "var(--board-light)" }}
                            customBoardStyle={{
                                borderRadius: "4px",
                                boxShadow: "0 5px 15px rgba(0, 0, 0, 0.5)",
                            }}
                        />
                        {thinking && (
                            <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded text-xs backdrop-blur-md animate-pulse">
                                🤔 Thinking...
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="glass-panel p-4 rounded-xl">
                        <div className="flex gap-2 flex-wrap">
                            {mode === 'learning' && !gameOver && isMyTurn && (
                                <button
                                    onClick={handleGetHint}
                                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded-lg text-blue-300 transition-colors text-sm"
                                >
                                    💡 Get Hint
                                </button>
                            )}

                            {moveHistory.length > 0 && !gameOver && (
                                <button
                                    onClick={handleUndoMove}
                                    className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/50 rounded-lg text-orange-300 transition-colors text-sm"
                                >
                                    ↶ Undo Move
                                </button>
                            )}

                            <button
                                onClick={handleNewGame}
                                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 rounded-lg text-green-300 transition-colors text-sm"
                            >
                                🔄 New Game
                            </button>

                            <button
                                onClick={onExit}
                                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg text-red-300 transition-colors text-sm ml-auto"
                            >
                                ← Back to Menu
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="flex flex-col gap-4 w-full max-w-[400px]">
                    {/* Avatar Card */}
                    {mode === 'computer' && (
                        <div className={`glass-panel p-6 rounded-xl bg-gradient-to-br ${chessAvatars[difficulty].color} bg-opacity-10`}>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="text-5xl">{chessAvatars[difficulty].emoji}</div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">{chessAvatars[difficulty].name}</h3>
                                    <p className="text-gray-400 text-xs italic">&quot;{chessAvatars[difficulty].nickname}&quot;</p>
                                </div>
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="text-gray-300">
                                    <span className="text-gray-500">Era:</span> {chessAvatars[difficulty].era}
                                </p>
                                <p className="text-gray-300">
                                    <span className="text-gray-500">Style:</span> {chessAvatars[difficulty].style}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="glass-panel p-6 rounded-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                                {mode === 'computer' ? `vs Computer (${difficulty})` : 'Learning Mode'}
                            </h2>
                        </div>

                        <div className="space-y-3 text-gray-300 bg-black/20 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">You:</span>
                                <span className="text-white font-bold">{playerColor === 'w' ? '⚪ White' : '⚫ Black'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Opponent:</span>
                                <span className="text-white font-bold">{mode === 'computer' ? '🤖 Computer' : '📚 Learning'}</span>
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

                        {/* Hint Display */}
                        {hint && mode === 'learning' && (
                            <div className="bg-blue-600/20 border border-blue-500/50 p-4 rounded-lg">
                                <p className="text-blue-300 font-bold text-sm mb-1">💡 Hint:</p>
                                <p className="text-white text-sm">{hint.explanation}</p>
                                <p className="text-blue-400 text-xs mt-2">Suggested move: <span className="font-mono font-bold">{hint.move}</span></p>
                            </div>
                        )}

                        {/* Opening Detection */}
                        {currentOpening && (
                            <div className="bg-yellow-600/20 border border-yellow-500/50 p-4 rounded-lg">
                                <p className="text-yellow-300 font-bold text-sm mb-1">📖 Opening:</p>
                                <p className="text-white text-sm font-bold">{currentOpening.name}</p>
                                <p className="text-gray-300 text-xs mt-1">{currentOpening.description}</p>
                            </div>
                        )}

                        {/* Computer's Last Move Feedback */}
                        {computerFeedback && mode === 'computer' && (
                            <div className="bg-red-600/20 border border-red-500/50 p-4 rounded-lg">
                                <p className="text-red-300 font-bold text-sm mb-1">🤖 Computer&apos;s Move:</p>
                                <p className="text-white text-xs">{computerFeedback}</p>
                            </div>
                        )}

                        {/* Player's Last Move Feedback */}
                        {playerFeedback.length > 0 && (
                            <div className="bg-green-600/20 border border-green-500/50 p-4 rounded-lg">
                                <p className="text-green-300 font-bold text-sm mb-1">✅ Your Move:</p>
                                {playerFeedback.map((fb, i) => (
                                    <p key={i} className="text-white text-xs">{fb}</p>
                                ))}
                            </div>
                        )}

                        {/* Learning Feedback */}
                        {mode === 'learning' && feedback.length > 0 && (
                            <div className="bg-purple-600/20 border border-purple-500/50 p-4 rounded-lg space-y-2">
                                <p className="text-purple-300 font-bold text-sm mb-2">📚 Position Analysis:</p>
                                {feedback.map((fb, i) => (
                                    <p key={i} className="text-white text-xs">{fb}</p>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Move History */}
                    <div className="glass-panel p-4 rounded-xl">
                        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">Move History</h3>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                            {moveHistory.map((move, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500 w-8">{Math.floor(i / 2) + 1}.</span>
                                    <span className={`font-mono ${i % 2 === 0 ? 'text-white' : 'text-gray-400'}`}>{move}</span>
                                </div>
                            ))}
                            {moveHistory.length === 0 && (
                                <p className="text-gray-500 text-xs text-center py-4">No moves yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
