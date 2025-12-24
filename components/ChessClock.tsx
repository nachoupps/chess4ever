// Simple chess clock component
import { useState, useEffect } from 'react';

interface ChessClockProps {
    whiteTime: number; // in seconds
    blackTime: number; // in seconds
    currentTurn: 'w' | 'b';
    onTimeOut: (color: 'w' | 'b') => void;
    paused?: boolean;
}

export default function ChessClock({ whiteTime, blackTime, currentTurn, onTimeOut, paused = false }: ChessClockProps) {
    const [white, setWhite] = useState(whiteTime);
    const [black, setBlack] = useState(blackTime);

    useEffect(() => {
        if (paused) return;

        const interval = setInterval(() => {
            if (currentTurn === 'w') {
                setWhite(prev => {
                    if (prev <= 1) {
                        onTimeOut('w');
                        return 0;
                    }
                    return prev - 1;
                });
            } else {
                setBlack(prev => {
                    if (prev <= 1) {
                        onTimeOut('b');
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentTurn, paused, onTimeOut]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex justify-between items-center gap-4 bg-black/20 p-3 rounded-lg">
            <div className={`flex-1 text-center p-2 rounded ${currentTurn === 'w' ? 'bg-white/20 border border-white/30' : 'bg-white/5'}`}>
                <div className="text-xs text-gray-400">⚪ White</div>
                <div className={`text-2xl font-mono font-bold ${white < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {formatTime(white)}
                </div>
            </div>
            <div className={`flex-1 text-center p-2 rounded ${currentTurn === 'b' ? 'bg-white/20 border border-white/30' : 'bg-white/5'}`}>
                <div className="text-xs text-gray-400">⚫ Black</div>
                <div className={`text-2xl font-mono font-bold ${black < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {formatTime(black)}
                </div>
            </div>
        </div>
    );
}
