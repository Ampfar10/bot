const Jimp = require('jimp'); // Importing Jimp for image creation

let gameState = {
    grid: [],
    players: [],
    currentPlayer: 0,
    gameActive: false,
    eliminatedPlayers: [],
    playerMoves: [] // Track moves for each player
};

// Initialize a 6x6 grid
const initializeGrid = () => {
    gameState.grid = Array.from({ length: 6 }, () => 
        Array.from({ length: 6 }, () => ({ owner: null, count: 0 }))
    );
    gameState.playerMoves = Array(gameState.players.length).fill(0); // Reset moves
};

// Add a player to the game
const addPlayer = (playerId) => {
    if (!gameState.players.includes(playerId) && gameState.players.length < 6) {
        gameState.players.push(playerId);
    }
};

// Create the grid image
const createGridImage = async () => {
    const width = 300; // Width of the image (6 cells of 50x50)
    const height = 300; // Height of the image
    const cellSize = 50; // Size of each cell
    const img = new Jimp(width, height, 0xffffffff); // White background

    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK); // Load font for numbers

    let cellNumber = 1; // Start numbering cells from 1
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
            const x = col * cellSize;
            const y = row * cellSize;
            img.scan(x, y, cellSize, cellSize, (ix, iy) => {
                img.setPixelColor(0xff000000, ix, iy); // Black border for cells
            });

            const cell = gameState.grid[row][col];
            img.print(font, x + 20, y + 15, `${cellNumber}`);

            if (cell.owner !== null) {
                const color = Jimp.cssColorToHex(getPlayerColor(cell.owner));
                const radius = 15; // Circle radius
                const cx = x + cellSize / 2;
                const cy = y + cellSize / 2;

                const atomCount = Math.min(cell.count, 3); // Limit to 3 for display purposes
                for (let i = 0; i < atomCount; i++) {
                    const dy = (i * 10); // Stacking atoms vertically
                    img.scan(cx - radius, cy - radius - dy, radius * 2, radius * 2, (ix, iy) => {
                        const dx = ix - cx;
                        const adjustedDy = iy - (cy - dy);
                        if (dx * dx + adjustedDy * adjustedDy <= radius * radius) {
                            img.setPixelColor(color, ix, iy);
                        }
                    });
                }

                img.print(font, x + 15, y + 15, `${cell.count}`);
            }

            cellNumber++; // Increment the number for the next cell
        }
    }

    const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
    return buffer;
};

// Get player color
const getPlayerColor = (playerId) => {
    const playerIndex = gameState.players.indexOf(playerId);
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']; // Example colors
    return colors[playerIndex % colors.length];
};

// Display the current grid
const displayGrid = async (conn, chatId) => {
    try {
        const imageBuffer = await createGridImage();
        await conn.sendMessage(chatId, { 
            image: imageBuffer, 
            caption: "Current Game Grid:", 
        });
    } catch (error) {
        console.error("Error displaying grid:", error);
    }
};

// Place an atom based on the specified cell number
const placeAtom = async (playerId, number, conn, chatId) => {
    if (!gameState.gameActive) {
        return "Game not active. Start the game first.";
    }

    if (gameState.players[gameState.currentPlayer] !== playerId) {
        return "It's not your turn!";
    }

    const cellIndex = number - 1; // Convert to 0-based index
    if (cellIndex < 0 || cellIndex >= 36) {
        return "Invalid cell number! Please use a number between 1 and 36.";
    }

    const row = Math.floor(cellIndex / 6); // Get the row
    const col = cellIndex % 6; // Get the column

    const cell = gameState.grid[row][col];

    // Check if the cell is owned by the current player
    if (cell.owner === playerId) {
        cell.count++; // Increment the count for the player's existing atom
    } else if (cell.owner === null) {
        // If cell is unoccupied, mark the cell with the player's ID
        cell.owner = playerId;
        cell.count = 1; // Set count to 1
    } else {
        return "This cell is already taken by another player!";
    }

    // Increment the move count for the current player
    gameState.playerMoves[gameState.currentPlayer]++;

    // Check if the atom count exceeds the threshold for explosion
    if (cell.count > 3) {
        await handleExplosion(row, col, conn, chatId);
    } else {
        // Display the updated grid
        await displayGrid(conn, chatId);

        // Check if all players have made their first move
        if (gameState.playerMoves.every(move => move > 0)) {
            await checkEliminationAndWin(conn, chatId);
            // Reset player moves for the next round
            gameState.playerMoves.fill(0);
        }

        // Switch to the next player's turn
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;

        // Tag the next player
        const nextPlayerId = gameState.players[gameState.currentPlayer].replace('@s.whatsapp.net', ''); // Remove unwanted suffix
        return `Move made! Next player's turn: @${nextPlayerId}.`;
    }
};

