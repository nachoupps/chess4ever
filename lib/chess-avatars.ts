// Famous chess players as AI opponents
export const chessAvatars = {
    easy: {
        name: "José Raúl Capablanca",
        nickname: "The Chess Machine",
        era: "1888-1942",
        style: "Positional genius, simple and elegant",
        emoji: "♟️",
        color: "from-amber-600 to-yellow-500"
    },
    medium: {
        name: "Garry Kasparov",
        nickname: "The Beast from Baku",
        era: "1963-present",
        style: "Aggressive and tactical brilliance",
        emoji: "⚡",
        color: "from-red-600 to-orange-500"
    },
    hard: {
        name: "Magnus Carlsen",
        nickname: "The Mozart of Chess",
        era: "1990-present",
        style: "Universal player, endgame master",
        emoji: "👑",
        color: "from-purple-600 to-pink-500"
    }
} as const;

export type DifficultyLevel = keyof typeof chessAvatars;
