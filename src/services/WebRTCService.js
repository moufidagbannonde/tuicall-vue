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

    // Configuration STUN/TURN servers
    this.configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
          urls: "turn:relay.metered.ca:80",
          username: "f9b1a6e0a6a6a6a6a6a6a6a6",
          credential: "f9b1a6e0a6a6a6a6a6a6a6a6",
        },
        {
          urls: "turn:relay.metered.ca:443",
          username: "f9b1a6e0a6a6a6a6a6a6a6a6",
          credential: "f9b1a6e0a6a6a6a6a6a6a6a6",
        },
      ],
    };
  }

  debugRemoteStream(stream) {
    if (!stream) {
      console.error("Le flux distant est null ou undefined");
      return;
    }

    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track, index) => {});

    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach((track, index) => {});
  }

  /**
   * initialiser la connexion P2P (Peer-To-Peer)
   */
  initPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.remoteUserId) {
        this.socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: this.remoteUserId,
          from: this.currentUserId,
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];

      // Déboguer le flux distant
      this.debugRemoteStream(this.remoteStream);

      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      } else {
        console.warn(
          "Aucun callback onRemoteStreamCallback défini pour gérer le flux distant"
        );
      }
    };

    // Ajouter un gestionnaire d'événements pour la connexion
    this.peerConnection.onconnectionstatechange = (event) => {};

    // Ajouter un gestionnaire d'événements pour l'état de la signalisation
    this.peerConnection.onsignalingstatechange = (event) => {};

    // Ajouter un gestionnaire d'événements pour l'état de la connexion ICE
    this.peerConnection.oniceconnectionstatechange = (event) => {};

    // Ajouter les pistes du flux local si disponible
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
  }

  /**
   * Définit un callback pour les candidats ICE reçus
   * @param {function} callback - Fonction à appeler quand un candidat ICE est reçu
   */
  setOnIceCandidateCallback(callback) {
    this.onIceCandidateCallback = callback;
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

      // Ajouter les pistes au peer connection s'il existe
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
        // Essayer l'audio uniquement si la caméra n'est pas trouvée
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
  // Initialize the service with socket and user ID
  init(socket, userId, onRemoteStream, onCallStatusChange) {
    this.socket = socket;
    this.currentUserId = userId;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStatusChangeCallback = onCallStatusChange;

    // Setup socket event listeners
    this.setupSocketListeners();
  }
  // Setup socket event listeners for WebRTC signaling
  async makeCall(remoteUserId, withVideo) {
    try {
      this.remoteUserId = remoteUserId;
      this.isCallActive = true;
      this.isVideoEnabled = withVideo;
      // Initialize peer connection
      this.initPeerConnection();

      // S'assurer que nous avons un flux local avant de créer l'offre
      if (!this.localStream) {
        const mediaResult = await this.getLocalMedia(withVideo);
        if (!mediaResult.success) {
          throw new Error("Failed to get local media");
        }
      }

      // Create and send offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: withVideo,
      });
      await this.peerConnection.setLocalDescription(offer);

      // Mettre à jour l'état de l'appel avant d'envoyer l'offre
      if (this.onCallStatusChangeCallback) {
        this.onCallStatusChangeCallback("outgoing", remoteUserId, withVideo);
      }

      // Send the offer to remote peer
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
      return false;
    }
  }
  // écouteurs d'événements pour la signalisation WebRTC
  async setupSocketListeners() {
    if (!this.socket) return;

    // Stocker les candidats ICE en attente
    this.pendingCandidates = [];

    this.socket.on("call-offer", async (data) => {
      if (data.to === this.currentUserId) {
        this.remoteUserId = data.from;
        this.isVideoEnabled = data.withVideo;
        this.pendingOffer = data.offer;

        // Déclencher la confirmation d'appel
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
          if (this.peerConnection.remoteDescription) {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } else {
            this.pendingCandidates.push(data.candidate);
          }

          // Appeler le callback si défini
          if (this.onIceCandidateCallback) {
            this.onIceCandidateCallback(data.candidate);
          }
        } catch (error) {
          console.error("Error handling ICE candidate:", error);
        }
      }
    });

    this.socket.on("call-answer", async (data) => {
      if (data.to === this.currentUserId) {
        try {
          if (!this.peerConnection) {
            console.error("No peer connection when receiving answer");
            return;
          }
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );

          // Ajouter les candidats ICE en attente après la description distante
          for (const candidate of this.pendingCandidates) {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          }
          this.pendingCandidates = [];
        } catch (error) {
          console.error("Error in call-answer:", error);
        }
      }
    });

    // Ajouter l'écouteur pour la fin d'appel
    this.socket.on("call-ended", (data) => {
      if (data.to === this.currentUserId) {
        // Informer l'interface utilisateur
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback("ended", data.from, false);
        }
        // Réinitialiser l'état de l'appel
        this.resetCall();
      }
    });
    //   changement de périphériques média
    this.onMediaStateChange = null; // Ajouter cette ligne
    this.socket.on("media-state-change", (data) => {
      if (data.to === this.currentUserId) {
        if (this.onMediaStateChange) {
          this.onMediaStateChange(data);
        }
      }
    });

    // Appel rejeté
    this.socket.on("call-rejected", (data) => {
      if (data.to === this.currentUserId) {
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback("rejected", data.from, false);
        }
        this.resetCall();
      }
    });
    // erreur de connexion webSocket
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

      // Initialiser la connexion peer avant tout
      this.initPeerConnection();

      // Obtenir le flux local après avoir initialisé la connexion
      if (!this.localStream) {
        const mediaResult = await this.getLocalMedia(this.isVideoEnabled);
        if (!mediaResult.success) {
          throw new Error("Failed to get local media");
        }

        // S'assurer que les pistes sont ajoutées au peer connection
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Définir la description distante
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(this.pendingOffer)
      );

      // Ajouter les candidats ICE en attente après avoir défini la description distante
      if (this.pendingCandidates && this.pendingCandidates.length > 0) {
        for (const candidate of this.pendingCandidates) {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
        this.pendingCandidates = [];
      }

      // Créer et envoyer la réponse
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.isCallActive = true;

      // Mettre à jour le statut de l'appel
      if (this.onCallStatusChangeCallback) {
        this.onCallStatusChangeCallback(
          "connected",
          this.remoteUserId,
          this.isVideoEnabled
        );
      }
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
  // End an active call
  async endCall() {
    if (this.remoteUserId && this.socket && this.isCallActive) {
      this.socket.emit("call-ended", {
        to: this.remoteUserId,
        from: this.currentUserId,
      });
    }

    this.resetCall();
  }
  // Reset call state
  async resetCall() {
    // Stop all tracks in local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.isCallActive = false;
    this.isVideoEnabled = false;
    this.remoteUserId = null;
    this.pendingOffer = null;

    // Émettre un changement de statut
    if (this.onCallStatusChangeCallback) {
      this.onCallStatusChangeCallback("idle", null, false);
    }
  }
  // Toggle audio mute
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
  // Toggle video
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
