import { Chess, Move, Square } from 'chess.js';

// Opening book - common chess openings
const openingBook: { [key: string]: { name: string; description: string } } = {
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR': {
        name: 'King\'s Pawn Opening',
        description: 'The most popular first move, controlling the center'
    },
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR': {
        name: 'Queen\'s Pawn Opening',
        description: 'Solid opening, preparing for a strong center'
    },
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR': {
        name: 'Open Game',
        description: 'Both sides fight for the center with pawns'
    },
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R': {
        name: 'King\'s Knight Opening',
        description: 'Developing the knight to attack the center'
    },
    'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R': {
        name: 'Petrov Defense',
        description: 'Symmetrical defense, solid but passive'
    },
    'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R': {
        name: 'Italian Game (start)',
        description: 'Classical opening aiming for rapid development'
    },
};

// Move type classifications
function classifyMove(game: Chess, move: Move): string[] {
    const classifications: string[] = [];

    if (move.captured) {
        classifications.push(`📍 Capture: Takes ${move.captured.toUpperCase()}`);
    }

    if (move.flags.includes('k') || move.flags.includes('q')) {
        classifications.push('🏰 Castling: Securing the king');
    }

    if (move.flags.includes('e')) {
        classifications.push('⚡ En Passant: Special pawn capture');
    }

    if (move.flags.includes('p')) {
        classifications.push('👑 Promotion: Pawn becomes a queen!');
    }

    // Check if move develops a piece
    if (move.piece === 'n' || move.piece === 'b') {
        if (move.from[1] === '1' || move.from[1] === '8') {
            classifications.push('🎯 Development: Bringing pieces into play');
        }
    }

    // Check if move attacks center
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    if (centerSquares.includes(move.to)) {
        classifications.push('⭐ Center Control: Dominating the board');
    }

    return classifications;
}

// Enhanced chess engine
export class ChessEngine {
    private difficulty: 'easy' | 'medium' | 'hard';

    constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
        this.difficulty = difficulty;
    }

    // Improved evaluation with positional understanding
    private evaluateBoard(game: Chess): number {
        const pieceValues: { [key: string]: number } = {
            p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
        };

        // Piece-square tables for positional play
        const pawnTable = [
            0, 0, 0, 0, 0, 0, 0, 0,
            50, 50, 50, 50, 50, 50, 50, 50,
            10, 10, 20, 30, 30, 20, 10, 10,
            5, 5, 10, 25, 25, 10, 5, 5,
            0, 0, 0, 20, 20, 0, 0, 0,
            5, -5, -10, 0, 0, -10, -5, 5,
            5, 10, 10, -20, -20, 10, 10, 5,
            0, 0, 0, 0, 0, 0, 0, 0
        ];

        const knightTable = [
            -50, -40, -30, -30, -30, -30, -40, -50,
            -40, -20, 0, 0, 0, 0, -20, -40,
            -30, 0, 10, 15, 15, 10, 0, -30,
            -30, 5, 15, 20, 20, 15, 5, -30,
            -30, 0, 15, 20, 20, 15, 0, -30,
            -30, 5, 10, 15, 15, 10, 5, -30,
            -40, -20, 0, 5, 5, 0, -20, -40,
            -50, -40, -30, -30, -30, -30, -40, -50
        ];

        let score = 0;
        const board = game.board();

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const square = board[i][j];
                if (square) {
                    const piece = square.type;
                    const color = square.color;
                    const multiplier = color === 'w' ? 1 : -1;

                    // Material value
                    score += pieceValues[piece] * multiplier;

                    // Positional value
                    const squareIndex = i * 8 + j;
                    if (piece === 'p') {
                        score += pawnTable[color === 'w' ? squareIndex : 63 - squareIndex] * multiplier;
                    } else if (piece === 'n') {
                        score += knightTable[color === 'w' ? squareIndex : 63 - squareIndex] * multiplier;
                    }
                }
            }
        }

        // Bonus for castling rights
        if (game.turn() === 'w') {
            if (game.getCastlingRights('w').k || game.getCastlingRights('w').q) score += 30;
        } else {
            if (game.getCastlingRights('b').k || game.getCastlingRights('b').q) score -= 30;
        }

        return score;
    }

    // Minimax with alpha-beta pruning (async to prevent blocking)
    private async minimaxAsync(game: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): Promise<number> {
        // Yield control periodically to prevent blocking
        if (depth % 2 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (depth === 0 || game.isGameOver()) {
            return this.evaluateBoard(game);
        }

        const moves = game.moves({ verbose: true });

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                game.move(move);
                const evaluation = await this.minimaxAsync(game, depth - 1, alpha, beta, false);
                game.undo();
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break; // Beta cutoff
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                game.move(move);
                const evaluation = await this.minimaxAsync(game, depth - 1, alpha, beta, true);
                game.undo();
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break; // Alpha cutoff
            }
            return minEval;
        }
    }

    // Get best move with explanation (async to prevent blocking)
    public async getBestMove(game: Chess): Promise<{ move: string; explanation: string } | null> {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return null;

        let bestMove = moves[0];
        let explanation = '';

        // Easy: Random move with basic explanation
        if (this.difficulty === 'easy') {
            bestMove = moves[Math.floor(Math.random() * moves.length)];
            const classifications = classifyMove(game, bestMove);
            explanation = classifications.length > 0
                ? classifications[0]
                : `Playing ${bestMove.san}`;
        }
        // Medium: Depth 3 search
        else if (this.difficulty === 'medium') {
            let bestValue = -Infinity;
            for (const move of moves) {
                game.move(move);
                const value = await this.minimaxAsync(game, 3, -Infinity, Infinity, false);
                game.undo();
                if (value > bestValue) {
                    bestValue = value;
                    bestMove = move;
                }
            }
            const classifications = classifyMove(game, bestMove);
            explanation = classifications.length > 0
                ? `${classifications[0]} (Tactical play)`
                : `Strong move: ${bestMove.san}`;
        }
        // Hard: Depth 4 search with better explanations
        else {
            let bestValue = -Infinity;
            for (const move of moves) {
                game.move(move);
                const value = await this.minimaxAsync(game, 4, -Infinity, Infinity, false);
                game.undo();
                if (value > bestValue) {
                    bestValue = value;
                    bestMove = move;
                }
            }
            const classifications = classifyMove(game, bestMove);
            if (bestMove.captured) {
                explanation = `Winning material with ${bestMove.san}`;
            } else if (classifications.length > 0) {
                explanation = `${classifications[0]} (Strategic depth)`;
            } else {
                explanation = `Optimal move: ${bestMove.san}`;
            }
        }

        return {
            move: bestMove.san,
            explanation
        };
    }

    // Detect opening
    public detectOpening(game: Chess): { name: string; description: string } | null {
        const fen = game.fen().split(' ')[0]; // Get board position only
        return openingBook[fen] || null;
    }

    // Analyze player's move
    public analyzePlayerMove(game: Chess, playerMove: Move): string[] {
        const feedback: string[] = [];
        const classifications = classifyMove(game, playerMove);

        feedback.push(...classifications);

        // Check if it was a good move
        const moveCount = game.history().length;
        if (moveCount <= 10) {
            const opening = this.detectOpening(game);
            if (opening) {
                feedback.push(`📖 ${opening.name}: ${opening.description}`);
            }
        }

        return feedback;
    }

    // Get hint for learning mode
    public async getHint(game: Chess): Promise<{ move: string; explanation: string } | null> {
        return this.getBestMove(game);
    }

    // Analyze position
    public analyzePosition(game: Chess): string[] {
        const feedback: string[] = [];
        const moves = game.moves({ verbose: true });

        if (game.isCheck()) {
            feedback.push("⚠️ You are in check! You must move your king or block the attack.");
        }

        // Check for checkmate in 1
        for (const move of moves) {
            game.move(move);
            if (game.isCheckmate()) {
                feedback.push(`✨ Checkmate available with ${move.san}!`);
                game.undo();
                break;
            }
            game.undo();
        }

        // Check for captures
        const captures = moves.filter(m => m.captured);
        if (captures.length > 0 && !game.isCheck()) {
            feedback.push(`💡 Possible captures: ${captures.slice(0, 3).map(m => m.san).join(', ')}`);
        }

        // Material evaluation
        const evaluation = this.evaluateBoard(game);
        if (evaluation > 300) {
            feedback.push("📊 You have a material advantage!");
        } else if (evaluation < -300) {
            feedback.push("📊 You are behind in material. Look for tactics!");
        } else {
            feedback.push("⚖️ Material is roughly equal. Focus on position!");
        }

        return feedback;
    }
}
