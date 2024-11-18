// initialisation TRTC
async function initTRTC(callerUserID) {
    const userID = String(callerUserID);
  
  
    // Générer le userSig(signature d'utilisateur) et extraire la chaîne
    const { userSig } = GenerateTestUserSig.genTestUserSig({
      userID: userID,
      SDKAppID,
      SecretKey: SDKSecretKey
    });
  
    client = TRTC.createClient({
      mode: 'rtc',
      sdkAppId: SDKAppID,
      userId: userID,
      userSig: userSig
    });
  
    // Configuration des événements
    client.on('stream-added', async (event) => {
      const remoteStream = event.stream;
      console.log('Nouveau flux distant détecté:', remoteStream.getId());
      await client.subscribe(remoteStream);
    });
  
    // événement pour la gestion correcte de l'affichage
    client.on('stream-subscribed', (event) => {
      const remoteStream = event.stream;
      const streamId = remoteStream.getId();
      const userId = remoteStream.getUserId();
      const streamType = remoteStream.getType();
  
      console.log('Stream souscrit:', {
        streamId,
        userId,
        streamType,
        clientId: client.userId
      });
  
      // Non affichage du propre flux de partage d'écran
      if (userId === client.userId) {
        console.log('Ignorer l\'affichage du flux local');
        return;
      }
  
      // Création ou réutilisation de la div pour le flux distant
      let remoteDiv = document.getElementById(`remote-${streamId}`);
      if (!remoteDiv) {
        remoteDiv = document.createElement('div');
        remoteDiv.id = `remote-${streamId}`;
        remoteDiv.className = 'w-full h-full rounded-lg overflow-hidden';
        document.querySelector('#remoteContainer').appendChild(remoteDiv);
      }
  
      // Jouer le flux distant
      remoteStream.play(remoteDiv.id);
    });
    client.on('stream-removed', (event) => {
      const remoteStream = event.stream;
      const streamId = remoteStream.getId();
      console.log('Stream supprimé:', streamId);
      cleanupRemoteStream(streamId);
    });
  
    try {
      await client.join({ roomId: roomID.value });
      isTRTCInitialized.value = true;
      toast.success("Connecté à la salle avec succès !");
    } catch (error) {
      console.error("Erreur lors de la connexion à la salle : ", error);
      toast.error("Erreur lors de la connexion à la salle");
    }
  }