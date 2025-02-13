document.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('board');
  const ctx = board.getContext('2d');
  board.width = 500;
  board.height = 600;

  const inputBox = document.getElementById('inputBox');
  const resetButton = document.getElementById('resetButton');
  const messageBox = document.getElementById('messageBox');
  const languageSelect = document.getElementById('languageSelect');
  const keyboardButtons = document.querySelectorAll('.keyboard button');
  const playerIdElement = document.getElementById('playerId');
  const opponentIdInput = document.getElementById('opponentId');
  const startBattleButton = document.getElementById('startBattle');

  let selectedWord = '';
  let dictionary = [];
  const maxAttempts = 6;
  let attempts = 0;
  let currentGuess = '';
  let guessedWords = [];
  let playerId;
  let opponentId;
  let isBattleMode = window.location.pathname === '/battle';

  // WebSocket connection
  const ws = new WebSocket(`ws://${window.location.host}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'id') {
      playerId = data.playerId;
      if (playerIdElement) {
        playerIdElement.textContent = playerId; // Display the player ID
      }
    } else if (data.type === 'guess') {
      alert(`Opponent guessed: ${data.word} (${data.isCorrect ? 'Correct' : 'Incorrect'})`);
    } else if (data.type === 'lose') {
      alert('You lost! Your opponent guessed the word first.');
    }
  };

  if (startBattleButton) {
    startBattleButton.addEventListener('click', () => {
      opponentId = opponentIdInput.value;
      if (opponentId) {
        ws.send(JSON.stringify({ type: 'join', targetPlayerId: opponentId }));
      }
    });
  }

  class Letter {
    constructor(letter, index) {
      this.letter = letter;
      this.index = index;
    }
  }

  // Online dictionary resources
  const dictionaryResources = {
    english: 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt',
    turkish: 'https://raw.githubusercontent.com/mertemin/turkish-word-list/master/words.txt',
  };

  // Load dictionary from online resource
  const loadDictionary = async (language) => {
    try {
      const response = await fetch(dictionaryResources[language]);
      if (!response.ok) {
        throw new Error(`Failed to fetch dictionary: ${response.statusText}`);
      }
      const text = await response.text();
      dictionary = text
        .split('\n') // Split by new lines
        .map((word) => word.trim()) // Trim whitespace
        .filter((word) => word.length === 5); // Filter 5-letter words
    } catch (error) {
      console.error('Error loading dictionary:', error);
      alert('Failed to load dictionary. Please try again later.');
    }
  };

  // Fetch a random word from the loaded dictionary
  const fetchRandomWord = () => {
    return dictionary[Math.floor(Math.random() * dictionary.length)];
  };

  // Check if a word exists in the dictionary
  const isValidWord = (word) => {
    return dictionary.includes(word);
  };

  const drawBoard = () => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, board.width, board.height);

    // Draw the empty board (for guesses)
    for (let i = 0; i < maxAttempts; i++) {
      for (let j = 0; j < 5; j++) {
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(j * 100 + 10, i * 100 + 10, 80, 80); // Draw empty boxes
      }
    }
  };

  const drawGuess = () => {
    // Draw all guessed words on the board
    for (let i = 0; i < guessedWords.length; i++) {
      for (let j = 0; j < guessedWords[i].length; j++) {
        const letter = guessedWords[i][j];
        ctx.fillStyle = getColor(letter.letter, j);
        ctx.fillRect(j * 100 + 10, i * 100 + 10, 80, 80); // Fill boxes with color
        ctx.fillStyle = '#000';
        ctx.font = 'bold 40px Manrope';
        ctx.textAlign = 'center';
        ctx.fillText(letter.letter.toUpperCase(), j * 100 + 50, i * 100 + 55); // Draw letters
      }
    }
  };

  const getColor = (letter, index) => {
    if (selectedWord[index] === letter) return '#6aaa64'; // Correct letter in the correct position
    if (selectedWord.includes(letter)) return '#c9b458'; // Correct letter, wrong position
    return '#787c7e'; // Incorrect letter
  };

  const updateKeyboard = () => {
    keyboardButtons.forEach((button) => {
      const key = button.getAttribute('data-key');
      if (guessedWords.flat().some((letter) => letter.letter === key)) {
        const color = getColor(key, selectedWord.indexOf(key));
        button.classList.add(color === '#6aaa64' ? 'correct' : color === '#c9b458' ? 'present' : 'absent');
      }
    });
  };

  const showMessage = (message) => {
    messageBox.textContent = message;
    messageBox.style.display = 'block'; // Show the message box
  };

  const resetGame = async () => {
    const language = languageSelect ? languageSelect.value : 'english'; // Default to English if languageSelect is missing
    await loadDictionary(language);
    selectedWord = fetchRandomWord();
    attempts = 0;
    currentGuess = '';
    guessedWords = [];
    inputBox.value = '';
    messageBox.style.display = 'none'; // Hide the message box on reset
    keyboardButtons.forEach((button) => {
      button.classList.remove('correct', 'present', 'absent');
    });
    drawBoard();
  };

  const finalizeGuess = () => {
    if (currentGuess.length === 5) {
      if (!isValidWord(currentGuess)) {
        alert('Not a valid word!');
        return; // Do not proceed if the word is invalid
      }

      const isCorrect = currentGuess === selectedWord;
      guessedWords.push(currentGuess.split('').map((letter, index) => new Letter(letter, index)));
      currentGuess = '';
      inputBox.value = ''; // Clear input box
      attempts++;

      if (isCorrect) {
        // User wins
        drawBoard();
        drawGuess();
        showMessage('You Win! The word was: ' + selectedWord.toUpperCase());

        if (isBattleMode && opponentId) {
          ws.send(JSON.stringify({ type: 'win', targetPlayerId: opponentId }));
        }
      } else if (attempts >= maxAttempts) {
        // User loses
        drawBoard();
        drawGuess();
        showMessage('Game Over! The correct word was: ' + selectedWord.toUpperCase());
      } else {
        drawBoard();
        drawGuess();
      }

      if (isBattleMode && opponentId) {
        ws.send(JSON.stringify({ type: 'guess', targetPlayerId: opponentId, word: currentGuess, isCorrect }));
      }

      updateKeyboard();
    }
  };

  inputBox.addEventListener('input', (e) => {
    currentGuess = e.target.value.toLowerCase();
  });

  inputBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      finalizeGuess();
    }
  });

  resetButton.addEventListener('click', resetGame);

  if (languageSelect) {
    languageSelect.addEventListener('change', resetGame);
  }

  keyboardButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (currentGuess.length < 5) {
        currentGuess += button.getAttribute('data-key');
        inputBox.value = currentGuess;
      }
    });
  });

  // Initialize the game
  resetGame();
});