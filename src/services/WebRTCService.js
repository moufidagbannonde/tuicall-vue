class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isCallActive = false;
    this.isVideoEnabled = false;
    this.socket = null;
    this.currentUserId = null;
    this.remoteUserId = null;
    this.onRemoteStreamCallback = null;
    this.onCallStatusChangeCallback = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.onIceCandidateCallback = null;
    this.answerReceived = false;
    this.pendingCandidates = [];
    this.isNegotiating = false; // NOUVEAU : éviter les re-négociations simultanées

    this.configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:37.64.205.85:3478",
          username: "webrtc",
          credential: "VippInterstis@123",
        },
        {
          urls: "turn:37.64.205.85:3478?transport=tcp",
          username: "webrtc",
          credential: "VippInterstis@123",
        },
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };
  }

  debugRemoteStream(stream) {
    if (!stream) {
      console.error("Le flux distant est null ou undefined");
      return;
    }

    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track, index) => {
      console.log(`[DEBUG] Piste vidéo ${index}:`, {
        id: track.id,
        enabled: track.enabled,
        readyState: track.readyState
      });
    });

    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach((track, index) => {
      console.log(`[DEBUG] Piste audio ${index}:`, {
        id: track.id,
        enabled: track.enabled,
        readyState: track.readyState
      });
    });
  }

  initPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.remoteUserId) {
        const type = event.candidate.type;
        const protocol = event.candidate.protocol;
        const address = event.candidate.address || 'N/A';
        console.log(`[ICE] Envoi candidat: ${type} | Protocol: ${protocol} | IP: ${address}`);
        
        this.socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: this.remoteUserId,
          from: this.currentUserId,
        });
      } else if (!event.candidate) {
        console.log('[ICE] Tous les candidats envoyés');
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('[TRACK] Reçu track:', event.track.kind, 'streams:', event.streams.length);
      this.remoteStream = event.streams[0];
      this.debugRemoteStream(this.remoteStream);

      if (this.onRemoteStreamCallback) {
        console.log('[TRACK] Appel callback avec flux distant');
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('[WebRTC] Connection state:', state);
      
      if (state === 'connected') {
        this.isNegotiating = false; // Réinitialiser le flag
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('connected', this.remoteUserId, this.isVideoEnabled);
        }
      } else if (state === 'closed') {
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('ended', this.remoteUserId, false);
        }
      } else if (state === 'failed') {
        console.error('[WebRTC] ❌ Connexion échouée - redémarrage ICE...');
        this.restartIce();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      console.log('[WebRTC] ICE connection state:', state);
      
      if (state === 'connected' || state === 'completed') {
        console.log('[ICE] ✅ Connexion ICE établie');
      } else if (state === 'failed') {
        console.error('[ICE] ❌ ICE échoué - attente avant restart...');
        setTimeout(() => {
          if (this.peerConnection && this.peerConnection.iceConnectionState === 'failed') {
            this.restartIce();
          }
        }, 2000);
      } else if (state === 'disconnected') {
        console.warn('[ICE] ⚠️ ICE disconnected - attente reconnexion...');
        setTimeout(() => {
          if (this.peerConnection && this.peerConnection.iceConnectionState === 'disconnected') {
            console.log('[ICE] Toujours disconnected - tentative de reconnexion');
            this.restartIce();
          }
        }, 5000);
      }
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log('[ICE] Gathering state:', this.peerConnection.iceGatheringState);
    };

    // NOUVEAU : Gérer les renégociations
    this.peerConnection.onnegotiationneeded = async () => {
      if (this.isNegotiating) {
        console.log('[NEGOTIATION] Déjà en cours, ignoré');
        return;
      }

      console.log('[NEGOTIATION] Négociation nécessaire');
      // La renégociation sera gérée par restartIce() si nécessaire
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
  }

  setOnIceCandidateCallback(callback) {
    this.onIceCandidateCallback = callback;
  }

  async restartIce() {
    if (!this.peerConnection || this.isNegotiating) {
      console.log('[ICE] Restart ignoré (pas de PC ou déjà en cours)');
      return;
    }
    
    try {
      console.log('[ICE] 🔄 Redémarrage de la négociation ICE...');
      this.isNegotiating = true;
      
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      
      if (this.socket && this.remoteUserId) {
        this.socket.emit('call-offer', {
          offer: offer,
          to: this.remoteUserId,
          from: this.currentUserId,
          withVideo: this.isVideoEnabled,
          isIceRestart: true // NOUVEAU : indiquer qu'il s'agit d'un restart
        });
      }
    } catch (error) {
      console.error('[ICE] ❌ Erreur lors du restart:', error);
      this.isNegotiating = false;
    }
  }

  async getLocalMedia(withVideo) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: withVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isVideoEnabled = withVideo;

      if (this.peerConnection && this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      return {
        success: true,
        stream: this.localStream,
      };
    } catch (error) {
      if (error.name === "NotFoundError" && withVideo) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });

          if (this.peerConnection && this.localStream) {
            this.localStream.getTracks().forEach((track) => {
              this.peerConnection.addTrack(track, this.localStream);
            });
          }

          return {
            success: true,
            stream: this.localStream,
            fallbackToAudio: true,
          };
        } catch (audioError) {
          return {
            success: false,
            error: audioError,
            noAudioDevice: true,
          };
        }
      }
      return {
        success: false,
        error,
      };
    }
  }

  init(socket, userId, onRemoteStream, onCallStatusChange) {
    this.socket = socket;
    this.currentUserId = userId;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onCallStatusChange;
    this.setupSocketListeners();
  }

  async makeCall(remoteUserId, withVideo) {
    try {
      this.remoteUserId = remoteUserId;
      this.isCallActive = true;
      this.isVideoEnabled = withVideo;
      this.answerReceived = false;
      this.isNegotiating = true; // NOUVEAU
      
      this.initPeerConnection();

      if (!this.localStream) {
        const mediaResult = await this.getLocalMedia(withVideo);
        if (!mediaResult.success) {
          throw new Error("Failed to get local media");
        }
      }

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: withVideo,
      });
      await this.peerConnection.setLocalDescription(offer);

      if (this.onCallStatusChangeCallback) {
        this.onCallStatusChangeCallback("outgoing", remoteUserId, withVideo);
      }

      this.socket.emit("call-offer", {
        offer: this.peerConnection.localDescription,
        to: this.remoteUserId,
        from: this.currentUserId,
        withVideo: withVideo,
      });

      return true;
    } catch (error) {
      console.error("Error making call:", error);
      this.isCallActive = false;
      this.isNegotiating = false;
      return false;
    }
  }

  async setupSocketListeners() {
    if (!this.socket) return;

    // CRITIQUE : Retirer les anciens écouteurs pour éviter les doublons
    this.socket.off('call-offer');
    this.socket.off('ice-candidate');
    this.socket.off('call-answer');
    this.socket.off('call-ended');
    this.socket.off('media-state-change');
    this.socket.off('call-rejected');
    this.socket.off('error');

    this.pendingCandidates = [];

    this.socket.on("call-offer", async (data) => {
      if (data.to === this.currentUserId) {
        // NOUVEAU : Gérer les ICE restarts
        if (data.isIceRestart && this.peerConnection) {
          console.log('[OFFER] ICE Restart reçu');
          try {
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription(data.offer)
            );
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit("call-answer", {
              answer: this.peerConnection.localDescription,
              to: data.from,
              from: this.currentUserId,
              withVideo: this.isVideoEnabled,
            });
            
            this.isNegotiating = false;
          } catch (error) {
            console.error('[OFFER] Erreur ICE restart:', error);
          }
          return;
        }

        this.remoteUserId = data.from;
        this.isVideoEnabled = data.withVideo;
        this.pendingOffer = data.offer;

        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback(
            "incoming",
            data.from,
            data.withVideo
          );
        }
      }
    });

    this.socket.on("ice-candidate", async (data) => {
      if (data.to === this.currentUserId && this.peerConnection) {
        try {
          if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
            console.log('[ICE] Candidat ajouté:', data.candidate.type);
          } else {
            console.log('[ICE] Candidat en attente');
            this.pendingCandidates.push(data.candidate);
          }

          if (this.onIceCandidateCallback) {
            this.onIceCandidateCallback(data.candidate);
          }
        } catch (error) {
          console.error("[ICE] Erreur ajout candidat:", error);
        }
      }
    });

    this.socket.on("call-answer", async (data) => {
      if (data.to !== this.currentUserId || !this.peerConnection) {
        return;
      }
      
      const state = this.peerConnection.signalingState;
      console.log('[ANSWER] Réception, état:', state, 'answerReceived:', this.answerReceived);
      
      // PROTECTION 1 : Vérifier si on a déjà reçu une réponse
      if (this.answerReceived) {
        console.log('[ANSWER] ⚠️ Doublon ignoré (déjà traité)');
        return;
      }
      
      // PROTECTION 2 : Accepter seulement si on est en "have-local-offer"
      if (state !== 'have-local-offer') {
        console.log('[ANSWER] ⚠️ État invalide (' + state + '), ignoré');
        return;
      }
      
      // PROTECTION 3 : Marquer immédiatement comme reçu AVANT le traitement
      this.answerReceived = true;
      
      try {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        
        this.isNegotiating = false;
        console.log('[ANSWER] ✅ Remote description définie');

        // Ajouter les candidats en attente
        console.log('[ANSWER] Ajout de', this.pendingCandidates.length, 'candidats en attente');
        for (const candidate of this.pendingCandidates) {
          try {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } catch (e) {
            console.error('[ICE] Erreur ajout candidat:', e);
          }
        }
        this.pendingCandidates = [];
      } catch (error) {
        console.error('[ANSWER] ❌ Erreur:', error);
        // Ne PAS réinitialiser answerReceived pour éviter de retraiter
        this.isNegotiating = false;
      }
    });

    this.socket.on("call-ended", (data) => {
      if (data.to === this.currentUserId) {
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback("ended", data.from, false);
        }
        this.resetCall();
      }
    });

    this.onMediaStateChange = null;
    this.socket.on("media-state-change", (data) => {
      if (data.to === this.currentUserId) {
        if (this.onMediaStateChange) {
          this.onMediaStateChange(data);
        }
      }
    });

    this.socket.on("call-rejected", (data) => {
      if (data.to === this.currentUserId) {
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback("rejected", data.from, false);
        }
        this.resetCall();
      }
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }

  startRecording() {
    if (this.localStream && this.remoteStream) {
      const combinedStream = new MediaStream([
        ...this.localStream.getTracks(),
        ...this.remoteStream.getTracks(),
      ]);

      this.mediaRecorder = new MediaRecorder(combinedStream);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `call-recording-${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      this.mediaRecorder.start();
      return true;
    }
    return false;
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      return true;
    }
    return false;
  }

  async acceptCall() {
    try {
      if (!this.pendingOffer) {
        throw new Error("No pending offer to accept");
      }

      this.initPeerConnection();

      if (!this.localStream) {
        const mediaResult = await this.getLocalMedia(this.isVideoEnabled);
        if (!mediaResult.success) {
          throw new Error("Failed to get local media");
        }

        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(this.pendingOffer)
      );

      if (this.pendingCandidates && this.pendingCandidates.length > 0) {
        for (const candidate of this.pendingCandidates) {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
        this.pendingCandidates = [];
      }

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.isCallActive = true;

      this.socket.emit("call-answer", {
        answer: this.peerConnection.localDescription,
        to: this.remoteUserId,
        from: this.currentUserId,
        withVideo: this.isVideoEnabled,
      });

      return true;
    } catch (error) {
      console.error("Error accepting call:", error);
      this.isCallActive = false;
      return false;
    }
  }

  rejectCall() {
    if (this.remoteUserId && this.socket) {
      this.socket.emit("call-rejected", {
        to: this.remoteUserId,
        from: this.currentUserId,
      });

      this.resetCall();
    }
  }

  async endCall() {
    if (this.remoteUserId && this.socket && this.isCallActive) {
      this.socket.emit("call-ended", {
        to: this.remoteUserId,
        from: this.currentUserId,
      });
    }

    this.resetCall();
  }

  async resetCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.isCallActive = false;
    this.isVideoEnabled = false;
    this.remoteUserId = null;
    this.pendingOffer = null;
    this.answerReceived = false;
    this.isNegotiating = false; // NOUVEAU

    if (this.onCallStatusChangeCallback) {
      this.onCallStatusChangeCallback("idle", null, false);
    }
  }

  async toggleAudio(mute, remoteUserId, currentUserId) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !mute;
        this.socket.emit("toggle-audio", {
          to: remoteUserId,
          from: currentUserId || this.currentUserId,
          off: mute,
        });
      }
    }
  }

  async toggleVideo(off, remoteUserId, currentUserId) {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !off;
        this.socket.emit("toggle-video", {
          to: remoteUserId,
          from: currentUserId || this.currentUserId,
          off: off,
        });
      }
    }
  }
}

export default new WebRTCService();