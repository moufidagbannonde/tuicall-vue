// Installer l'intercepteur WebSocket AVANT de charger le SDK
const installWebSocketInterceptor = () => {
  if (window.__websocketInterceptorInstalled) {
    console.log('[INTERCEPTOR] Déjà installé');
    return;
  }

  if (!import.meta.env.DEV) {
    console.log('[INTERCEPTOR] Mode production, pas d\'interception');
    return;
  }

  console.log('[INTERCEPTOR] 🔧 Installation de l\'intercepteur WebSocket GLOBAL...');

  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    let modifiedUrl = url;

    if (typeof url === 'string') {
      // Intercepter TOUS les wss:// vers des serveurs externes
      if (url.startsWith('wss://') && !url.includes(window.location.host)) {
        try {
          const urlObj = new URL(url);
          const pathAndQuery = urlObj.pathname + urlObj.search;
          modifiedUrl = `ws://${window.location.host}${pathAndQuery}`;

          console.log('[INTERCEPTOR] 🔌 WebSocket intercepté:', url, '→', modifiedUrl);
        } catch (e) {
          console.error('[INTERCEPTOR] Erreur parsing URL:', e);
        }
      }
    }

    return new OriginalWebSocket(modifiedUrl, protocols);
  };

  // Copier les propriétés statiques
  Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

  window.__websocketInterceptorInstalled = true;
  console.log('[INTERCEPTOR] ✓ Intercepteur WebSocket global installé');
};

// Charger le SDK
const loadSDK = () => {
  return new Promise((resolve, reject) => {
    // IMPORTANT: Installer l'intercepteur AVANT de charger le SDK
    installWebSocketInterceptor();

    if (window.owtRTC) {
      console.log('[SDK] Déjà chargé, réinitialisation...');
      // Ne pas retourner, forcer le rechargement
    }

    console.log('[SDK] Chargement du SDK...');
    const script = document.createElement('script');
    script.src = 'https://virtualhuman-app.oss-cn-beijing.aliyuncs.com/interaction/public/js/sdk/owt.js';
    script.charset = 'utf-8';
    script.onload = () => {
      console.log('[SDK] ✓ Chargé avec succès');

      // Intercepter Axios si disponible
      if (import.meta.env.DEV && window.axios) {
        console.log('[SDK] Installation de l\'intercepteur Axios...');
        window.axios.interceptors.request.use((config) => {
          if (config.url?.includes('37.64.205.84')) {
            const originalUrl = config.url;
            config.url = config.url.replace('https://37.64.205.84', window.location.origin);
            config.baseURL = config.baseURL?.replace('https://37.64.205.84', window.location.origin) || '';
            console.log('[SDK INTERCEPTOR] Axios réécrit:', originalUrl, '→', config.url);
          }
          return config;
        }, (error) => Promise.reject(error));
        console.log('[SDK] ✓ Intercepteur Axios installé');
      }

      resolve();
    };
    script.onerror = (error) => {
      console.error('[SDK] Erreur de chargement:', error);
      reject(new Error('Impossible de charger le SDK'));
    };
    document.head.appendChild(script);
  });
};

class VirtualAvatarService {
  constructor() {
    this.client = null;
    this.audioContext = null;
    this.isInitialized = false;
    this.audioProcessor = null;
    this.audioSource = null;
    this.baseUrl = 'https://37.64.205.84';
    this.subscriptionKey = import.meta.env.VITE_APP_SUBSCRIPTION_KEY || 'ff9eed6d-2331-44ff-9fca-7d7c06300ae9';
    this.initTimeout = null;
    this.connectionState = 'idle';
    this.diagnosticLogs = [];
    this.useProxy = false; // Désactiver le proxy par défaut pour le SDK
  }

  async runDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    console.log('[DIAGNOSTICS] 🔍 Démarrage des tests de connectivité...');

    // Test 1: API REST
    try {
      console.log('[DIAGNOSTICS] Test 1: API REST...');
      const response = await this.fetchWithFallback('/openapi/interactive/listVhInfo');
      results.tests.push({
        name: 'API REST',
        status: 'success',
        message: `${response.data?.length || 0} Virtual Humans disponibles`
      });
      console.log('[DIAGNOSTICS] ✓ API REST OK');
    } catch (error) {
      results.tests.push({
        name: 'API REST',
        status: 'failed',
        message: error.message
      });
      console.log('[DIAGNOSTICS] ✗ API REST échoué:', error.message);
    }

