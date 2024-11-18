import { onMounted, onUnmounted, ref, watch } from 'vue';
import { TUICallKitServer, TUICallType } from '@tencentcloud/call-uikit-vue';

import * as GenerateTestUserSig from '../debug/GenerateTestUserSig-es';
import Chat from "@tencentcloud/chat";
import { useToast } from 'vue-toastification';
import TRTC from 'trtc-js-sdk';


// variables globales
const isCallActive = ref(false);
const SDKAppID = 1400787156;
const SDKSecretKey = "3d1d8898c74bdcc7cd7357d97d7df3ea38c5cc559087e889e46c1ffd2d67c2a9";
const isCalleeInitialized = ref(false);
const isCallStarted = ref(false);
const calleeUserIDs = ref('');
const groupID = ref('');
const selectedCallType = ref(TUICallType.VIDEO_CALL);
const showGroupCallForm = ref(false);
const toast = useToast();
const roomID = ref(1);
const currentScreenSharer = ref(null);
const isScreenSharing = ref(false);
const currentUserID = ref(null);
const showNoCameraModal = ref(false);
let pendingCalleeUserID = ref(null);
let pendingCallType = ref(null);

// variables partage écran
const isTRTCInitialized = ref(false);
const screenStream = ref(null);
let client = null;



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

        // Création  de la div pour le flux distant
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

/**
 * permet le démarrage du partage d'écran
 */
async function startScreenShare() {
    try {
        if (currentScreenSharer.value) {
            toast.warning("Un partage d'écran est déjà en cours");
            return;
        }

        screenStream.value = await TRTC.createStream({
            screen: true,
            screenAudio: true,
        });

        await screenStream.value.initialize();

        screenStream.value.on('screen-sharing-stopped', () => {
            stopScreenCapture();
        });

        // Publication du flux aux autre participants
        await client.publish(screenStream.value);
        currentScreenSharer.value = currentUserID.value;
        isScreenSharing.value = true;

        console.log('Partage démarré avec succès, stream ID:', screenStream.value.getId());
        toast.success("Partage d'écran démarré avec succès!");
    } catch (error) {
        console.error("Erreur lors du partage d'écran : ", error);
        toast.error(`Erreur lors du partage d'écran : ${error.message}`);
        screenStream.value = null;
    }
}

// watch pour surveiller les changements de l'utilisateur en partage d'écran
watch(currentScreenSharer, (newVal) => {
    if (newVal && newVal !== currentUserID.value) {
        // Désactiver le bouton de partage pour les autres utilisateurs
        isScreenSharing.value = false;
    }
});

// watch pour surveiller les changements de l'appel
watch(isCallStarted, (newValue) => {
    console.log("La valeur de isCallStarted a changé et est maintenant : ", newValue);
})

/**
 * permet de nettoyer le flux distant
 * @param streamId identifiant du flux distant
 */
function cleanupRemoteStream(streamId) {
    const remoteDiv = document.getElementById(`remote-${streamId}`);
    if (remoteDiv) {
        remoteDiv.remove();
    }
}

/**
 * permet de quitter la salle , c'est-à-dire la déconnexion 
 */
async function leaveRoom() {
    if (client) {
        if (screenStream.value) {
            await stopScreenCapture();
        }
        await client.leave();
        client = null;
        isTRTCInitialized.value = false;
    }
}

/**
 * permet d'arrêter le partage d'écran
 */
