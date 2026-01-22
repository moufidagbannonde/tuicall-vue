# Test Console Navigateur

## Copier-coller ce code dans la console (F12)

```javascript
// 🔍 DIAGNOSTIC RAPIDE - Copier tout ce code dans la console
// Si erreur "redeclaration", appuyer sur F5 pour rafraîchir la page d'abord

(function() {
  console.clear();
  console.log('%c🔍 DIAGNOSTIC RÉSEAU vs NAVIGATEUR', 'font-size: 20px; font-weight: bold; color: #4caf50');

  // Test 1: WebRTC supporté?
  const webrtcOK = !!(window.RTCPeerConnection && navigator.mediaDevices);
  console.log(webrtcOK ? '✅ WebRTC supporté' : '❌ WebRTC NON supporté → PROBLÈME NAVIGATEUR');

  // Test 2: HTTPS?
  const httpsOK = location.protocol === 'https:' || location.hostname === 'localhost';
  console.log(httpsOK ? '✅ HTTPS/localhost OK' : '⚠️ HTTP détecté → Utiliser HTTPS');

  // Test 3: Permissions caméra/micro
  navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then(stream => {
      stream.getTracks().forEach(t => t.stop());
      console.log('✅ Permissions caméra/micro OK');
    })
    .catch(err => {
      console.log('❌ Permissions refusées → PROBLÈME NAVIGATEUR');
      console.log('   Solution: Cliquer sur 🔒 dans la barre d\'adresse et autoriser');
    });

  // Test 4: Candidats ICE (LE PLUS IMPORTANT)
  console.log('\n⏳ Test des candidats ICE (10 secondes)...\n');

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: "turn:37.64.205.85:3478",
        username: "webrtc",
        credential: "VippInterstis@123",
      },
      {
        urls: "turn:37.64.205.85:3478?transport=tcp",
        username: "webrtc",
        credential: "VippInterstis@123",
      }
    ]
  });

  const candidats = { host: 0, srflx: 0, relay: 0 };

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      const type = e.candidate.type;
      candidats[type] = (candidats[type] || 0) + 1;
      
      const emoji = type === 'relay' ? '✅' : type === 'srflx' ? '🔵' : '⚪';
      console.log(`${emoji} ${type.toUpperCase()}: ${e.candidate.address}:${e.candidate.port}`);
    } else {
      console.log('\n📊 RÉSULTATS:');
      console.log(`⚪ Host (local): ${candidats.host}`);
      console.log(`🔵 Srflx (STUN): ${candidats.srflx}`);
      console.log(`✅ Relay (TURN): ${candidats.relay}`);
      
      console.log('\n🎯 DIAGNOSTIC:');
      if (candidats.relay > 0) {
        console.log('%c✅ TOUT FONCTIONNE - L\'appel devrait marcher', 'color: #4caf50; font-weight: bold; font-size: 14px');
      } else if (candidats.srflx > 0) {
        console.log('%c⚠️ TURN BLOQUÉ - Problème réseau (firewall/proxy)', 'color: #ff9800; font-weight: bold; font-size: 14px');
        console.log('   Solutions:');
        console.log('   1. Tester depuis 4G/5G (partage connexion téléphone)');
        console.log('   2. Utiliser un VPN');
        console.log('   3. Contacter admin réseau pour débloquer ports TURN');
      } else {
        console.log('%c❌ RÉSEAU TRÈS RESTRICTIF', 'color: #f44336; font-weight: bold; font-size: 14px');
        console.log('   Même STUN est bloqué → Firewall très strict');
      }
      
      pc.close();
    }
  };

  pc.createOffer({ offerToReceiveAudio: true })
    .then(o => pc.setLocalDescription(o))
    .catch(err => console.log('❌ Erreur:', err));
})();
```

## Interprétation des résultats

### ✅ Si vous voyez des candidats RELAY
→ **Tout fonctionne** - L'appel devrait marcher
→ Problème ailleurs (vérifier le code)

### ⚠️ Si vous voyez SRFLX mais PAS de RELAY
→ **Problème RÉSEAU** - Firewall/proxy bloque TURN
→ Solutions:
   1. Tester depuis 4G/5G
   2. Utiliser un VPN
   3. Contacter admin réseau

### ❌ Si vous ne voyez QUE des candidats HOST
→ **Réseau très restrictif** - Même STUN bloqué
→ Impossible de faire des appels entre réseaux différents

### ❌ Si erreur "getUserMedia"
→ **Problème NAVIGATEUR** - Permissions refusées
→ Cliquer sur 🔒 dans la barre d'adresse et autoriser

## Test rapide alternatif

Ouvrir dans votre navigateur:
```
http://localhost:5173/diagnostic-complet.html
```

Cliquer sur "LANCER TOUS LES TESTS"
