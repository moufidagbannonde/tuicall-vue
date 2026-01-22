const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
const server = http.createServer(app);
const PORT = 8080;

app.use(cors());
app.use(express.json());

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

console.log('Démarrage...');

const io = socketIO(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
});

app.get('/', (req, res) => {
  res.send('<h1>Serveur actif</h1><p>Port: 8080</p>');
});

// Route 1: Liste des Virtual Humans
app.get('/openapi/interactive/listVhInfo', async (req, res) => {
  console.log('API: listVhInfo');
  try {
    const response = await axios.get('https://10.46.7.1/openapi/interactive/listVhInfo', {
      headers: { 
        'Subscription-Key': 'ff9eed6d-2331-44ff-9fca-7d7c06300ae9',
        ...req.headers
      },
      httpsAgent
    });
    res.json(response.data);
  } catch (e) {
    console.error('Erreur listVhInfo:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Route 2: Génération de signature
app.get('/openapi/signature/gen', async (req, res) => {
  console.log('API: signature/gen');
  try {
    const response = await axios.get('https://10.46.7.1/openapi/signature/gen', {
      headers: { 
        'Subscription-Key': 'ff9eed6d-2331-44ff-9fca-7d7c06300ae9',
        ...req.headers
      },
      httpsAgent
    });
    res.json(response.data);
  } catch (e) {
    console.error('Erreur signature/gen:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Route 3: Liste des ressources avec statut (utilisé par le SDK)
app.get('/openapi/interactive/listVhResourceWithStatus', async (req, res) => {
  console.log('API: listVhResourceWithStatus');
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);
  
  try {
    const response = await axios.get('https://10.46.7.1/openapi/interactive/listVhResourceWithStatus', {
      headers: { 
        'Subscription-Key': 'ff9eed6d-2331-44ff-9fca-7d7c06300ae9',
        'signature': req.headers.signature || req.headers['signature'],
        ...req.headers
      },
      params: req.query,
      httpsAgent
    });
    console.log('✓ listVhResourceWithStatus OK');
    res.json(response.data);
  } catch (e) {
    console.error('✗ Erreur listVhResourceWithStatus:', e.message);
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Data:', e.response.data);
    }
    res.status(e.response?.status || 500).json({ 
      error: e.message,
      details: e.response?.data 
    });
  }
});

// Route générique pour capturer tous les autres appels /openapi
app.all(/^\/openapi\/(.*)/, async (req, res) => {
  const path = req.path;
  console.log(`API générique: ${req.method} ${path}`);
  console.log('Query:', req.query);
  console.log('Headers:', Object.keys(req.headers));
  
  try {
    const response = await axios({
      method: req.method,
      url: `https://10.46.7.1${path}`,
      headers: { 
        'Subscription-Key': 'ff9eed6d-2331-44ff-9fca-7d7c06300ae9',
        ...req.headers,
        'host': undefined, // Supprimer le header host
        'connection': undefined
      },
      params: req.query,
      data: req.body,
      httpsAgent
    });
    console.log(`✓ ${path} OK`);
    res.status(response.status).json(response.data);
  } catch (e) {
    console.error(`✗ Erreur ${path}:`, e.message);
    if (e.response) {
      console.error('Status:', e.response.status);
      res.status(e.response.status).json(e.response.data);
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

// WebSocket pour la signalisation WebRTC
const users = new Map(); // Stocker userId -> socketId

io.on('connection', (socket) => {
  console.log('Client connecté:', socket.id);
  
  // Enregistrer l'utilisateur
  socket.on('register', (data) => {
    const userId = data.userId;
    users.set(userId, socket.id);
    socket.userId = userId;
    console.log('Utilisateur enregistré:', userId, '-> socket:', socket.id);
    socket.emit('registered', { userId, socketId: socket.id });
  });
  
  // Appel sortant
  socket.on('call-offer', (data) => {
    console.log('[SOCKET] call-offer de', data.from, 'vers', data.to);
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-offer', data);
      console.log('[SOCKET] call-offer envoyé à', targetSocketId);
    } else {
      console.warn('[SOCKET] Utilisateur', data.to, 'non trouvé');
    }
  });
  
  // Réponse d'appel
  socket.on('call-answer', (data) => {
    console.log('[SOCKET] call-answer de', data.from, 'vers', data.to, '| socketId:', socket.id);
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      console.log('[SOCKET] Envoi call-answer à socketId:', targetSocketId);
      io.to(targetSocketId).emit('call-answer', data);
    } else {
      console.warn('[SOCKET] Utilisateur', data.to, 'non trouvé pour call-answer');
    }
  });
  
  // Candidats ICE
  socket.on('ice-candidate', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', data);
    }
  });
  
  // Fin d'appel
  socket.on('call-ended', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended', data);
    }
  });
  
  // Appel rejeté
  socket.on('call-rejected', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-rejected', data);
    }
  });
  
  // Toggle audio/video
  socket.on('toggle-audio', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('toggle-audio', data);
    }
  });
  
  socket.on('toggle-video', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('toggle-video', data);
    }
  });
  
  // Partage d'écran
  socket.on('screen-share-started', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('screen-share-started', data);
    }
  });
  
  socket.on('screen-share-stopped', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('screen-share-stopped', data);
    }
  });
  
  // Enregistrement
  socket.on('request-record-permission', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('request-record-permission', data);
    }
  });
  
  socket.on('record-permission-response', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('record-permission-response', data);
    }
  });
  
  socket.on('recording-status-changed', (data) => {
    const targetSocketId = users.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('recording-status-changed', data);
    }
  });
  
  socket.on('disconnect', () => {
    if (socket.userId) {
      users.delete(socket.userId);
      console.log('Utilisateur déconnecté:', socket.userId);
    }
    console.log('Client déconnecté:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log('===========================');
  console.log('✅ Serveur proxy démarré');
  console.log('Port:', PORT);
  console.log('URL: http://localhost:' + PORT);
  console.log('Endpoints disponibles:');
  console.log('  - GET /openapi/interactive/listVhInfo');
  console.log('  - GET /openapi/signature/gen');
  console.log('  - GET /openapi/interactive/listVhResourceWithStatus');
  console.log('  - ALL /openapi/* (catch-all)');
  console.log('WebSocket: disponible sur ws://localhost:' + PORT);
  console.log('===========================');
});