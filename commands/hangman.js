const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

// Path to the words.txt file
const wordsFilePath = path.join(__dirname, '../words.txt');
const maxWrongGuesses = 6; // Max number of incorrect guesses before game over

const activeGames = new Map(); // Track active games by chat ID

// Initialize a new game
const initializeGame = (chatId, starterId) => {
    const words = fs.readFileSync(wordsFilePath, 'utf8').split('\n');
    const randomIndex = Math.floor(Math.random() * words.length);
    const word = words[randomIndex].trim().toUpperCase();
    
    activeGames.set(chatId, {
        word,
        correctGuesses: Array(word.length).fill('_'),
        wrongGuesses: [],
        remainingGuesses: maxWrongGuesses,
        starterId,
        hintGiven: false
    });
    return word.length;
};

// Function to provide a hint (only one per game)
const getHint = (game) => {
    if (!game.hintGiven) {
        game.hintGiven = true;
        return `Hint: The word starts with "${game.word[0]}" and ends with "${game.word[game.word.length - 1]}"`;
    } 
    return "You've already received a hint for this game!";
};

// Function to check the player's guess
const guessLetter = (game, letter) => {
    letter = letter.toUpperCase();
    if (game.correctGuesses.includes(letter) || game.wrongGuesses.includes(letter)) {
        return "You've already guessed that letter!";
    }

    if (game.word.includes(letter)) {
        for (let i = 0; i < game.word.length; i++) {
            if (game.word[i] === letter) game.correctGuesses[i] = letter;
        }
    } else {
        game.wrongGuesses.push(letter);
        game.remainingGuesses--;
    }
    
    return game.correctGuesses.join(' ');
};

// Check for win or loss
const checkGameOver = (game) => {
    if (game.correctGuesses.join('') === game.word) {
        return `You won! The word was: ${game.word}`;
    }
    if (game.remainingGuesses === 0) {
        return `Game over! The word was: ${game.word}`;
    }
    return null;
};

// Create Hangman Image with Jimp
// Create Hangman Image with Jimp
const createHangmanImage = async (wrongGuesses) => {
    const image = new Jimp(200, 200, '#FFFFFF');

    // Draw the static parts: ground, pole, top bar, and rope
    image.scan(90, 180, 20, 5, (x, y, idx) => image.setPixelColor(Jimp.cssColorToHex('#000000'), x, y)); // Ground
    image.scan(100, 20, 5, 160, (x, y, idx) => image.setPixelColor(Jimp.cssColorToHex('#000000'), x, y)); // Pole
    image.scan(100, 20, 70, 5, (x, y, idx) => image.setPixelColor(Jimp.cssColorToHex('#000000'), x, y)); // Top bar
    image.scan(160, 25, 5, 25, (x, y, idx) => image.setPixelColor(Jimp.cssColorToHex('#000000'), x, y)); // Rope

    // Draw the body parts based on the number of wrong guesses
    if (wrongGuesses > 0) image.circle({ x: 165, y: 60, radius: 10, color: '#000000' }); // Head
    if (wrongGuesses > 1) image.scan(160, 70, 10, 40, (x, y, idx) => image.setPixelColor(Jimp.cssColorToHex('#000000'), x, y)); // Body
    if (wrongGuesses > 2) image.scan(155, 80, 5, 20, (x, y, idx) => image.setPixelColor(Jimp.cssColorToHex('#000000'), x, y)); // Left Arm
    if (wrongGuesses > 3) image.scan(170, 80, 5, 20, (x, y, idx) => image.setPixelColor(Jimp.cssColorToHex('#000000'), x, y)); // Right Arm
    if (wrongGuesses > 4) image.scan(158, 110, 5, 25, (x, y, idx) => image.setPixelColor(Jimp.cssColorToHex('#000000'), x, y)); // Left Leg
    if (wrongGuesses > 5) image.scan(168, 110, 5, 25, (x, y, idx) => image.setPixelColor(Jimp.cssColorToHex('#000000'), x, y)); // Right Leg

    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
    return buffer;
};

// Game logic handler
const handleHangmanGame = async (conn, chatId, senderId, letter) => {
    const game = activeGames.get(chatId);
    if (game && game.starterId === senderId) {
        const guessedWord = guessLetter(game, letter);
        const gameOverMessage = checkGameOver(game);

        if (gameOverMessage) {
            activeGames.delete(chatId);
            await conn.sendMessage(chatId, { text: gameOverMessage });
        } else {
            const hangmanImage = await createHangmanImage(game.wrongGuesses.length);
            await conn.sendMessage(chatId, { image: hangmanImage, caption: `Word: ${guessedWord} \nGuessed: ${game.wrongGuesses.join(', ')} \nRemaining guesses: ${game.remainingGuesses}` });
        }
    } else {
        await conn.sendMessage(chatId, { text: "Only the game starter can make guesses!" });
    }
};

// End game handler
const endGame = (chatId, senderId) => {
    const game = activeGames.get(chatId);
    if (game && game.starterId === senderId) {
        activeGames.delete(chatId);
        return "Game ended!";
    }
    return "No game to end or you are not the game starter.";
};

// Command Handler
module.exports = {
    name: 'hangman',
    description: 'Play a game of Hangman!',
    category: 'Games',
    async execute(conn, chatId, args, ownerId, senderId) {
        const subCommand = args[0];
        if (subCommand === "start") {
            if (activeGames.has(chatId)) {
                await conn.sendMessage(chatId, { text: "A Hangman game is already in progress!" });
            } else {
                const wordLength = initializeGame(chatId, senderId);
                await conn.sendMessage(chatId, { text: `Hangman game started! Use !hangman guess <letter> to guess a letter. You have 6 wrong guesses allowed. The word has ${wordLength} letters.` });
            }
        } else if (subCommand === "guess") {
            const letter = args[1];
            if (letter && letter.length === 1) {
                await handleHangmanGame(conn, chatId, senderId, letter);
            } else {
                await conn.sendMessage(chatId, { text: "Please provide a valid letter to guess." });
            }
        } else if (subCommand === "hint") {
            const game = activeGames.get(chatId);
            if (game && game.starterId === senderId) {
                const hint = getHint(game);
                await conn.sendMessage(chatId, { text: hint });
            } else {
                await conn.sendMessage(chatId, { text: "Only the game starter can request a hint!" });
            }
        } else if (subCommand === "end") {
            const message = endGame(chatId, senderId);
            await conn.sendMessage(chatId, { text: message });
        } else {
            await conn.sendMessage(chatId, { text: "Invalid command. Use !hangman start, !hangman guess <letter>, !hangman hint, or !hangman end." });
        }
    }
};
