// permet de créer un groupe d'utilisateurs
const createGroupID = async () => {
    const chat = Chat.create({ SDKAppID });
    const userIDList = calleeUserIDs.value.split(',').map(id => id.trim()).filter(id => id);
    const memberList = userIDList.map(userID => ({ userID }));
    const res = await chat.createGroup({ type: Chat.TYPES.GRP_PUBLIC, name: "WebSDK", memberList });
    groupID.value = res.data.group.groupID;
  };


  /**
 * permet de démarrer un appel en groupe
 * @param callType type d'appel (audio ou vidéo)
 */
const startGroupCall = async (callType) => {
    if (!groupID.value) {
      toast.error("Erreur : Aucun groupID trouvé.");
      return;
    }
    try {
      const userIDList = calleeUserIDs.value.split(',').map(id => id.trim()).filter(id => id);
      if (!userIDList.length) {
        toast.error("Veuillez entrer au moins un utilisateur ID.");
        return;
      }
      await TUICallKitServer.groupCall({ userIDList, groupID: groupID.value, type: callType });
      toast.info("Appel de groupe en cours...");
    } catch (error) {
      console.error(`Échec de l'appel de groupe: ${error}`);
    }
  };


  /**
 * permet la gestion du processus d'appel en groupe (création du groupID et démarrage de l'appel)
 */
const handleStartGroupCall = async () => {
    showGroupCallForm.value = false;
    await createGroupID();
    await startGroupCall(selectedCallType.value);
    isCallStarted.value = true;
  };
  
  // permet l'annulation de l'appel en groupe et la réinitialisation des données
  const cancelGroupCall = () => {
    showGroupCallForm.value = false;
    calleeUserIDs.value = '';
  };