// Handle explosion of an atom
const handleExplosion = async (row, col, conn, chatId) => {
    const cell = gameState.grid[row][col];
    
    // Reset the exploded cell
    cell.count = 0;
    cell.owner = null;

    // Spread to adjacent cells
    const directions = [
        [-1, 0], // Up
        [1, 0],  // Down
        [0, -1], // Left
        [0, 1]   // Right
    ];

    for (const [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
        if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 6) {
            const adjacentCell = gameState.grid[newRow][newCol];
            if (adjacentCell.owner === null) {
                adjacentCell.owner = gameState.players[gameState.currentPlayer]; // Set to the current player's owner
                adjacentCell.count = 1; // Set count to 1 for the newly added atom
            } else {
                adjacentCell.count++; // Increment count for the adjacent cell
            }
        }
    }

    // Display the updated grid after explosion
    await displayGrid(conn, chatId);

    // Check for eliminated players and winning condition
    await checkEliminationAndWin(conn, chatId);
};

// Check if any players are eliminated or if a player has won
const checkEliminationAndWin = async (conn, chatId) => {
    // Check if any players have no cells left
    for (const playerId of gameState.players) {
        if (!gameState.eliminatedPlayers.includes(playerId)) {
            const hasCells = gameState.grid.some(row => 
                row.some(cell => cell.owner === playerId)
            );
            if (!hasCells) {
                gameState.eliminatedPlayers.push(playerId);
                await conn.sendMessage(chatId, { 
                    text: `Player @${playerId.replace('@s.whatsapp.net', '')} has been eliminated!`, 
                    mentions: [playerId]
                });
            }
        }
    }

    // Check if there is only one player left
    const remainingPlayers = gameState.players.filter(playerId => 
        !gameState.eliminatedPlayers.includes(playerId)
    );

    if (remainingPlayers.length === 1) {
        const winner = remainingPlayers[0];
        await conn.sendMessage(chatId, { 
            text: `Game over! @${winner.replace('@s.whatsapp.net', '')} has won the game!`, 
            mentions: [winner]
        });
        gameState.gameActive = false; // End the game
    }
};

// Start the game
const startGame = async (conn, chatId) => {
    initializeGrid();
    gameState.players = []; // Reset players at the start
    gameState.currentPlayer = 0;
    gameState.gameActive = true;
    gameState.eliminatedPlayers = [];

    await conn.sendMessage(chatId, { text: "Game started! Use !cr join to join the game." });
};

// Main command handling
module.exports = {
    name: 'cr',
    description: 'Play a chain reaction game',
    category: 'Games',
    async execute(conn, chatId, args, ownerId, senderId) {
        const subCommand = args[0];

        if (subCommand === "start") {
            await startGame(conn, chatId);
        } else if (subCommand === "join") {
            addPlayer(senderId);
            const playerCount = gameState.players.length; // Get the correct number of players
            await conn.sendMessage(chatId, { text: `Player joined! Current players: ${playerCount}.`, mentions: [senderId] });
        } else if (subCommand === "place") {
            const cellNumber = parseInt(args[1], 10);
            if (isNaN(cellNumber)) {
                await conn.sendMessage(chatId, { text: "Please specify a valid cell number.", mentions: [senderId] });
                return;
            }
            const result = await placeAtom(senderId, cellNumber, conn, chatId);
            await conn.sendMessage(chatId, { text: result, mentions: [senderId] });
        } else if (subCommand === "end") {
            await conn.sendMessage(chatId, { text: endGame(), mentions: [senderId] });
        } else {
            await conn.sendMessage(chatId, { text: "Invalid command. Use !cr start | join | place | end.", mentions: [senderId] });
        }
    }
};
