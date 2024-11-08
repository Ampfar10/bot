const { generateDeck, shuffleDeck } = require('./deck');
const gameStates = {};

const countdownSeconds = 10;
const defaultRounds = 1;

// Initialize a new game state
const initializeGameState = (rounds) => ({
    players: [],
    dealer: { hand: [], score: 0 },
    deck: shuffleDeck(generateDeck()),
    currentPlayer: 0,
    gameActive: true,
    waitingForPlayers: true,
    rounds,
    currentRound: 1,
});

// Calculates hand value for a player or dealer
const calculateHandValue = (hand) => {
    let value = 0;
    let aces = 0;
    hand.forEach(card => {
        if (['J', 'Q', 'K'].includes(card.value)) value += 10;
        else if (card.value === 'A') {
            aces += 1;
            value += 11;
        } else value += parseInt(card.value);
    });

    while (value > 21 && aces) {
        value -= 10;
        aces -= 1;
    }
    return value;
};

// Deals a card to a specific player or dealer
const dealCard = (deck, hand) => {
    const card = deck.pop();
    hand.push(card);
    return card;
};

// Starts a countdown for players to join
const startCountdown = async (conn, chatId, rounds) => {
    const gameState = getGameState(chatId);
    gameState.waitingForPlayers = true;
    gameState.rounds = rounds || defaultRounds;

    conn.sendMessage(chatId, { text: `Blackjack game starting in ${countdownSeconds} seconds! Use *!bj join* to join!` });
    for (let i = countdownSeconds; i > 0; i--) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (gameState.players.length < 1) {
        gameState.gameActive = false;
        return conn.sendMessage(chatId, { text: "Not enough players joined. Game cancelled." });
    }

    gameState.waitingForPlayers = false;
    startNewRound(conn, chatId);
};

// Starts a new round in the game
const startNewRound = (conn, chatId) => {
    const gameState = getGameState(chatId);

    // Reset hands and shuffle deck
    gameState.players.forEach(player => player.hand = []);
    gameState.dealer.hand = [];
    gameState.deck = shuffleDeck(generateDeck());

    // Deal initial two cards to each player and dealer
    gameState.players.forEach(player => {
        dealCard(gameState.deck, player.hand);
        dealCard(gameState.deck, player.hand);
        player.score = calculateHandValue(player.hand);
        player.stand = false;
    });
    dealCard(gameState.deck, gameState.dealer.hand);
    dealCard(gameState.deck, gameState.dealer.hand);
    gameState.dealer.score = calculateHandValue(gameState.dealer.hand);

    // Randomize the starting player
    gameState.currentPlayer = Math.floor(Math.random() * gameState.players.length);

    showGameState(conn, chatId);
    startPlayerTurn(conn, chatId);
};

// Start a specific player's turn with a 20-second timer
const startPlayerTurn = async (conn, chatId) => {
    const gameState = getGameState(chatId);
    const player = gameState.players[gameState.currentPlayer];

    conn.sendMessage(chatId, {
        text: `@${player.id.replace('@s.whatsapp.net', '')}, it's your turn! You have 20 seconds to decide: *hit* or *stand*.`,
        mentions: [player.id]
    });
    showPlayerHand(conn, chatId, player);

    // Set a 20-second timeout to automatically stand if no response
    gameState.turnTimeout = setTimeout(() => {
        player.stand = true;
        conn.sendMessage(chatId, { text: `@${player.id.replace('@s.whatsapp.net', '')} took too long! Automatically standing.` });
        endTurn(conn, chatId);
    }, 40000);
};

// Show the current player's hand and score
const showPlayerHand = (conn, chatId, player) => {
    const playerHand = player.hand.map(card => `${card.value}${card.suit}`).join(', ');
    conn.sendMessage(chatId, { text: `*Your Hand*: ${playerHand} (Score: ${player.score})` });
};

