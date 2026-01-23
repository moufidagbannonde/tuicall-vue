# Corrections du problème audio WebRTC

## Problème
L'appel passait correctement mais l'audio ne fonctionnait pas, malgré les logs indiquant que l'audio était activé.

## Causes identifiées

### 1. **Politique d'autoplay du navigateur**
- Les navigateurs modernes bloquent l'autoplay audio par défaut
- L'attribut `:muted="false"` sur l'élément `<video>` ne suffit pas

### 2. **Tracks audio non forcés à l'activation**
- Les tracks audio peuvent être reçus mais pas activés (`enabled = false`)
- Pas de vérification systématique de l'état des tracks

### 3. **Timing de l'activation audio**
- L'audio doit être activé AVANT et APRÈS le `play()`
- Nécessite des vérifications multiples pour garantir l'activation

### 4. **Watcher déclenchant plusieurs fois**
- Le watcher se déclenchait inutilement quand le flux était déjà attaché
- Causait des conflits et réinitialisations

## Solutions implémentées

### 1. **Fonction `forceEnableAudio()`**
```javascript
const forceEnableAudio = () => {
  if (!remoteVideo.value) return;
  
  // Forcer l'audio sur l'élément vidéo
  remoteVideo.value.muted = false;
  remoteVideo.value.volume = 1.0;
  
  // Activer tous les tracks audio
  const stream = remoteVideo.value.srcObject;
  if (stream) {
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach(track => {
      if (!track.enabled) {
        track.enabled = true;
      }
    });
  }
};
```

### 2. **Activation audio dans WebRTCService**
- Forcer `track.enabled = true` dès réception du track
- Activer les tracks audio locaux lors de `getLocalMedia()`

### 3. **Gestion améliorée du watcher**
- Vérifier si le flux est déjà attaché avant de réattacher
- Appeler `forceEnableAudio()` même si le flux est déjà attaché
- Vérifications multiples (immédiate + après 1 seconde)

### 4. **Bouton de lecture manuel**
- Afficher un bouton si l'autoplay est bloqué
- Permet à l'utilisateur de forcer la lecture avec interaction

### 5. **Handlers d'événements vidéo**
- `@loadedmetadata` : Forcer l'audio quand les métadonnées sont chargées
- `@canplay` : Forcer l'audio quand la vidéo peut être lue

## Vérifications à faire

1. **Tester dans différents navigateurs**
   - Chrome/Edge (politique autoplay stricte)
   - Firefox (plus permissif)
   - Safari (très restrictif)

2. **Vérifier les logs**
   ```
   [AUDIO] État: { muted: false, volume: 1, audioTracks: 1, allEnabled: true }
   [TRACK] ✅ Track audio forcé à enabled: <track-id>
   [WATCHER] ✅ Vérification finale audio: { ... }
   ```

3. **Tester les scénarios**
   - Appel audio uniquement
   - Appel vidéo
   - Basculement micro on/off
   - Reconnexion après perte réseau

## Commandes de débogage

### Dans la console du navigateur
```javascript
// Vérifier l'état de la vidéo distante
const video = document.getElementById('remoteVideo');
console.log({
  muted: video.muted,
  volume: video.volume,
  paused: video.paused,
  srcObject: video.srcObject
});

// Vérifier les tracks audio
const stream = video.srcObject;
const audioTracks = stream.getAudioTracks();
audioTracks.forEach(track => {
  console.log({
    id: track.id,
    enabled: track.enabled,
    readyState: track.readyState,
    muted: track.muted
  });
});
```

## Points d'attention

1. **Ne pas retirer l'attribut `autoplay`** - Il est nécessaire pour tenter la lecture automatique
2. **Ne pas utiliser `:muted="false"`** - Laisser le navigateur gérer, puis forcer via JavaScript
3. **Toujours vérifier `track.enabled`** - C'est différent de `track.muted`
4. **Gérer l'erreur `NotAllowedError`** - Afficher le bouton de lecture manuel

## Fichiers modifiés

1. **CallView.vue**
   - Ajout de `forceEnableAudio()`
   - Ajout de `handleRemoteVideoLoaded()` et `handleRemoteVideoCanPlay()`
   - Amélioration du watcher
   - Amélioration de `forcePlayRemoteVideo()`
   - Ajout du bouton de lecture manuel

2. **WebRTCService.js**
   - Forcer `track.enabled = true` dans `ontrack`
   - Activer les tracks audio dans `getLocalMedia()`

## Ressources

- [MDN: Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)
- [Chrome Autoplay Policy](https://developer.chrome.com/blog/autoplay/)
- [WebRTC MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack)
