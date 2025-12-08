import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Pour contourner le certificat auto-signé
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

app.use('/wss', createProxyMiddleware({
    target: 'wss://37.64.205.84:443',
    ws: true,               // important pour WebSocket
    changeOrigin: true,
    secure: false           // ignore le certificat auto-signé
}));

app.listen(3000, () => {
    console.log('Proxy WSS en local sur ws://localhost:3000/wss');
});
