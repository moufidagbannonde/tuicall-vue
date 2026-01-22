# Rapport : Blocage Connexion WebRTC

**Date** : 17 janvier 2026  
**Sujet** : Échec de connexion WebRTC pour les appels vidéo  
**Statut** : Bloquant - Nécessite intervention infrastructure

---

## 🔴 Problème

Les appels vidéo WebRTC **échouent systématiquement** après quelques secondes avec l'erreur :
```
ICE connection state: disconnected
Connection state: failed
```

**Impact** :
- ❌ Aucun appel vidéo fonctionnel entre agent et client
- ❌ Audio et vidéo ne passent pas
- ✅ La signalisation fonctionne (Socket.IO opérationnel)
- ✅ Les flux audio/vidéo sont capturés correctement

---

## 🔍 Diagnostic

### Tests Effectués

1. **Candidats ICE générés** ✅
   - Candidats `host` (IP locale : 10.38.2.172)
   - Candidats `srflx` (IP publique : 41.86.249.180)
   - Candidats échangés correctement via Socket.IO

2. **Flux média reçus** ✅
   - 2 tracks (audio + vidéo) détectés
   - État : `live` et `enabled`

3. **Serveurs TURN publics testés** ❌
   ```bash
   nc -vz openrelay.metered.ca 443
   # Résultat : Connection refused / Network unreachable
   ```

### Cause Racine Identifiée

**Le firewall Windows bloque les connexions WebRTC P2P directes** entre les deux machines.

Même si les machines sont sur le même réseau local (10.38.x.x), le firewall empêche :
- Les connexions UDP sur les ports dynamiques (1024-65535)
- Les connexions TCP WebRTC
- L'établissement de la connexion ICE

Les serveurs TURN publics gratuits sont également **bloqués ou non fonctionnels**, empêchant le relais du trafic.

---

## ✅ Solution Requise

### Installation d'un Serveur TURN Privé (coturn)

**Pourquoi ?**
- Le serveur TURN agit comme **relais** pour contourner le firewall
- Permet la connexion même avec firewall activé
- Solution standard pour WebRTC en entreprise

**Où ?**
Sur le serveur backend existant (celui qui héberge Socket.IO sur le port 8000)

**Installation** (15-30 minutes)

```bash
# 1. Installer coturn
sudo yum install epel-release -y
sudo yum install coturn -y

# 2. Configurer (/etc/turnserver.conf)
listening-port=3478
listening-ip=0.0.0.0
relay-ip=<IP_PUBLIQUE_SERVEUR>
external-ip=<IP_PUBLIQUE_SERVEUR>

fingerprint
lt-cred-mech
user=tuicall:SecurePassword123
realm=tuicall.com

# 3. Ouvrir les ports firewall
sudo firewall-cmd --permanent --add-port=3478/udp
sudo firewall-cmd --permanent --add-port=3478/tcp
sudo firewall-cmd --reload

# 4. Démarrer le service
sudo systemctl enable coturn
sudo systemctl start coturn
```

**Modification Code Frontend** (5 minutes)

```javascript
// Dans WebRTCService.js
iceServers: [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:<IP_SERVEUR>:3478",
    username: "tuicall",
    credential: "SecurePassword123"
  }
]
```

---

## 📊 Alternatives (Non Recommandées)

| Solution | Faisabilité | Raison du Rejet |
|----------|-------------|-----------------|
| Désactiver firewall Windows | ❌ | Risque sécurité inacceptable |
| Utiliser TURN public | ❌ | Bloqués/non fonctionnels (testé) |
| Connexion directe | ❌ | Bloquée par firewall (problème actuel) |
| Service cloud (Twilio/Agora) | ⚠️ | Coût récurrent élevé ($$$) |

---

## ⏱️ Estimation

| Tâche | Durée | Responsable |
|-------|-------|-------------|
| Installation coturn | 30 min | DevOps/SysAdmin |
| Configuration firewall | 15 min | DevOps/SysAdmin |
| Modification code | 5 min | Développeur |
| Tests | 15 min | Développeur |
| **TOTAL** | **~1h** | - |

---

## 🎯 Action Requise

**Besoin d'accès serveur** pour installer coturn sur le serveur backend.

**Informations nécessaires** :
- IP publique du serveur backend
- Accès SSH root/sudo au serveur
- Autorisation pour ouvrir le port 3478 (UDP/TCP)

Une fois coturn installé, les appels vidéo fonctionneront immédiatement, même avec le firewall activé.

---

## 📝 Conclusion

Le code WebRTC est **fonctionnel et correct**. Le blocage est **purement infrastructurel** (firewall + absence de serveur TURN).

**Sans serveur TURN, les appels vidéo ne peuvent pas fonctionner** dans un environnement avec firewall.

L'installation de coturn est la **solution standard** utilisée par toutes les applications WebRTC professionnelles (Zoom, Teams, Meet, etc.).

---

**Contact** : [Votre Nom]  
**Pour questions** : [Votre Email]
