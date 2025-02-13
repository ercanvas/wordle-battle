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
  const progressContainer = document.getElementById('progressContainer');

  let selectedWord = '';
  let dictionary = [];
  const maxAttempts = 6;
  let attempts = 0;
  let currentGuess = '';
  let guessedWords = [];
  let playerId;
  let opponentId;
  let isBattleMode = window.location.pathname === '/battle';
  let playerProgress = 0;
  let opponentProgress = 0;

  // WebSocket connection (use wss:// for secure WebSocket)
  const ws = new WebSocket(`wss://${window.location.host}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'id') {
      playerId = data.playerId;
      if (playerIdElement) {
        playerIdElement.textContent = playerId; // Display the player ID
      }
    } else if (data.type === 'invite') {
      // Handle game invite
      const accept = confirm(`Player ${data.fromPlayerId} has invited you to a battle. Do you accept?`);
      if (accept) {
        ws.send(JSON.stringify({ type: 'inviteResponse', targetPlayerId: data.fromPlayerId, action: 'accept' }));
        opponentId = data.fromPlayerId;
        initializeBattle();
      } else {
        ws.send(JSON.stringify({ type: 'inviteResponse', targetPlayerId: data.fromPlayerId, action: 'decline' }));
      }
    } else if (data.type === 'inviteResponse') {
      // Handle opponent's response to the invite
      if (data.action === 'accept') {
        opponentId = data.fromPlayerId;
        initializeBattle();
      } else {
        alert('Opponent declined your invite.');
      }
    } else if (data.type === 'progress') {
      // Update opponent's progress bar
      opponentProgress = data.progress;
      updateProgressBars();
    } else if (data.type === 'lose') {
      // Opponent has won
      showMessage('You Lose! Opponent completed 5 rounds first.');
    }
  };

  if (startBattleButton) {
    startBattleButton.addEventListener('click', () => {
      opponentId = opponentIdInput.value;
      if (opponentId) {
        ws.send(JSON.stringify({ type: 'invite', targetPlayerId: opponentId }));
      }
    });
  }

  const initializeBattle = () => {
    // Initialize progress bars
    progressContainer.innerHTML = `
      <div class="progress-bar">
        <div class="progress-label">Your Progress</div>
        <div class="progress" id="playerProgress" style="width: 0%"></div>
      </div>
      <div class="progress-bar">
        <div class="progress-label">Opponent's Progress</div>
        <div class="progress" id="opponentProgress" style="width: 0%"></div>
      </div>
    `;
  };

  const updateProgressBars = () => {
    document.getElementById('playerProgress').style.width = `${playerProgress * 20}%`;
    document.getElementById('opponentProgress').style.width = `${opponentProgress * 20}%`;
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
        // User wins the round
        playerProgress++;
        updateProgressBars();
        ws.send(JSON.stringify({ type: 'progress', targetPlayerId: opponentId, progress: playerProgress }));

        if (playerProgress === 5) {
          // User wins the battle
          showMessage('You Win! You completed 5 rounds first.');
          ws.send(JSON.stringify({ type: 'win', targetPlayerId: opponentId }));
        } else {
          resetGame(); // Start a new round
        }
      } else if (attempts >= maxAttempts) {
        // User loses the round
        resetGame(); // Start a new round
      } else {
        drawBoard();
        drawGuess();
      }
    }
  };

  // Rest of the code remains the same...
});