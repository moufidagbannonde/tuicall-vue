# 🚨 ACTION IMMÉDIATE - Problème TURN

## Diagnostic
❌ **AUCUN candidat RELAY généré** → Les serveurs TURN sont bloqués par votre réseau

## Test rapide
1. Ouvrir : `http://localhost:5173/test-turn-simple.html`
2. Cliquer sur "Lancer le test"
3. Vérifier si des candidats RELAY apparaissent

## Solutions par ordre de priorité

### Solution 1: Tester depuis un autre réseau (IMMÉDIAT)
```bash
# Utiliser votre téléphone en partage de connexion (4G/5G)
# Ou tester depuis un autre réseau WiFi
```
✅ Si ça marche → Le problème vient du firewall/proxy de votre réseau actuel

### Solution 2: Forcer TURN uniquement (TEST)
Modifier temporairement `WebRTCService.js` :
```javascript
iceTransportPolicy: 'relay'  // Force TURN uniquement
```
⚠️ Cela échouera si TURN est bloqué, mais confirmera le diagnostic

### Solution 3: Vérifier le proxy/firewall
```bash
# Ports à ouvrir:
- UDP/TCP 80 (openrelay)
- UDP/TCP 443 (openrelay)  
- UDP/TCP 3478 (standard TURN)
- UDP 49152-65535 (range TURN)
```

### Solution 4: Utiliser un VPN
Si votre réseau d'entreprise bloque TURN, un VPN peut contourner le problème.

## Pourquoi ça ne marche pas?

### Votre situation actuelle:
```
Agent (10.38.2.205) → NAT → Internet (41.74.4.242)
                              ↓
                         BLOQUÉ par firewall/proxy
                              ↓
                         Serveurs TURN
```

### Ce qui devrait se passer:
```
✅ host: 10.38.2.205 (réseau local)
✅ srflx: 41.74.4.242 (via STUN)
❌ relay: [serveur TURN] (BLOQUÉ!)
```

## Test depuis la console navigateur

```javascript
// Coller dans la console Chrome/Firefox
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
});

pc.onicecandidate = e => {
  if (e.candidate) {
    console.log('✅', e.candidate.type, e.candidate.address);
  } else {
    console.log('🏁 Terminé');
  }
};

pc.createOffer({offerToReceiveAudio: true})
  .then(o => pc.setLocalDescription(o));
```

Attendez 10 secondes et vérifiez si vous voyez des candidats `relay`.

## Contournement temporaire

### Option A: Connexion directe (si même réseau)
Si agent et client sont sur le même réseau local, les candidats `host` suffisent.

### Option B: STUN uniquement (si NAT simple)
Si vous avez un NAT "cone" (pas restrictif), les candidats `srflx` peuvent suffire.

### Option C: Serveur TURN local
Installer coturn sur une machine accessible:
```bash
# Sur une machine sans firewall restrictif
apt install coturn
# Configurer et utiliser cette IP dans iceServers
```

## Vérification réseau

### Test 1: Ping serveur TURN
```bash
ping openrelay.metered.ca
# Devrait répondre
```

### Test 2: Telnet port 443
```bash
telnet openrelay.metered.ca 443
# Devrait se connecter
```

### Test 3: Curl
```bash
curl -v https://openrelay.metered.ca
# Devrait retourner une réponse
```

Si l'un de ces tests échoue → Problème réseau confirmé

## Logs à vérifier

### Navigateur
- Chrome: `chrome://webrtc-internals`
- Firefox: `about:webrtc`

Cherchez "relay" dans les candidats. Si absent → TURN bloqué.

### Console réseau
Ouvrir DevTools → Network → Filter "TURN"
Vérifier s'il y a des requêtes bloquées.

## Contact administrateur réseau

Si vous êtes en entreprise, demandez à débloquer:
```
Domaines:
- openrelay.metered.ca
- relay1.expressturn.com
- stun.l.google.com

Ports:
- 80/TCP et UDP
- 443/TCP et UDP
- 3478/TCP et UDP
- 49152-65535/UDP
```

## Résumé

🔴 **Problème**: Firewall/proxy bloque les serveurs TURN
🟡 **Test**: Essayer depuis un autre réseau (4G/5G)
🟢 **Solution**: Débloquer les ports TURN ou utiliser VPN

**L'appel ne fonctionnera PAS tant que TURN est bloqué si agent et client sont sur des réseaux différents avec NAT restrictif.**
