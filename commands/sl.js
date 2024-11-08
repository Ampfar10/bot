const Jimp = require('jimp');


const imagePath = 'boards/sl.png';

let gameState = {
    players: [],             
    playerPositions: [],      
    currentPlayer: 0,         
    gameActive: false,        
    eliminatedPlayers: []     
};

// Function to initialize the game
const initializeGame = () => {
    gameState.players = [];
    gameState.playerPositions = [];
    gameState.currentPlayer = 0;
    gameState.eliminatedPlayers = [];
    gameState.gameActive = true;
};

// Add player to the game
const addPlayer = (playerId) => {
    if (gameState.players.length < 4) { // Maximum of 4 players
        gameState.players.push(playerId);
        gameState.playerPositions.push(1); // Start at position 1
    }
};


const createSnakeAndLadderGame = async () => {
    try {
        const background = await Jimp.read(imagePath);

        const cellSize = 50;  
        const width = cellSize * 10;
        const height = cellSize * 10;
        background.resize(width, height);

        // Define player piece shapes and colors
        const playerShapes = ['circle', 'square', 'triangle'];
        const playerColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00']; // Red, Green, Blue, Yellow

        for (let i = 0; i < gameState.players.length; i++) {
            if (!gameState.eliminatedPlayers.includes(gameState.players[i])) {
                const position = gameState.playerPositions[i];
                const { x, y } = getCoordinatesFromPosition(position);

                const playerColor = Jimp.cssColorToHex(playerColors[i]);
                const radius = 10;

                // Draw the player's unique shape (e.g., circle, square, etc.)
                drawPlayerPiece(background, playerShapes[i], x, y, playerColor, radius);
            }
        }

        const buffer = await background.getBufferAsync(Jimp.MIME_PNG);
        return buffer;
    } catch (error) {
        console.error("Error creating Snake and Ladder game:", error);
    }
};

// Function to draw the player's piece based on the shape
const drawPlayerPiece = (image, shape, x, y, color, radius) => {
    if (shape === 'circle') {
        // Draw a circle for the player
        image.scan(x - radius, y - radius, radius * 2, radius * 2, (ix, iy, idx) => {
            const dx = ix - x;
            const dy = iy - y;
            if (dx * dx + dy * dy <= radius * radius) {
                image.setPixelColor(color, ix, iy);
            }
        });
    } else if (shape === 'square') {
        // Draw a square
        image.scan(x - radius, y - radius, radius * 2, radius * 2, (ix, iy, idx) => {
            image.setPixelColor(color, ix, iy);
        });
    } else if (shape === 'triangle') {
        image.scan(x - radius, y - radius, radius * 2, radius * 2, (ix, iy, idx) => {
            image.setPixelColor(color, ix, iy);
        });
        // You can add logic for triangles or stars here
    }
    // Add more shapes if desired
};

// Calculate X, Y coordinates based on player's board position (1-100)
const getCoordinatesFromPosition = (position) => {
    const cellSize = 50;
    const row = Math.floor((position - 1) / 10);
    const col = (position - 1) % 10;

    const x = (row % 2 === 0) ? col * cellSize + cellSize / 2 : (9 - col) * cellSize + cellSize / 2;
    const y = (9 - row) * cellSize + cellSize / 2;

    return { x, y };
};

// Roll the dice and move the player
const rollDice = async (playerId, conn, chatId) => {
    if (gameState.players[gameState.currentPlayer] !== playerId) {
        return "It's not your turn!";
    }

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    let newPosition = gameState.playerPositions[gameState.currentPlayer] + diceRoll;

    // Ensure player doesn't move beyond position 100
    if (newPosition > 100) {
        newPosition = 100 - (newPosition - 100); // Bounce back
    }

    // Check for player elimination if they land on an occupied spot
    const occupiedIndex = gameState.playerPositions.findIndex(pos => pos === newPosition);
    if (occupiedIndex !== -1 && occupiedIndex !== gameState.currentPlayer) {
        // Eliminate the current player
        const eliminatedPlayer = gameState.players[occupiedIndex];
        gameState.eliminatedPlayers.push(eliminatedPlayer);
        gameState.playerPositions[occupiedIndex] = 0; // Set them to an unreachable position
        await conn.sendMessage(chatId, { text: `Player @${eliminatedPlayer.replace('@s.whatsapp.net', '')} has been eliminated!`, mentions: [eliminatedPlayer] });
    } else {
        gameState.playerPositions[gameState.currentPlayer] = newPosition;
    }

    // Handle snakes and ladders
    newPosition = checkForSnakesAndLadders(newPosition);
    gameState.playerPositions[gameState.currentPlayer] = newPosition;

    // Check for win condition
    if (newPosition === 100) {
        await conn.sendMessage(chatId, { text: `🎉 Player @${playerId.replace('@s.whatsapp.net', '')} has won the game! 🎉`, mentions: [playerId] });
        gameState.gameActive = false;
    } else {
        // Move to the next player's turn
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
    }

    // Display the updated board
    await displaySnakeAndLadderGame(conn, chatId);
};

// Check for Snakes and Ladders (unchanged)
const checkForSnakesAndLadders = (position) => {
    const snakes = { 98: 78, 95: 56, 93: 73, 87: 24, 62: 18, 54: 34, 17: 7 };
    const ladders = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };

    if (snakes[position]) {
        return snakes[position];
    } else if (ladders[position]) {
        return ladders[position];
    } else {
        return position;
    }
};

// Display the Snake and Ladder game
const displaySnakeAndLadderGame = async (conn, chatId) => {
    const gameBuffer = await createSnakeAndLadderGame();
    await conn.sendMessage(chatId, { image: gameBuffer, caption: "Snake and Ladder Game!" });
};

// Start the game
const startGame = async (conn, chatId) => {
    initializeGame();
    await conn.sendMessage(chatId, { text: "Game started! Use !sl join to join the game." });
};

// Main command handler
module.exports = {
    name: 'sl',
    description: 'Play a Snake and Ladder game',
    category: 'Games',
    async execute(conn, chatId, args, ownerId, senderId) {
        const subCommand = args[0];

        if (subCommand === "start") {
            await startGame(conn, chatId);
        } else if (subCommand === "join") {
            addPlayer(senderId);
            const playerCount = gameState.players.length;
            await conn.sendMessage(chatId, { text: `Player joined! Current players: ${playerCount}.`, mentions: [senderId] });
        } else if (subCommand === "roll") {
            await rollDice(senderId, conn, chatId);
        } else if (subCommand === "end") {
            gameState.gameActive = false;
            await conn.sendMessage(chatId, { text: "Game ended.", mentions: [senderId] });
        } else {
            await conn.sendMessage(chatId, { text: "Invalid command. Use !sl start | join | roll | end.", mentions: [senderId] });
        }
    }
};
