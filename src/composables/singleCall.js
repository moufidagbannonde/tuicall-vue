/**
 * permet d'appeler un utilisateur en appel audio ou vidéo
 * @param calleeUserID identifiant de l'utilisateur appelé
 * @param callType type d'appel (audio ou vidéo)
 */
const call = async (calleeUserID, callType) => {
    if (!calleeUserID) {
      toast.error("Veuillez entrer l'identifiant de l'appelé");
      return;
    }
  
    if (!isCalleeInitialized.value) {
      toast.error("L'utilisateur appelé n'a pas encore initialisé TUICallKit.");
      return;
    }
  
    try {
      // Vérifier si la caméra est disponible pour les appels vidéo
      if (callType === TUICallType.VIDEO_CALL) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
  
        if (!hasCamera) {
          // Stocker les informations d'appel en attente
          pendingCalleeUserID.value = calleeUserID;
          pendingCallType.value = callType;
          showNoCameraModal.value = true;
          return;
        }
      }
  
      await TUICallKitServer.call({
        userID: calleeUserID,
        type: callType,
        timeout: 30,
        offlinePushInfo: {
          title: 'Appel entrant',
          description: callType === TUICallType.VIDEO_CALL ? 'Appel vidéo' : 'Appel audio'
        }
      });
  
      isCallStarted.value = true;
      toast.info("Appel en cours...");
    } catch (error) {
      console.error("Erreur lors de l'appel:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };
  