    // Test 2: Socket.IO
    try {
      console.log('[DIAGNOSTICS] Test 2: Socket.IO...');
      const socketTest = await this.testSocketIO();
      results.tests.push({
        name: 'Socket.IO',
        status: socketTest.connected ? 'success' : 'failed',
        message: socketTest.message
      });
      console.log(`[DIAGNOSTICS] ${socketTest.connected ? '✓' : '✗'} Socket.IO: ${socketTest.message}`);
    } catch (error) {
      results.tests.push({
        name: 'Socket.IO',
        status: 'failed',
        message: error.message
      });
      console.log('[DIAGNOSTICS] ✗ Socket.IO échoué:', error.message);
    }

    // Test 3: STUN servers
    try {
      console.log('[DIAGNOSTICS] Test 3: Serveurs STUN...');
      const stunTest = await this.testSTUN();
      results.tests.push({
        name: 'STUN Servers',
        status: stunTest.working ? 'success' : 'failed',
        message: stunTest.message
      });
      console.log(`[DIAGNOSTICS] ${stunTest.working ? '✓' : '✗'} STUN: ${stunTest.message}`);
    } catch (error) {
      results.tests.push({
        name: 'STUN Servers',
        status: 'failed',
        message: error.message
      });
      console.log('[DIAGNOSTICS] ✗ STUN échoué:', error.message);
    }

