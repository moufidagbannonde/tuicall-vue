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
    const response = await axios.get('https://37.64.205.84/openapi/interactive/listVhInfo', {
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
    const response = await axios.get('https://37.64.205.84/openapi/signature/gen', {
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
    const response = await axios.get('https://37.64.205.84/openapi/interactive/listVhResourceWithStatus', {
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
      url: `https://37.64.205.84${path}`,
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
io.on('connection', (socket) => {
  console.log('Client connecté:', socket.id);
  
  socket.on('join', (data) => {
    const room = data?.room || 'default';
    socket.join(room);
    console.log('Join room:', room);
    socket.emit('joined', { room, userId: socket.id });
  });
  
  socket.on('offer', (d) => socket.broadcast.emit('offer', { ...d, sender: socket.id }));
  socket.on('answer', (d) => socket.broadcast.emit('answer', { ...d, sender: socket.id }));
  socket.on('ice-candidate', (d) => socket.broadcast.emit('ice-candidate', { ...d, sender: socket.id }));
  socket.on('candidate', (d) => socket.broadcast.emit('candidate', { ...d, sender: socket.id }));
  socket.on('message', (d) => socket.broadcast.emit('message', { ...d, sender: socket.id }));
  
  socket.on('disconnect', () => console.log('Client déconnecté:', socket.id));
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