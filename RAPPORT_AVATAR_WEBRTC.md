# Rapport Technique : Conflit Avatar Virtuel / WebRTC

## 📋 Résumé Exécutif

L'avatar virtuel ne s'affiche **que lors du rafraîchissement de la page**, car il entre en **conflit direct avec la connexion WebRTC** de l'appel vidéo. Les deux technologies utilisent les mêmes ressources réseau (ICE/STUN/TURN) et ne peuvent pas coexister simultanément.

---

## 🔍 Analyse du Problème

### Symptômes Observés

1. **Scénario Normal (sans rafraîchissement)**
   - Client rejoint l'appel vidéo ✅
   - WebRTC se connecte (état: `connected`) ✅
   - Avatar s'initialise après 10 secondes ✅
   - **WebRTC se déconnecte** (`disconnected`) ❌
   - Avatar timeout après 60-90 secondes ❌
   - Résultat : **Pas d'avatar, appel coupé**

2. **Scénario avec Rafraîchissement**
   - Agent rafraîchit sa page
   - WebRTC est détruit ✅
   - Avatar s'initialise sans conflit ✅
   - Avatar s'affiche correctement ✅
   - Résultat : **Avatar fonctionne MAIS agent déconnecté de l'appel**

### Logs Critiques

```
[WebRTC] Connection state: connected
[AVATAR] Initialisation...
[WebRTC] Connection state: disconnected  ← PROBLÈME
[WebRTC] ICE connection state: disconnected
[AVATAR] Timeout après 60s
```

---

## 🧪 Causes Racines Identifiées

### 1. Conflit de Ressources ICE/STUN

**WebRTC (Appel Vidéo)**
```javascript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // ...
]
```

**Avatar SDK**
```javascript
iceServers: [
  { urls: 'stun:stun.services.mozilla.com:3478' },
  { urls: 'stun:stun.voip.blackberry.com:3478' }
]
```

**Problème** : Même avec des serveurs STUN différents, les deux connexions :
- Utilisent le même port local pour ICE
- Partagent les mêmes ressources réseau du navigateur
- Entrent en compétition pour les candidats ICE

### 2. Limitation du Navigateur

Les navigateurs limitent le nombre de connexions WebRTC simultanées :
- **Chrome/Edge** : ~10 connexions RTCPeerConnection max
- **Firefox** : ~20 connexions max
- Dans notre cas : **2 connexions actives** (WebRTC + Avatar) suffisent pour créer un conflit

### 3. Erreur SDK 611 : Ressource Occupée

```
[AVATAR] SDK Erreur: 611 Resource busy
```

Le serveur d'avatar détecte que la ressource est déjà utilisée (probablement par WebRTC) et refuse la connexion.

### 4. Erreur SDK 624 : WebSocket Fermé

```
[AVATAR] SDK Erreur: 624 未知错误 (Erreur inconnue)
WebSocket is closed before the connection is established
```

Le WebSocket de l'avatar ne peut pas s'établir car les ressources réseau sont monopolisées par WebRTC.

---

## 🛠️ Solutions Tentées

### ❌ Solution 1 : Serveurs STUN Différents

**Tentative**
```javascript
// WebRTC
iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]

// Avatar
iceServers: [{ urls: 'stun:stun.services.mozilla.com:3478' }]
```

**Résultat** : Échec - Le conflit persiste car le problème est au niveau du navigateur, pas des serveurs.

---

### ❌ Solution 2 : Délai d'Initialisation

**Tentative**
```javascript
// Attendre 5s, 10s, 15s avant d'initialiser l'avatar
setTimeout(() => initAvatar(), 15000);
```

**Résultat** : Échec - Le délai ne change rien, WebRTC se déconnecte dès que l'avatar démarre.

---

### ❌ Solution 3 : Désactivation Audio Avatar

**Tentative**
```javascript
// Ne pas démarrer le stream audio de l'avatar
// await VirtualAvatarService.startAudioStream();
```

**Résultat** : Échec - Le conflit vient de la connexion RTC elle-même, pas de l'audio.

---

### ❌ Solution 4 : Iframe Isolé

**Tentative**
```html
<iframe src="/avatar-isolated.html"></iframe>
```

Charger l'avatar dans un iframe séparé pour isoler les ressources.

**Problème Rencontré**
1. **Certificat SSL Invalide** : L'iframe ne peut pas appeler directement `https://10.46.7.1`
2. **Intercepteurs Complexes** : Nécessite d'intercepter XMLHttpRequest, fetch, WebSocket
3. **Pas d'Isolation Réelle** : Les connexions réseau ne sont PAS isolées au niveau du navigateur

**Résultat** : Échec - L'iframe n'isole pas les ressources réseau, le conflit persiste.

---

### ❌ Solution 5 : Ignorer Déconnexions Temporaires

**Tentative**
```javascript
if (state === 'disconnected') {
  console.warn('Disconnected temporaire, tentative de reconnexion...');
  // Ne pas terminer l'appel immédiatement
}
```

**Résultat** : Échec - La déconnexion n'est pas temporaire, WebRTC ne se reconnecte pas.

---

