const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML files from the "views" directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/battle', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'battle.html'));
});

// WebSocket for battle mode
const players = {};

wss.on('connection', (ws) => {
  const playerId = Date.now().toString(); // Generate a unique ID for the player
  players[playerId] = ws;

  // Send the player their ID immediately after connection
  ws.send(JSON.stringify({ type: 'id', playerId }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const { type, targetPlayerId, word, isCorrect } = data;

    if (type === 'join') {
      // Send the player their ID again (if needed)
      ws.send(JSON.stringify({ type: 'id', playerId }));
    } else if (type === 'guess') {
      // Forward the guess to the target player
      if (players[targetPlayerId]) {
        players[targetPlayerId].send(JSON.stringify({ type: 'guess', word, isCorrect }));
      }
    } else if (type === 'win') {
      // Notify the opponent that they lost
      if (players[targetPlayerId]) {
        players[targetPlayerId].send(JSON.stringify({ type: 'lose' }));
      }
    }
  });

  ws.on('close', () => {
    delete players[playerId]; // Remove the player when they disconnect
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});