    console.log('[DIAGNOSTICS] 📊 Résultats:', results);
    return results;
  }

  testSocketIO() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ connected: false, message: 'Timeout après 5 secondes' });
      }, 5000);

      try {
        const socket = new WebSocket('ws://localhost:5173/socket.io/?EIO=4&transport=websocket');

        socket.onopen = () => {
          clearTimeout(timeout);
          socket.close();
          resolve({ connected: true, message: 'Connexion réussie' });
        };

        socket.onerror = (error) => {
          clearTimeout(timeout);
          resolve({ connected: false, message: `Erreur: ${error.message || 'WebSocket error'}` });
        };
      } catch (error) {
        clearTimeout(timeout);
        resolve({ connected: false, message: `Exception: ${error.message}` });
      }
    });
  }

  testSTUN() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ working: false, message: 'Timeout - Impossible de récupérer les ICE candidates' });
      }, 10000);

      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        let candidateFound = false;

        pc.onicecandidate = (event) => {
          if (event.candidate && event.candidate.candidate.includes('srflx')) {
            clearTimeout(timeout);
            candidateFound = true;
            pc.close();
            resolve({ working: true, message: 'ICE candidates récupérés avec succès' });
          }
        };

        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete' && !candidateFound) {
            clearTimeout(timeout);
            pc.close();
            resolve({ working: false, message: 'Aucun ICE candidate trouvé (problème NAT?)' });
          }
        };

        pc.createOffer().then(offer => pc.setLocalDescription(offer));

      } catch (error) {
        clearTimeout(timeout);
        resolve({ working: false, message: `Erreur: ${error.message}` });
      }
    });
  }

  async fetchWithFallback(endpoint) {
    const headers = {
      'Subscription-Key': this.subscriptionKey,
      'Content-Type': 'application/json'
    };

    const isDevelopment = import.meta.env.DEV;

    // En développement: utiliser le proxy Vite (/openapi reste /openapi)
    // En production: appeler directement le serveur
    const url = isDevelopment ? endpoint : `${this.baseUrl}${endpoint}`;

    console.log(`[API] Appel ${isDevelopment ? 'via Vite proxy' : 'direct'}: ${url}`);

    try {
      const response = await fetch(url, {
        headers,
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
        throw new Error('Le serveur a retourné du HTML au lieu de JSON');
      }
      return JSON.parse(text);
    } catch (error) {
      console.error('[API] Erreur fetch:', error);
      throw new Error(`Impossible d'accéder à ${endpoint}: ${error.message}`);
    }
  }

  async initialize(mountClass, options = {}) {
    try {
      console.log('[AVATAR] Début initialisation...');

      // Bloquer si pas de classe de montage
      if (!mountClass || !document.querySelector(`.${mountClass}`)) {
        throw new Error(`Élément .${mountClass} non trouvé`);
      }

      this.cleanup();

      const config = {
        timeout: options.timeout || 60000,
        retryAttempts: options.retryAttempts || 2,
        ...options
      };

      await loadSDK();

      const mountElement = document.querySelector(`.${mountClass}`);
      if (!mountElement) throw new Error(`Élément .${mountClass} non trouvé`);
      console.log('[AVATAR] Élément DOM trouvé');

      let humanInfoData, signatureData;
      for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
        try {
          console.log(`[AVATAR] Tentative ${attempt}/${config.retryAttempts} - Récupération des données...`);

          humanInfoData = await this.fetchWithFallback('/openapi/interactive/listVhInfo');
          if (!humanInfoData.data?.length) throw new Error('Aucun Virtual Human disponible');

          signatureData = await this.fetchWithFallback('/openapi/signature/gen');
          if (!signatureData.data) throw new Error('Signature invalide');

          break;
        } catch (error) {
          console.error(`[AVATAR] Tentative ${attempt} échouée:`, error.message);
          if (attempt === config.retryAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const rawHumanInfo = humanInfoData.data[0];
      const humanInfo = {
        id: rawHumanInfo.id,
        name: rawHumanInfo.name,
        modelConfigPrefix: rawHumanInfo.modelConfigPrefix,
        voice: rawHumanInfo.voice,
        extra: rawHumanInfo.extra,
        capabilities: Array.isArray(rawHumanInfo.capabilities) ? rawHumanInfo.capabilities : [],
        supportedLanguages: Array.isArray(rawHumanInfo.supportedLanguages) ? rawHumanInfo.supportedLanguages : [],
        ...rawHumanInfo
      };
      const signature = signatureData.data;

      console.log('[AVATAR] HumanInfo et signature prêts', humanInfo);


      return new Promise((resolve, reject) => {
        this.connectionState = 'connecting';
        let isResolved = false;
        const startTime = Date.now();

        const heartbeatInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          console.log(`[AVATAR] Connexion en cours... (${elapsed}s écoulées, état: ${this.connectionState})`);
        }, 5000);

        this.initTimeout = setTimeout(() => {
          if (!isResolved) {
            clearInterval(heartbeatInterval);
            this.connectionState = 'failed';
            console.error('[AVATAR] Timeout - Connexion impossible après', config.timeout / 1000, 'secondes');
            this.cleanup();
            reject(new Error(`Timeout: Connexion impossible au serveur après ${config.timeout / 1000}s`));
          }
        }, config.timeout);

        // ⚠️ IMPORTANT : Utiliser des serveurs STUN DIFFÉRENTS pour éviter les conflits
        // Ne pas utiliser les mêmes que WebRTC principal (stun.l.google.com)
        const iceServers = [
          { urls: 'stun:stun.voip.blackberry.com:3478' },
          { urls: 'stun:stun.stunprotocol.org:3478' },
          { urls: 'stun:stun.sipgate.net:3478' }
        ];

        try {
          const isDevelopment = import.meta.env.DEV;

          // Configuration du SDK
          const sdkConfig = {
            mountClass,
            humanInfo,
            signature,
            iceServers,
            proxyServer: isDevelopment ? {
              protocol: window.location.protocol.replace(':', ''),
              host: window.location.host,
            } : {
              protocol: 'https',
              host: '37.64.205.84'
            },
            ...(isDevelopment && { baseURL: window.location.origin }),
            onError: (code, msg) => {
              if (!isResolved) {
                clearTimeout(this.initTimeout);
                clearInterval(heartbeatInterval);
                this.connectionState = 'failed';

                if (code === 611) {
                  console.error('[AVATAR] ⚠️ Ressource occupée (code 611)');
                } else if (code === 624) {
                  console.error('[AVATAR] ⚠️ Erreur inconnue (code 624)');
                } else {
                  console.error('[AVATAR] SDK Erreur:', code, msg);
                }

                this.cleanup();
                isResolved = true;
                reject(new Error(`Erreur SDK ${code}: ${msg}`));
              }
            },
            onInited: () => {
              console.log('[AVATAR] ✓ SDK initialisé');
              try {
                console.log('[AVATAR] → Démarrage RTC...');
                this.client.startRTC();
              } catch (e) {
                if (!isResolved) {
                  console.error('[AVATAR] ✗ Erreur startRTC:', e);
                  clearTimeout(this.initTimeout);
                  clearInterval(heartbeatInterval);
                  this.connectionState = 'failed';
                  this.cleanup();
                  isResolved = true;
                  reject(e);
                }
              }
            },
            onJoinRoom: () => {
              if (!isResolved) {
                clearTimeout(this.initTimeout);
                clearInterval(heartbeatInterval);
                this.connectionState = 'connected';
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                console.log(`[AVATAR] ✓ Connecté avec succès à la room (${elapsed}s)`);
                this.isInitialized = true;
                isResolved = true;
                resolve();
              }
            },
            onConnecting: () => {
              console.log('[AVATAR] → Établissement de la connexion...');
            },
            onConnected: () => {
              console.log('[AVATAR] ✓ Connexion établie avec le serveur');
            },
            onDisconnected: () => {
              console.warn('[AVATAR] ⚠ Déconnexion du serveur');
              this.connectionState = 'idle';
            },
            onGetHeightAndWidth: (frame) => {
              const { width, height } = frame;
              const div = document.querySelector(`.${mountClass}`);
              if (div) {
                div.style.width = '100%';
                div.style.height = '100%';
                console.log(`[AVATAR] Dimensions ajustées: ${div.style.width} x ${div.style.height}`);
              }
            }
          };

          console.log('[AVATAR] Configuration SDK:', sdkConfig);
          this.client = new window.owtRTC(sdkConfig);

        } catch (error) {
          if (!isResolved) {
            clearTimeout(this.initTimeout);
            clearInterval(heartbeatInterval);
            this.connectionState = 'failed';
            console.error('[AVATAR] ✗ Erreur création client:', error);
            this.cleanup();
            isResolved = true;
            reject(error);
          }
        }
      });

    } catch (error) {
      console.error('[AVATAR] ✗ Initialisation échouée:', error);
      this.cleanup();
      throw error;
    }
  }

async startAudioStream(existingAudioTrack = null) {
  if (!this.isInitialized || !this.client) {
    throw new Error('Avatar non initialisé');
  }
  
  try {
    let audioTrack;
    
    if (existingAudioTrack) {
      // Utiliser le track audio existant de WebRTC
      console.log('[AUDIO] Utilisation du flux audio WebRTC existant');
      audioTrack = existingAudioTrack;
    } else {
      // Fallback : demander un nouveau flux (ne devrait jamais arriver normalement)
      console.log('[AUDIO] Demande d\'accès au microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      audioTrack = stream.getAudioTracks()[0];
      console.log('[AUDIO] ✓ Accès microphone accordé');
    }
    
    this.processAudioStream(audioTrack);
  } catch (error) {
    console.error('[AUDIO] ✗ Erreur accès micro:', error);
    throw error;
  }
}

  processAudioStream(audioTrack) {
    const mediaStream = new MediaStream([audioTrack]);
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(mediaStream);
    const processor = this.audioContext.createScriptProcessor(8192, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.isInitialized || !this.client) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = this.to16BitPCM(input);
      const audioData = new Int8Array(pcm.buffer);
      this.client.talkByArrayBuffer(audioData, this.audioContext.sampleRate, true);
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);

    this.audioProcessor = processor;
    this.audioSource = source;
    console.log('[AUDIO] ✓ Stream audio connecté');
  }

  to16BitPCM(input) {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return view;
  }

  cleanup() {
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.client) {
      this.client.destroy?.();
      this.client = null;
    }
    this.isInitialized = false;
    this.connectionState = 'idle';
  }

  destroy() {
    console.log('[AVATAR] Destruction du service...');
    this.cleanup();
    console.log('[AVATAR] ✓ Service détruit');
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      connectionState: this.connectionState,
      hasAudio: !!this.audioContext,
      diagnosticLogs: this.diagnosticLogs
    };
  }

  addLog(message, type = 'info') {
    const log = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    this.diagnosticLogs.push(log);
    if (this.diagnosticLogs.length > 50) {
      this.diagnosticLogs.shift();
    }
  }
}

export default new VirtualAvatarService();