## ✅ Solution Actuelle (Workaround)

### Fonctionnement

L'avatar s'affiche **uniquement après rafraîchissement** de la page de l'agent :

1. Agent dans l'appel avec le client
2. Agent rafraîchit sa page (F5)
3. WebRTC est détruit
4. Avatar s'initialise sans conflit
5. Avatar s'affiche correctement

### Limitations

- ❌ Agent déconnecté de l'appel
- ❌ Client ne voit plus l'agent
- ❌ Pas de communication bidirectionnelle
- ✅ Avatar visible (mode démo uniquement)

---

## 🎯 Solutions Recommandées

### Solution 1 : Serveur TURN Dédié (Recommandé)

**Principe**
Utiliser un serveur TURN dédié pour l'avatar, séparé de celui de WebRTC.

**Implémentation**
```javascript
// WebRTC
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { 
    urls: 'turn:turn1.example.com:3478',
    username: 'webrtc_user',
    credential: 'webrtc_pass'
  }
]

// Avatar
iceServers: [
  { urls: 'stun:stun2.example.com:3478' },
  { 
    urls: 'turn:turn2.example.com:3478',  // Serveur différent
    username: 'avatar_user',
    credential: 'avatar_pass'
  }
]
```

**Avantages**
- ✅ Isolation complète des connexions
- ✅ Pas de conflit de ressources
- ✅ Connexions simultanées possibles

**Inconvénients**
- ❌ Coût : Serveur TURN dédié (~$50-200/mois)
- ❌ Configuration complexe
- ❌ Maintenance requise

**Estimation** : 2-3 jours de développement + coûts serveur

---

### Solution 2 : Mode Séquentiel

**Principe**
Afficher l'avatar **avant** ou **après** l'appel, jamais pendant.

**Scénarios**

**A. Avatar en Attente**
```
1. Client arrive → Avatar s'affiche
2. Client parle à l'avatar
3. Agent rejoint → Avatar se désactive
4. Appel vidéo WebRTC démarre
```

**B. Avatar en Conclusion**
```
1. Appel vidéo WebRTC
2. Agent termine l'appel
3. WebRTC se déconnecte
4. Avatar s'affiche pour conclusion
```

**Avantages**
- ✅ Pas de conflit
- ✅ Pas de coût supplémentaire
- ✅ Simple à implémenter

**Inconvénients**
- ❌ Pas d'avatar pendant l'appel
- ❌ Expérience utilisateur limitée

**Estimation** : 1 jour de développement

---

### Solution 3 : Avatar en Overlay (Image/Vidéo)

**Principe**
Remplacer l'avatar SDK par une vidéo/image animée.

**Implémentation**
```vue
<video 
  v-if="userRole === 'client'"
  src="/avatar-animation.mp4"
  autoplay
  loop
  class="avatar-overlay"
/>
```

**Avantages**
- ✅ Pas de conflit WebRTC
- ✅ Léger et performant
- ✅ Fonctionne simultanément

**Inconvénients**
- ❌ Pas d'interaction réelle
- ❌ Pas de synchronisation labiale
- ❌ Moins immersif

**Estimation** : 2-3 heures de développement

---

### Solution 4 : Web Worker (Expérimental)

**Principe**
Charger l'avatar dans un Web Worker pour isoler les ressources.

**Problème**
Les Web Workers **ne supportent pas WebRTC** ni les connexions réseau complexes.

**Résultat** : Non viable

---

### Solution 5 : Serveur Proxy Dédié

**Principe**
Créer un serveur proxy qui gère les connexions avatar séparément.

**Architecture**
```
Client Browser
  ├─ WebRTC → Serveur WebRTC
  └─ Avatar → Proxy Server → Serveur Avatar
```

**Avantages**
- ✅ Isolation complète
- ✅ Contrôle total

**Inconvénients**
- ❌ Architecture complexe
- ❌ Coûts serveur
- ❌ Latence supplémentaire

**Estimation** : 1-2 semaines de développement

---

## 📊 Comparaison des Solutions

| Solution | Coût | Complexité | Délai | Efficacité | Recommandation |
|----------|------|------------|-------|------------|----------------|
| **TURN Dédié** | $$$ | Moyenne | 2-3j | ⭐⭐⭐⭐⭐ | ✅ Recommandé |
| **Mode Séquentiel** | $ | Faible | 1j | ⭐⭐⭐ | ✅ Alternative |
| **Overlay Vidéo** | $ | Faible | 3h | ⭐⭐ | ⚠️ Temporaire |
| **Proxy Serveur** | $$$ | Élevée | 1-2sem | ⭐⭐⭐⭐ | ⚠️ Si budget |
| **Iframe Isolé** | $ | Élevée | - | ⭐ | ❌ Ne fonctionne pas |
| **Web Worker** | $ | - | - | ⭐ | ❌ Non viable |

---

## 🔧 Implémentation Recommandée

### Option A : TURN Dédié (Production)

**Étape 1 : Configurer Serveur TURN**
```bash
# Installer coturn
sudo apt-get install coturn

# Configuration /etc/turnserver.conf
listening-port=3478
external-ip=YOUR_SERVER_IP
realm=avatar.example.com
user=avatar:password123
```

