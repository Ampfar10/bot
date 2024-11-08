const Jimp = require('jimp'); // Importing Jimp for image creation

// Store game states for each chat
let gameStates = {};

// Initialize the game board
const initializeBoard = () => {
    return Array(3).fill(null).map(() => Array(3).fill(null));
};

// Get or create game state for the chat
const getGameState = (chatId) => {
    if (!gameStates[chatId]) {
        gameStates[chatId] = {
            board: initializeBoard(),
            players: [],
            currentPlayer: 0,
            gameActive: false,
            markers: ['X', 'O'],
            starterId: null,
            currentChatId: chatId,
        };
    }
    return gameStates[chatId];
};

const xImagePath = 'boards/x.jpg';
const oImagePath = 'boards/o.jpg';
const boardImagePath = 'boards/ttt.jpg';



// Create the board image
const createBoardImage = async (chatId, winner = null) => {
    const boardImage = await Jimp.read(boardImagePath); // Load the board background image
    const xImage = await Jimp.read(xImagePath); // Load custom X image
    const oImage = await Jimp.read(oImagePath); // Load custom O image
    const fontNumbers = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

    const size = boardImage.getWidth(); // Assume board image is square
    const cellSize = size / 3;
    
    // Resize X and O images to fit cells
    xImage.resize(cellSize - 20, cellSize - 20); 
    oImage.resize(cellSize - 20, cellSize - 20); 

    const gameState = getGameState(chatId);

    // Place markers on the board based on game state
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const cell = gameState.board[row][col];
            const xPos = col * cellSize + 10; // X position in the cell
            const yPos = row * cellSize + 10; // Y position in the cell

            if (cell === 'X') {
                boardImage.composite(xImage, xPos, yPos); // Place X image
            } else if (cell === 'O') {
                boardImage.composite(oImage, xPos, yPos); // Place O image
            }
        }
    }

    // Draw winning line if there's a winner
    if (winner) {
        const color = 0xffff0000;
        const [type, index] = winner.split(' ');
        if (type === 'row') {
            boardImage.scan(0, index * cellSize + cellSize / 2, size, 5, (x, y) => boardImage.setPixelColor(color, x, y));
        } else if (type === 'col') {
            boardImage.scan(index * cellSize + cellSize / 2, 0, 5, size, (x, y) => boardImage.setPixelColor(color, x, y));
        } else if (winner === 'diag1') {
            for (let i = 0; i < size; i++) boardImage.setPixelColor(color, i, i);
        } else if (winner === 'diag2') {
            for (let i = 0; i < size; i++) boardImage.setPixelColor(color, i, size - 1 - i);
        }
    }

    return await boardImage.getBufferAsync(Jimp.MIME_PNG);
};

// Place a marker on the board
const placeMarker = async (conn, playerId, cellNumber, chatId) => {
    const gameState = getGameState(chatId);

    if (!gameState.gameActive) return "Game not active. Start the game first by using !ttt start.";

    if (gameState.players[gameState.currentPlayer] !== playerId) return "It's not your turn!";

    const row = Math.floor((cellNumber - 1) / 3);
    const col = (cellNumber - 1) % 3;

    if (gameState.board[row][col]) return "Slot already taken! Choose another slot.";

    gameState.board[row][col] = gameState.markers[gameState.currentPlayer];
    const winner = checkWinner(chatId);

    if (winner) {
        gameState.gameActive = false;
        await displayBoard(conn, chatId, winner);
        return `${gameState.players[gameState.currentPlayer]} has won the game 🎉`;
    }

    if (gameState.board.flat().every(cell => cell)) {
        gameState.gameActive = false;
        await displayBoard(conn, chatId);
        return "It's a draw!";
    }

    gameState.currentPlayer = (gameState.currentPlayer + 1) % 2;
    await displayBoard(conn, chatId);
    return `Move made! Next player's turn: @${gameState.players[gameState.currentPlayer]}`;
};


// Check for a winner
const checkWinner = (chatId) => {
    const board = getGameState(chatId).board;

    for (let i = 0; i < 3; i++) {
        if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
            return `row ${i}`;
        }
        if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
            return `col ${i}`;
        }
    }
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return 'diag1';
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return 'diag2';
    }

    return null;
};

// Display the current board
const displayBoard = async (conn, chatId, winner = null) => {
    try {
        const imageBuffer = await createBoardImage(chatId, winner);
        await conn.sendMessage(chatId, {
            image: imageBuffer,
            caption: "Current Tic-Tac-Toe Board:",
            mentions: getGameState(chatId).players,
        });
    } catch (error) {
        console.error("Error displaying board:", error);
    }
};