async function stopScreenCapture() {
    try {
        console.log('Tentative d\'arrêt du partage, état actuel:', {
            hasStream: !!screenStream.value,
            isSharing: isScreenSharing.value,
            currentSharer: currentScreenSharer.value
        });

        if (screenStream.value) {
            // arrêter l'affichage du flux
            if (client) {
                console.log('Unpublishing stream...');
                await client.unpublish(screenStream.value);
            }

            // Arrêter le stream
            console.log('Stopping stream...');
            screenStream.value.stop();

            // Nettoyer les éléments visuels
            const streamId = screenStream.value.getId();
            console.log('Cleaning up stream:', streamId);

            const remoteContainer = document.getElementById('remoteContainer');
            if (remoteContainer) {
                const remoteDivs = remoteContainer.querySelectorAll(`[id^="remote-"]`);
                remoteDivs.forEach(div => {
                    if (div.id.includes(streamId)) {
                        div.remove();
                    }
                });
            }

            // Réinitialiser les états des variables de partage 
            screenStream.value = null;
            isScreenSharing.value = false;
            currentScreenSharer.value = null;

            toast.success("Partage d'écran arrêté avec succès");
        } else {
            console.log('Aucun stream à arrêter');
            toast.warning("Aucun partage d'écran actif");
        }
    } catch (error) {
        console.error("Erreur lors de l'arrêt du partage d'écran:", error);
        toast.error(`Erreur lors de l'arrêt du partage d'écran: ${error.message}`);
    }
}

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
        toast.error(`Erreur lors de l'initialisation : ${error}`);
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

/**
 * permet de confirmer l'appel audio en cas de non détection de caméra
 */
const handleNoCameraConfirm = async () => {
    showNoCameraModal.value = false;
    if (pendingCalleeUserID.value) {
        await call(pendingCalleeUserID.value, TUICallType.AUDIO_CALL);
        pendingCalleeUserID.value = null;
        pendingCallType.value = null;
    }
};

/**
 * permet d'annuler l'appel audio en cas de non détection de caméra
 */
const handleNoCameraCancel = () => {
    showNoCameraModal.value = false;
    pendingCalleeUserID.value = null;
    pendingCallType.value = null;
    toast.info("Appel annulé");
};

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

/**
 * événements
 */

// permet de gérer les appels entrants
const handleIncomingCall = (event) => {
    const { inviter, type } = event;
    console.log('Appel entrant de:', inviter, 'type:', type);
    isCallStarted.value = true;
    toast.info(`Appel entrant de ${inviter}`);
};

// permet de gérer les utilisateurs entrants
const handleUserEnter = (userID) => {
    console.log('Utilisateur entré:', userID);
    isCallStarted.value = true;
    isCallActive.value = true;
    toast.success(`${userID} a rejoint l'appel`);
};

// permet de gérer les utilisateurs qui quittent l'appel
const handleUserLeave = (userID) => {
    console.log('Utilisateur parti:', userID);
    toast.info(`${userID} a quitté l'appel`);
};

// permet de gérer la fin de l'appel
const handleCallEnd = () => {
    console.log('Appel terminé');
    isCallStarted.value = false;
    isCallActive.value = false;

    if (screenStream.value || isScreenSharing.value) {
        stopScreenCapture();
    }
    toast.info("Appel terminé");
};

// permet de nettoyer l'état lors de la déconnexion ,c'est-à-dire lorsque l'utilisateur quitte la page
const cleanup = () => {
    isCallActive.value = false;
    isCallStarted.value = false;
    if (screenStream.value) {
        stopScreenCapture();
    }
};

// permet de gérer les erreurs
const handleError = (error) => {
    console.error('Erreur durant l\'appel:', error);
    toast.error(`Erreur: ${error.message}`);
};

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

export {
    isCallActive,
    isCalleeInitialized,
    isCallStarted,
    calleeUserIDs,
    groupID,
    selectedCallType,
    showGroupCallForm,
    roomID,
    currentScreenSharer,
    isScreenSharing,
    currentUserID,
    showNoCameraModal,
    isTRTCInitialized,
    initTRTC,
    startScreenShare,
    leaveRoom,
    stopScreenCapture,
    init,
    handleInit,
    handleNoCameraConfirm,
    handleNoCameraCancel,
    call,
    handleIncomingCall,
    handleUserEnter,
    handleUserLeave,
    handleCallEnd,
    cleanup,
    handleError,
    createGroupID,
    startGroupCall,
    handleStartGroupCall,
    cancelGroupCall
};