import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8000,
    host: true,
    https: false,
    
    proxy: {
      '/api': {
        target: 'https://37.64.205.84:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          const newPath = path.replace(/^\/api/, '');
          console.log('🔄 Proxy /api rewrite:', path, '→', newPath);
          return newPath;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ Erreur proxy /api:', err.message);
            if (res && !res.headersSent) {
              res.writeHead(502, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ 
                error: 'Proxy error', 
                message: err.message,
                code: err.code,
                url: req.url
              }));
            }
          });
          
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const subscriptionKey = req.headers['subscription-key'];
            console.log('→ Requête proxy /api:', req.method, req.url);
            
            proxyReq.setHeader('Host', '37.64.205.84');
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Connection', 'keep-alive');
            
            if (subscriptionKey) {
              proxyReq.setHeader('Subscription-Key', subscriptionKey);
            }
            
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('← Réponse proxy /api:', proxyRes.statusCode, req.url);
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Subscription-Key, signature';
            proxyRes.headers['access-control-allow-credentials'] = 'true';
          });
        }
      },
      
      // NOUVEAU: Proxy pour /openapi (utilisé par le SDK)
      '/openapi': {
        target: 'https://37.64.205.84:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // IMPORTANT: Support WebSocket pour /openapi/interactive/websocket
        rewrite: (path) => path, // Pas de rewrite, garder /openapi
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ Erreur proxy /openapi:', err.message);
            if (res && !res.headersSent) {
              res.writeHead(502, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ 
                error: 'Proxy error', 
                message: err.message
              }));
            }
          });
          
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const subscriptionKey = req.headers['subscription-key'] || 'ff9eed6d-2331-44ff-9fca-7d7c06300ae9';
            const signature = req.headers['signature'];
            
            console.log('→ Requête proxy /openapi:', {
              method: req.method,
              url: req.url,
              hasSignature: !!signature
            });
            
            proxyReq.setHeader('Host', '37.64.205.84');
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Subscription-Key', subscriptionKey);
            
            if (signature) {
              proxyReq.setHeader('signature', signature);
            }
            
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('← Réponse proxy /openapi:', {
              status: proxyRes.statusCode,
              url: req.url,
              contentType: proxyRes.headers['content-type']
            });
            
            proxyRes.headers['access-control-allow-origin'] = '*';
            proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['access-control-allow-headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Subscription-Key, signature';
            proxyRes.headers['access-control-allow-credentials'] = 'true';
          });
          
          // IMPORTANT: Gérer les WebSocket upgrades
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('🔌 WebSocket upgrade /openapi:', req.url);
            proxyReq.setHeader('Origin', 'https://37.64.205.84');
            proxyReq.setHeader('Host', '37.64.205.84');
          });
          
          proxy.on('open', (proxySocket) => {
            console.log('✅ WebSocket /openapi ouvert');
          });
          
          proxy.on('close', (res, socket, head) => {
            console.log('🔌 WebSocket /openapi fermé');
          });
        }
      },
      
      // Proxy pour Socket.IO LOCAL (votre WebRTC entre utilisateurs)
      '/socket.io': {
        target: 'https://webcall.vippinterstis.com:8000',
        // target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('[SOCKET.IO LOCAL] ❌ Erreur:', err.message);
          });
          
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('[SOCKET.IO LOCAL] 🔌 WebSocket upgrade:', req.url);
          });
          
          proxy.on('open', (proxySocket) => {
            console.log('[SOCKET.IO LOCAL] ✅ WebSocket ouvert');
          });
        }
      },
      
      // NOUVEAU: Proxy pour Socket.IO AVATAR (SDK vers serveur distant)
      '/avatar-socket': {
        target: 'https://37.64.205.84:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/avatar-socket/, '/socket.io'),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('[AVATAR SOCKET] ❌ Erreur:', err.message);
          });
          
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('[AVATAR SOCKET] 🎭 WebSocket upgrade vers serveur avatar:', req.url);
            proxyReq.setHeader('Host', '37.64.205.84');
          });
          
          proxy.on('open', (proxySocket) => {
            console.log('[AVATAR SOCKET] ✅ WebSocket avatar ouvert');
          });
          
          proxy.on('close', () => {
            console.log('[AVATAR SOCKET] 🔌 WebSocket avatar fermé');
          });
        }
      }
    }
  },
  
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true
  }
})