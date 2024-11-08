const Jimp = require('jimp'); // Importing Jimp for image creation
const ffmpeg = require('fluent-ffmpeg'); // Importing ffmpeg for video creation
const fs = require('fs'); // For file system operations
const { randomInt } = require('crypto');

let gameState = {
    board: Array(3).fill(null).map(() => Array(3).fill(null)), // 3x3 board
    players: [],
    currentPlayer: 0,
    gameActive: false,
    markers: ['X', 'O'], // Store markers for players
};

// Initialize the game board
const initializeBoard = () => {
    gameState.board = Array(3).fill(null).map(() => Array(3).fill(null));
};

const createBoardImage = async (frameIndex, winner = null) => {
    const size = 300; // Size of the image (300x300)
    const img = new Jimp(size, size, 0xffffffff); // White background
    const fontNumbers = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK); // Load smaller font for numbers
    const fontMarkers = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK); // Load bigger font for X and O

    // Draw the grid
    for (let i = 1; i < 3; i++) {
        img.scan(0, i * 100, size, 1, (ix, iy) => {
            img.setPixelColor(0xff000000, ix, iy); // Draw horizontal line
        });
        img.scan(i * 100, 0, 1, size, (ix, iy) => {
            img.setPixelColor(0xff000000, ix, iy); // Draw vertical line
        });
    }

    // Draw numbers and X and O
    const numberMap = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
    ];

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const cell = gameState.board[row][col];
            const number = numberMap[row][col];
            img.print(fontNumbers, col * 100 + 40, row * 100 + 20, number.toString()); // Smaller number
            if (cell) {
                img.print(fontMarkers, col * 100 + 30, row * 100 + 60, cell); // Bigger X or O
            }
        }
    }

    // Draw the winning line if there is a winner
    if (winner) {
        const color = 0xffff0000; // Red color for winning line
        if (winner.includes('row')) {
            const row = winner.split(' ')[1];
            img.scan(0, row * 100 + 50, size, 1, (ix, iy) => {
                img.setPixelColor(color, ix, iy); // Draw winning horizontal line
            });
        } else if (winner.includes('col')) {
            const col = winner.split(' ')[1];
            img.scan(col * 100 + 50, 0, 1, size, (ix, iy) => {
                img.setPixelColor(color, ix, iy); // Draw winning vertical line
            });
        } else if (winner === 'diag1') {
            img.scan(0, 0, size, size, (ix, iy) => {
                if (ix === iy) img.setPixelColor(color, ix, iy); // Draw winning diagonal line
            });
        } else if (winner === 'diag2') {
            img.scan(0, 0, size, size, (ix, iy) => {
                if (ix + iy === 2) img.setPixelColor(color, ix, iy); // Draw winning anti-diagonal line
            });
        }
    }

    // Save the image for this frame
    const framePath = `frames/frame_${frameIndex}.png`;
    await img.writeAsync(framePath);
    return framePath; // Return the path of the saved frame
};

ffmpeg.setFfmpegPath('ffmpeg/ffmpeg.exe'); // Specify the full path here

const createBoardVideo = async (winner = null, frameRate = 1) => {
    const framePaths = [];
    for (let i = 0; i < 9; i++) {
        await createBoardImage(i, winner); // Create images for each frame
        framePaths.push(`frames/frame_${i}.png`);
    }

    const videoPath = 'output/video.mp4'; // Output video path
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(`frames/frame_%d.png`) // Use the created frames as input
            .inputOptions(`-framerate ${frameRate}`) // Set the frame rate to the specified value
            .outputOptions('-c:v libx264') // Video codec
            .outputOptions('-pix_fmt yuv420p') // Pixel format
            .on('end', () => {
                // Clean up frame files after video is created
                framePaths.forEach((path) => fs.unlinkSync(path));
                resolve(videoPath); // Resolve the path to the created video
            })
            .on('error', (error) => reject(`Error creating video: ${error.message}`))
            .save(videoPath); // Save the output video
    });
};

