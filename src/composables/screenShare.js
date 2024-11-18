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
  
      // Publication du flux
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
  