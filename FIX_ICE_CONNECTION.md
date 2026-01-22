# Correction du problème de connexion ICE

## Problème identifié
L'agent ne pouvait pas voir la vidéo du client et l'audio ne passait pas à cause d'un échec de la connexion ICE (Interactive Connectivity Establishment).

### Erreurs observées :
```
[WebRTC] Connection state: failed
[WebRTC] ❌ Connexion échouée
WebRTC: ICE failed, your TURN server appears to be broken
[ICE] ❌ ICE échoué
```

## Solutions appliquées

### 1. Amélioration de la configuration des serveurs ICE
- Ajout de serveurs STUN supplémentaires (stun1, stun2)
- Ajout de serveurs TURN de secours (openrelay.metered.ca)
- Configuration de plusieurs ports et protocoles (UDP/TCP, 80/443)
- Ajout de `iceTransportPolicy: 'all'` pour permettre tous les types de connexion

### 2. Mécanisme de redémarrage ICE automatique
- Détection automatique des échecs de connexion ICE
- Redémarrage automatique de la négociation ICE en cas d'échec
- Gestion des états `failed` et `disconnected`
- Timeout de 5 secondes avant retry en cas de déconnexion

### 3. Amélioration du logging
- Logs détaillés des candidats ICE (type, protocole, adresse, port, priorité)
- Meilleur suivi des états de connexion
- Identification plus facile des problèmes

## Configuration des serveurs ICE

```javascript
iceServers: [
  // Serveurs STUN (pour découvrir l'IP publique)
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  
  // Serveur TURN principal (votre serveur)
  {
    urls: "turn:37.64.205.85:3478",
    username: "webrtc",
    credential: "VippInterstis@123",
  },
  {
    urls: "turn:37.64.205.85:3478?transport=tcp",
    username: "webrtc",
    credential: "VippInterstis@123",
  },
  
  // Serveurs TURN de secours (openrelay)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  }
]
```

## Flux de redémarrage ICE

1. **Détection d'échec** : `iceConnectionState === 'failed'`
2. **Création d'une nouvelle offre** : `createOffer({ iceRestart: true })`
3. **Envoi via Socket.IO** : événement `ice-restart`
4. **Réponse du pair distant** : événement `ice-restart-answer`
5. **Nouvelle tentative de connexion** avec les nouveaux candidats ICE

## Vérifications à effectuer

### Côté serveur TURN (37.64.205.85)
```bash
# Vérifier que le serveur TURN est actif
sudo systemctl status coturn

# Vérifier les ports ouverts
sudo netstat -tulpn | grep 3478

# Tester la connectivité
telnet 37.64.205.85 3478
```

### Côté navigateur
1. Ouvrir `about:webrtc` (Firefox) ou `chrome://webrtc-internals` (Chrome)
2. Vérifier les candidats ICE générés
3. Vérifier quel candidat est sélectionné (host/srflx/relay)
4. Vérifier les statistiques de connexion

## Types de candidats ICE

- **host** : Connexion directe (même réseau local)
- **srflx** : Server Reflexive (via STUN, connexion P2P à travers NAT)
- **relay** : Relayé (via TURN, connexion indirecte)

## Recommandations

1. **Vérifier votre serveur TURN** : Assurez-vous qu'il est bien configuré et accessible
2. **Firewall** : Ouvrir les ports UDP/TCP 3478 sur votre serveur
3. **Logs** : Surveiller les logs pour identifier quel type de candidat est utilisé
4. **Fallback** : Les serveurs openrelay servent de secours si votre TURN échoue

## Test de connexion

Pour tester si les serveurs TURN fonctionnent :
```bash
# Installer trickle-ice
npm install -g trickle-ice

# Tester votre serveur TURN
trickle-ice --turn turn:37.64.205.85:3478 --username webrtc --password VippInterstis@123
```

## Prochaines étapes si le problème persiste

1. Vérifier les logs du serveur Socket.IO pour s'assurer que les événements `ice-restart` sont bien transmis
2. Vérifier la configuration du pare-feu côté agent et client
3. Tester avec un autre réseau pour éliminer les problèmes de NAT/firewall local
4. Considérer l'utilisation d'un service TURN managé (Twilio, Xirsys, etc.)
