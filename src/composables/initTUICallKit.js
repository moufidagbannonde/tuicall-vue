/**
 * permet d'initialiser TUICallKit
 * @param callerUserID 
 */
const init = async (callerUserID) => {
    if (!callerUserID) {
      toast.error("Veuillez entrer un utilisateur ID valide!");
      return;
    }
  
    const { userSig } = GenerateTestUserSig.genTestUserSig({
      userID: callerUserID,
      SDKAppID,
      SecretKey: SDKSecretKey
    });
  
    try {
      await TUICallKitServer.init({
        userID: callerUserID,
        userSig,
        SDKAppID,
        // Ajout des gestionnaires d'événements
        events: {
          onInvited: handleIncomingCall,
          onUserEnter: handleUserEnter,
          onUserLeave: handleUserLeave,
          onCallEnd: handleCallEnd,
          onError: handleError,
          onCallAccepted: () => {
            isCallStarted.value = true;
            toast.success("Appel accepté !");
          },
          onCallRejected: () => {
            isCallStarted.value = false;
            toast.info("Appel rejeté !");
          },
          onUserAccept: () => {
            isCallStarted.value = true;
            toast.success("Vous aviez accepté l'appel !");
          },
          onUserReject: () => {
            isCallStarted.value = false;
            toast.info("Vous aviez rejeté l'appel !");
          }
        }
      });
  
      // Initialiser TRTC après TUICallKit
      await initTRTC(callerUserID);
  
      isCalleeInitialized.value = true;
      toast.success("TUICallKit initialisé avec succès !");
    } catch (error) {
      console.error("Erreur d'initialisation:", error);
      toast.error(`Erreur lors de l'initialisation : ${error}` );
    }
  };

  const handleInit = async (userID) => {
    try {
      await init(userID);
      // autres actions après l'initialisation si nécessaire
    } catch (error) {
      console.error("Erreur lors de l'initialisation:", error);
      toast.error("Erreur lors de l'initialisation");
    }
  };

  