// Ends the current player's turn and moves to the next
const endTurn = (conn, chatId) => {
    const gameState = getGameState(chatId);
    clearTimeout(gameState.turnTimeout);

    gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;

    // Check if all players have either stood or gone bust
    if (gameState.players.every(player => player.score >= 21 || player.stand)) {
        revealDealer(conn, chatId);
    } else {
        startPlayerTurn(conn, chatId);
    }
};

// Show all player hands and scores, plus the dealer's hand
const showGameState = (conn, chatId) => {
    const gameState = getGameState(chatId);
    let message = `🃏 *Blackjack Round ${gameState.currentRound}/${gameState.rounds}*\n\n`;

    gameState.players.forEach(player => {
        const playerHand = player.hand.map(card => `${card.value}${card.suit}`).join(', ');
        message += `*Player ${player.id}*: ${playerHand} (Score: ${player.score})\n`;
    });

    const dealerHand = gameState.dealer.hand[0].value + gameState.dealer.hand[0].suit + ', ??';
    message += `\n*Dealer's Hand*: ${dealerHand}\n\n`;
    conn.sendMessage(chatId, { text: message });
};

// Reveal dealer's hand and announce the game outcome
const revealDealer = (conn, chatId) => {
    const gameState = getGameState(chatId);

    while (gameState.dealer.score < 17) {
        dealCard(gameState.deck, gameState.dealer.hand);
        gameState.dealer.score = calculateHandValue(gameState.dealer.hand);
    }

    let message = `\n\n*Dealer's Final Hand*: `;
    message += gameState.dealer.hand.map(card => `${card.value}${card.suit}`).join(', ') + ` (Score: ${gameState.dealer.score})\n`;

    gameState.players.forEach(player => {
        const playerWon = (player.score <= 21 && (player.score > gameState.dealer.score || gameState.dealer.score > 21));
        message += `\n*Player ${player.id}*: ${(playerWon) ? "Won!" : "Lost."} (Score: ${player.score})`;
    });

    conn.sendMessage(chatId, { text: message });
};

module.exports = {
    name: 'bj',
    description: 'Play Blackjack',
    category: 'Games',
    async execute(conn, chatId, args, ownerId, senderId) {
        const subCommand = args[0];
        const rounds = args[1] ? parseInt(args[1]) : defaultRounds;

        if (subCommand === "start") {
            if (gameStates[chatId]?.gameActive) {
                return conn.sendMessage(chatId, { text: "A Blackjack game is already active in this chat!" });
            }
            gameStates[chatId] = initializeGameState(rounds);
            startCountdown(conn, chatId, rounds);

        } else if (subCommand === "join") {
            const gameState = getGameState(chatId);
            if (!gameState.gameActive || !gameState.waitingForPlayers) {
                return conn.sendMessage(chatId, { text: "No active game waiting for players. Start a new game with *!bj start*." });
            }
            if (gameState.players.some(player => player.id === senderId)) {
                return conn.sendMessage(chatId, { text: "You are already in the game!" });
            }
            gameState.players.push({ id: senderId, hand: [], score: 0 });
            conn.sendMessage(chatId, { text: `@${senderId.replace('@s.whatsapp.net', '')} joined the game!`, mentions: [senderId] });

        } else if (subCommand === "hit") {
            const gameState = getGameState(chatId);
            const player = gameState.players[gameState.currentPlayer];
            if (!gameState.gameActive || player.id !== senderId) {
                return conn.sendMessage(chatId, { text: "It's not your turn!" });
            }

            clearTimeout(gameState.turnTimeout); // Clear the timer if they choose
            const card = dealCard(gameState.deck, player.hand);
            player.score = calculateHandValue(player.hand);
            conn.sendMessage(chatId, { text: `You drew: ${card.value}${card.suit}. Your score: ${player.score}.` });

            if (player.score > 21) {
                conn.sendMessage(chatId, { text: `@${senderId.replace('@s.whatsapp.net', '')}, you busted! Moving to the next player.`, mentions: [senderId] });
                player.stand = true;
                endTurn(conn, chatId);
            } else {
                startPlayerTurn(conn, chatId);
            }
        }
    }
};

// Helper to get the game state
const getGameState = (chatId) => {
    return gameStates[chatId];
};