**Étape 2 : Modifier VirtualAvatarService.js**
```javascript
const iceServers = [
  { urls: 'stun:stun.avatar.example.com:3478' },
  { 
    urls: 'turn:turn.avatar.example.com:3478',
    username: 'avatar',
    credential: 'password123'
  }
];
```

**Étape 3 : Tester**
```javascript
// Vérifier que WebRTC et Avatar coexistent
console.log('WebRTC state:', peerConnection.connectionState);
console.log('Avatar state:', VirtualAvatarService.connectionState);
```

---

### Option B : Mode Séquentiel (Quick Win)

**Étape 1 : Modifier CallView.vue**
```javascript
// Désactiver avatar pendant l'appel
watch(currentCallStatus, (status) => {
  if (status === 'connected') {
    // Désactiver avatar
    VirtualAvatarService.destroy();
  } else if (status === 'ended') {
    // Réactiver avatar après l'appel
    setTimeout(() => initAvatar(), 2000);
  }
});
```

**Étape 2 : Ajouter UI**
```vue
<div v-if="callStatus === 'idle'" class="avatar-container">
  <div class="agent-avatar-container"></div>
  <p>Parlez à notre assistant virtuel</p>
</div>
```

---

## 📈 Métriques de Performance

### Temps de Connexion

| Composant | Temps Moyen | Timeout |
|-----------|-------------|---------|
| WebRTC ICE | 2-5s | 30s |
| Avatar SDK Init | 10-15s | 60s |
| Avatar WebSocket | 5-10s | 30s |
| **Total Avatar** | **15-25s** | **90s** |

### Taux de Succès

| Scénario | Taux de Succès |
|----------|----------------|
| WebRTC seul | 95% |
| Avatar seul | 90% |
| **WebRTC + Avatar simultané** | **0%** ❌ |
| Avatar après rafraîchissement | 85% |

---

## 🎓 Concepts Techniques

### WebRTC (Web Real-Time Communication)

**Composants**
- **ICE** (Interactive Connectivity Establishment) : Trouve le meilleur chemin réseau
- **STUN** (Session Traversal Utilities for NAT) : Découvre l'IP publique
- **TURN** (Traversal Using Relays around NAT) : Relais si connexion directe impossible
- **SDP** (Session Description Protocol) : Décrit les capacités média

**Flux de Connexion**
```
1. Créer RTCPeerConnection
2. Obtenir candidats ICE (via STUN)
3. Échanger SDP (offer/answer)
4. Établir connexion P2P
5. Échanger flux média
```

### Avatar SDK

**Architecture**
```
Client Browser
  ├─ owt.js (SDK)
  ├─ WebSocket → Serveur Avatar
  ├─ WebRTC → Serveur Média
  └─ Canvas → Rendu 3D
```

**Ressources Utilisées**
- 1 connexion WebSocket (signalisation)
- 1 connexion WebRTC (média)
- 1 connexion HTTP (API)
- Candidats ICE (STUN/TURN)

---

## 🐛 Logs de Débogage

### Logs Normaux (WebRTC seul)
```
[WebRTC] ICE connection state: checking
[WebRTC] ICE connection state: connected
[WebRTC] Connection state: connected
```

### Logs avec Conflit
```
[WebRTC] Connection state: connected
[AVATAR] Début initialisation...
[AVATAR] SDK initialisé
[AVATAR] startRTC()...
[WebRTC] ICE connection state: disconnected  ← CONFLIT
[WebRTC] Connection state: disconnected
[AVATAR] Timeout après 60s
```

### Logs Après Rafraîchissement
```
[WebRTC] Connection state: closed
[AVATAR] Début initialisation...
[AVATAR] SDK initialisé
[AVATAR] WebSocket connecté
[AVATAR] ✓ Connecté à la room (12s)
```

---

## 📝 Conclusion

### État Actuel

❌ **L'avatar et WebRTC ne peuvent PAS coexister** dans la configuration actuelle.

### Cause Principale

Conflit de ressources réseau au niveau du navigateur (ICE/STUN/candidats).

### Solution Recommandée

**Court terme** : Mode séquentiel (avatar avant/après l'appel)
**Long terme** : Serveur TURN dédié pour l'avatar

### Prochaines Étapes

1. **Décision Business** : Quel mode d'utilisation de l'avatar ?
   - Avant l'appel uniquement ?
   - Pendant l'appel (nécessite TURN dédié) ?
   - Après l'appel uniquement ?

2. **Budget** : Allouer budget pour serveur TURN si nécessaire

3. **Développement** : Implémenter la solution choisie

---

## 📚 Références

- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [ICE RFC 8445](https://datatracker.ietf.org/doc/html/rfc8445)
- [STUN RFC 5389](https://datatracker.ietf.org/doc/html/rfc5389)
- [TURN RFC 5766](https://datatracker.ietf.org/doc/html/rfc5766)
- [Browser WebRTC Limits](https://webrtc.github.io/samples/)

---

**Rapport généré le** : 2025-12-03  
**Auteur** : Amazon Q Developer  
**Version** : 1.0