// Check for a winner
const checkWinner = () => {
    const board = gameState.board;

    // Check rows, columns, and diagonals
    for (let i = 0; i < 3; i++) {
        if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
            return `row ${i}`; // Row winner
        }
        if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
            return `col ${i}`; // Column winner
        }
    }
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return 'diag1'; // Diagonal winner
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return 'diag2'; // Diagonal winner
    }

    return null; // No winner
};

// Place a marker, now with AI
const placeMarker = async (conn, playerId, cellNumber, chatId) => {
    if (!gameState.gameActive) {
        return "Game not active. Start the game first.";
    }

    if (gameState.players[gameState.currentPlayer] !== playerId) {
        return "It's not your turn!";
    }

    const { row, col } = convertCellToRowCol(cellNumber);
    if (gameState.board[row][col]) {
        return "Cell already occupied. Try another one.";
    }

    gameState.board[row][col] = gameState.currentPlayer === 0 ? 'X' : 'O';

    const winner = checkWinner();
    const isDraw = gameState.board.flat().every(cell => cell);

    if (winner) {
        await createBoardVideo(0, row, col, winner);
        gameState.gameActive = false;
        return `${gameState.players[gameState.currentPlayer]} wins!`;
    } else if (isDraw) {
        await createBoardVideo(0, row, col);
        gameState.gameActive = false;
        return "It's a draw!";
    }

    // Switch to next player or AI move
    gameState.currentPlayer = (gameState.currentPlayer + 1) % 2;

    // AI makes a move if it's AI's turn
    if (gameState.currentPlayer === 1) {
        const move = aiMove();
        if (move) {
            gameState.board[move.row][move.col] = 'O'; // AI places O

            // Check winner after AI move
            const aiWinner = checkWinner();
            if (aiWinner) {
                await createBoardVideo(0, move.row, move.col, aiWinner);
                gameState.gameActive = false;
                return "AI wins!";
            }
        }
    }

    await createBoardVideo(0, row, col);
    return `Move made! Next player's turn: @${gameState.players[gameState.currentPlayer]}`; // Tag the player
};

// AI Minimax logic
const minimax = (board, depth, isMaximizing) => {
    const winner = checkWinner();
    if (winner) {
        if (winner === 'O') return 10 - depth; // AI wins, maximize
        if (winner === 'X') return depth - 10; // Player wins, minimize
        if (gameState.board.flat().every(cell => cell)) return 0; // Draw
    }

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (!board[row][col]) {
                    board[row][col] = 'O'; // AI is 'O'
                    const score = minimax(board, depth + 1, false);
                    board[row][col] = null;
                    bestScore = Math.max(bestScore, score);
                }
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (!board[row][col]) {
                    board[row][col] = 'X'; // Player is 'X'
                    const score = minimax(board, depth + 1, true);
                    board[row][col] = null;
                    bestScore = Math.min(bestScore, score);
                }
            }
        }
        return bestScore;
    }
};

// AI chooses the best move
const aiMove = () => {
    let bestScore = -Infinity;
    let move;

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (!gameState.board[row][col]) {
                gameState.board[row][col] = 'O'; // AI is 'O'
                const score = minimax(gameState.board, 0, false);
                gameState.board[row][col] = null;
                if (score > bestScore) {
                    bestScore = score;
                    move = { row, col };
                }
            }
        }
    }

    return move;
};



// Display the current board
const displayBoard = async (conn, chatId, winner = null) => {
    try {
        const videoPath = await createBoardVideo(winner);
        await conn.sendMessage(chatId, {
            video: { url: videoPath }, // Use the video path instead of image
            caption: "Current Tic-Tac-Toe Board:",
            mentions: gameState.players // Mention all players
        });
    } catch (error) {
        console.error("Error displaying board:", error);
    }
};

// Start the game
const startGame = () => {
    if (gameState.gameActive) {
        return "A game is already in progress! Please wait for it to finish or use !ttt end to end the current game.";
    }

    initializeBoard();
    gameState.players = []; // Reset player list
    gameState.currentPlayer = Math.floor(Math.random() * 2); // Randomly assign first player
    gameState.gameActive = true;
    return "Game started! Use !ttt join to join the game.";
};


