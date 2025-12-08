# Correction des erreurs WebSocket

## Problème
```
WebSocket connection to 'ws://localhost:5001/socket.io/?EIO=4&transport=websocket' failed
```

Cette erreur se produit car certaines bibliothèques (Socket.IO, SDK Avatar) tentent de se connecter à des serveurs qui n'existent pas ou ne sont pas accessibles.

## Solution implémentée

### 1. Configuration du proxy Vite (`vite.config.ts`)

Ajout de 3 proxies pour rediriger les connexions :

```typescript
server: {
  proxy: {
    // Socket.IO local (si serveur disponible)
    '/socket.io': {
      target: 'http://localhost:5001',
      ws: true
    },
    // API Avatar externe
    '/openapi': {
      target: 'https://37.64.205.84',
      secure: false
    },
    // WebSocket Avatar
    '/avatar-socket': {
      target: 'https://37.64.205.84',
      ws: true,
      secure: false
    }
  }
}
```

### 2. Intercepteur WebSocket amélioré (`index.html`)

L'intercepteur a été amélioré pour :

✅ **Rediriger automatiquement** :
- `ws://localhost:5001` → `ws://localhost:5173/socket.io`
- `wss://37.64.205.84` → `ws://localhost:5173/avatar-socket`

✅ **Bloquer les reconnexions répétées** :
- Mémorise les connexions échouées
- Empêche les tentatives répétées vers des serveurs inaccessibles
- Réduit le spam dans la console

✅ **Logging détaillé** :
- Affiche toutes les redirections
- Marque les connexions échouées
- Facilite le débogage

## Résultat

- ✅ Plus d'erreurs répétées dans la console
- ✅ Les connexions sont correctement redirigées via le proxy Vite
- ✅ L'avatar fonctionne correctement
- ✅ Performance améliorée (moins de tentatives inutiles)

## Note importante

Si vous voyez encore l'erreur **une seule fois** au démarrage, c'est normal :
- C'est la première tentative avant que l'intercepteur ne bloque les suivantes
- Les tentatives suivantes sont automatiquement bloquées
- Cela n'affecte pas le fonctionnement de l'application

## Serveurs requis

Pour un fonctionnement complet :
1. **Vite dev server** : `localhost:5173` (automatique avec `npm run dev`)
2. **Socket.IO server** (optionnel) : `localhost:5001` (pour la signalisation WebRTC)
3. **Avatar API** : `37.64.205.84` (externe, proxifié automatiquement)