// Start the game in a specific chat
const startGame = (playerId, chatId) => {
    const gameState = getGameState(chatId);

    if (gameState.gameActive) return "A game is already active in this chat! Please wait for it to end.";


    const choices = [0,1];
    const choi = Math.floor(Math.random() * choices.length);
    gameState.board = initializeBoard();
    gameState.players = [];
    gameState.currentPlayer = choices[choi] //Math.floor(Math.random() * 2);
    gameState.gameActive = true;
    gameState.starterId = playerId;

    return "Game started! Use !ttt join to join the game.";
};


// Main command handling
module.exports = {
    name: 'ttt',
    description: 'Play Tic-Tac-Toe',
    category: 'Games',
    async execute(conn, chatId, args, ownerId, senderId) {
        const subCommand = args[0];
        const gameState = getGameState(chatId); // Get or create the game state for the current chat

        if (subCommand === "start") {
            conn.sendMessage(chatId, { text: startGame(senderId, chatId) });
        } else if (subCommand === "restart") {
            if (gameState.gameActive) {
                conn.sendMessage(chatId, { text: "You cannot restart while the game is active." });
            } else {
                conn.sendMessage(chatId, { text: restartGame(chatId) });
            }
        } else if (subCommand === "join") {
            if (!gameState.gameActive) {
                return conn.sendMessage(chatId, { text: "No active game in this chat. Start a new game with !ttt start." });
            }
            if (gameState.players.length >= 2) {
                return conn.sendMessage(chatId, { text: "Game is full! There are already two players." });
            }
            gameState.players.push(senderId); // Add player
            conn.sendMessage(chatId, { 
                text: `@${senderId.replace('@s.whatsapp.net'), ''} joined the game \n\nCurrent players: ${gameState.players.length}.`,
                mentions: [senderId] 
            });

            // If both players have joined, display the board
            if (gameState.players.length === 2) {
                await displayBoard(conn, chatId); // Send the game board
                const playerX = `@${gameState.players[0]}`.replace('@s.whatsapp.net', '');
                const playerO = `@${gameState.players[1]}`.replace('@s.whatsapp.net', '');
                const startingPlayer = `@${gameState.players[gameState.currentPlayer]}`.replace('@s.whatsapp.net', '');
                conn.sendMessage(chatId, {
                    text: `❌Player ${playerX} is X \n⭕Player ${playerO} is O \nStarting player: ${startingPlayer} \n\n🎮To play the game use !ttt move 1-9`,
                    mentions: [gameState.players[0], gameState.players[1]],
                });
            }
        } else if (subCommand === "move") {
            if (!gameState.gameActive) {
                return conn.sendMessage(chatId, { text: "No active game in this chat. Start a new game with !ttt start." });
            }
            const cellNumber = parseInt(args[1]);
            if (!isNaN(cellNumber) && cellNumber >= 1 && cellNumber <= 9) {
                const result = await placeMarker(conn, senderId, cellNumber, chatId);
                conn.sendMessage(chatId, { text: result });

            } else {
                conn.sendMessage(chatId, { text: "Invalid move! Choose a number between 1 and 9." });
            }

        } else if (subCommand === "AI") {
            initializeBoard();
            gameState.players = [senderId, 'AI']; // Set the player and AI
            gameState.currentPlayer = gameState.players[0]; // Randomly assign first player
            gameState.gameActive = true;

            conn.sendMessage(chatId, { text: `Game started against AI! Player @${senderId} is X and AI is O.` });

            if (gameState.players[gameState.currentPlayer] === 'AI') {
                await makeAIMove(conn, chatId);
            }

        } else if (subCommand === "end") {
            if (!gameState.gameActive || (gameState.starterId !== senderId && !gameState.players.includes(senderId))) {
                conn.sendMessage(chatId, { text: "Only a player in the current game can end the game." });
            } else {
                gameState.gameActive = false;
                conn.sendMessage(chatId, { text: "Game ended!" });
            }
        } else {
            conn.sendMessage(chatId, {
                text: `❓ *Oops! Unknown command!* \nHere’s how to play Tic-Tac-Toe:\n\n🌟 *!ttt start*: Use this to start a new game\n👥 *!ttt join*: Jump in and join the game (maximum 2 players allowed!)\n🔢 *!ttt move <number>*: Make your move by picking a number between 1 and 9!\n🔄 *!ttt restart*: Use this to restart the game!\n🏁 *!ttt end*: End the current game`
            });
        }
    }
};