// Restart the game
const restartGame = () => {
    initializeBoard();
    gameState.currentPlayer = Math.floor(Math.random() * 2); // Randomly assign first player
    gameState.gameActive = true;
    return "Game restarted! It's a fresh start!";
};

// End the game
const endGame = () => {
    gameState.gameActive = false;
    return "Game has been ended.";
};



// Main command handling
module.exports = {
    name: 'ten',
    description: 'Play Tic-Tac-Toe',
    category: 'Games',
    async execute(conn, chatId, args, ownerId, senderId) {
        const subCommand = args[0];

        if (subCommand === "start") {
            conn.sendMessage(chatId, { text: startGame() });
        } else if (subCommand === "restart") {
            if (!gameState.gameActive) {
                conn.sendMessage(chatId, { text: restartGame() });
            } else {
                conn.sendMessage(chatId, { text: "You cannot restart while the game is active." });
            }
        } else if (subCommand === "join") {
            if (gameState.players.length >= 2) {
                return conn.sendMessage(chatId, { text: "Game is full! There are already two players." });
            }
            gameState.players.push(senderId); // Add player
            conn.sendMessage(chatId, { text: `Player @${senderId} joined! Current players: ${gameState.players.length}.` });

            // If both players have joined, display the board
            if (gameState.players.length === 2) {
                await displayBoard(conn, chatId); // Send the game board
                const playerX = `@${gameState.players[0]}`.replace('@s.whatsapp.net', '');
                const playerO = `@${gameState.players[1]}`.replace('@s.whatsapp.net', '');
                const startingPlayer = `@${gameState.players[gameState.currentPlayer]}`.replace('@s.whatsapp.net', '');
                conn.sendMessage(chatId, {
                    text: `Player ${playerX} is X \n Player ${playerO} is O \nStarting player: ${startingPlayer} \n\nTo play the game use !move 1-9`,
                    mentions: [gameState.players[0], gameState.players[1]],
                });
            }
        } else if (subCommand === "move") {
            const cellNumber = parseInt(args[1]);
            if (!isNaN(cellNumber) && cellNumber >= 1 && cellNumber <= 9) {
                const result = await placeMarker(conn, senderId, cellNumber, chatId);
                conn.sendMessage(chatId, { text: result });

                // If AI is the opponent and it's the AI's turn, make an AI move
                if (gameState.players[1] === 'AI' && gameState.currentPlayer === 1) {
                    await makeAIMove(conn, chatId); // Make an AI move
                }
            } else {
                conn.sendMessage(chatId, { text: "Invalid move! Choose a number between 1 and 9." });
            }
        } else if (subCommand === "AI") {
            // Start a game with AI
            initializeBoard();
            gameState.players = [senderId, 'AI']; // Set the player and AI
            gameState.currentPlayer = Math.floor(Math.random() * 2); // Randomly assign first player
            gameState.gameActive = true;

            conn.sendMessage(chatId, { text: `Game started against AI! Player @${senderId} is X and AI is O.` });

            // If AI starts, make the first move
            if (gameState.players[gameState.currentPlayer] === 'AI') {
                await makeAIMove(conn, chatId);
            }
        } else if (subCommand === "end") {
            conn.sendMessage(chatId, { text: endGame() });
        } else {
            conn.sendMessage(chatId, { text: "Unknown command! Use start, join, move <number>, AI, restart, or end." });
        }
    }
};

const makeAIMove = async (conn, chatId) => {
    const move = aiMove(); // Get the best move from the AI

    if (!move) {
        conn.sendMessage(chatId, { text: "No available moves for AI." }); // Handle no available moves (shouldn't happen)
        return;
    }

    // Place the marker in the chosen cell
    const result = await placeMarker(conn, 'AI', move.row * 3 + move.col + 1, chatId);
    conn.sendMessage(chatId, { text: result });
};
