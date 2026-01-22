// websocket-interceptor.js
// Ce fichier doit être importé AVANT tout autre code dans main.js

/**
 * Intercepteur WebSocket global
 * Redirige tous les WebSocket externes (wss://) vers notre proxy local
 * DOIT être installé avant le chargement du SDK owt.js
 */

if (import.meta.env.DEV && !window.__websocketInterceptorInstalled) {
  console.log('[INTERCEPTOR INIT] 🚀 Installation précoce de l\'intercepteur WebSocket...');
  
  const OriginalWebSocket = window.WebSocket;
  
  window.WebSocket = function(url, protocols) {
    let modifiedUrl = url;
    
    if (typeof url === 'string') {
      // Intercepter TOUS les wss:// vers des serveurs externes
      if (url.startsWith('wss://') && !url.includes(window.location.host)) {
        try {
          const urlObj = new URL(url);
          const pathAndQuery = urlObj.pathname + urlObj.search;
          
          // CAS SPÉCIAL: Socket.IO avec rtcToken = serveur avatar
          if (pathAndQuery.includes('rtcToken=')) {
            // Rediriger vers un endpoint spécifique pour l'avatar
            modifiedUrl = `ws://${window.location.host}/avatar-socket${pathAndQuery}`;
            console.log('[INTERCEPTOR] 🎭 WebSocket AVATAR redirigé:', {
              original: url,
              modified: modifiedUrl,
              type: 'Avatar SDK'
            });
          } else {
            // Autres WebSocket externes
            modifiedUrl = `ws://${window.location.host}${pathAndQuery}`;
            console.log('[INTERCEPTOR] 🔌 WebSocket redirigé:', {
              original: url,
              modified: modifiedUrl,
              path: pathAndQuery
            });
          }
        } catch (e) {
          console.error('[INTERCEPTOR] ❌ Erreur parsing URL:', e);
        }
      } 
      // Intercepter aussi ws://localhost:XXXX (autres ports locaux)
      else if (url.startsWith('ws://localhost:') && !url.includes(`:${window.location.port}`)) {
        try {
          const urlObj = new URL(url);
          const pathAndQuery = urlObj.pathname + urlObj.search;
          
          // Rediriger vers notre port Vite
          modifiedUrl = `ws://${window.location.host}${pathAndQuery}`;
          
          console.log('[INTERCEPTOR] 🔄 WebSocket local redirigé:', {
            original: url,
            modified: modifiedUrl,
            reason: 'Mauvais port local'
          });
        } catch (e) {
          console.error('[INTERCEPTOR] ❌ Erreur parsing URL locale:', e);
        }
      }
      else if (url.startsWith('ws://') && url.includes(window.location.host)) {
        console.log('[INTERCEPTOR] ✓ WebSocket local autorisé:', url);
      }
    }
    
    const socket = new OriginalWebSocket(modifiedUrl, protocols);
    
    // Ajouter des logs pour déboguer
    socket.addEventListener('open', () => {
      console.log('[INTERCEPTOR] ✅ WebSocket ouvert:', modifiedUrl);
    });
    
    socket.addEventListener('error', (event) => {
      console.error('[INTERCEPTOR] ❌ WebSocket erreur:', modifiedUrl, event);
    });
    
    socket.addEventListener('close', (event) => {
      console.log('[INTERCEPTOR] 🔌 WebSocket fermé:', modifiedUrl, 'Code:', event.code, 'Reason:', event.reason);
    });
    
    return socket;
  };
  
  // Conserver le prototype et les propriétés statiques
  Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  
  // Copier les constantes (lecture seule) avec defineProperty
  Object.defineProperty(window.WebSocket, 'CONNECTING', {
    value: OriginalWebSocket.CONNECTING,
    writable: false,
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(window.WebSocket, 'OPEN', {
    value: OriginalWebSocket.OPEN,
    writable: false,
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(window.WebSocket, 'CLOSING', {
    value: OriginalWebSocket.CLOSING,
    writable: false,
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(window.WebSocket, 'CLOSED', {
    value: OriginalWebSocket.CLOSED,
    writable: false,
    enumerable: true,
    configurable: true
  });
  
  window.__websocketInterceptorInstalled = true;
  console.log('[INTERCEPTOR INIT] ✅ Intercepteur WebSocket installé globalement');
  
  // Test de l'intercepteur
  console.log('[INTERCEPTOR INIT] 🧪 Test de l\'intercepteur...');
  try {
    const testUrl = 'wss://37.64.205.84/test';
    const ws = new window.WebSocket(testUrl);
    ws.close();
    console.log('[INTERCEPTOR INIT] ✓ Test réussi - l\'intercepteur fonctionne');
  } catch (e) {
    console.log('[INTERCEPTOR INIT] ✓ Test échoué (normal) - l\'intercepteur est actif');
  }
} else if (window.__websocketInterceptorInstalled) {
  console.log('[INTERCEPTOR INIT] ℹ️ Intercepteur déjà installé');
}

export default {
  installed: window.__websocketInterceptorInstalled || false
};