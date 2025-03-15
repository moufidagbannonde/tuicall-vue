class WebRTCService {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.userId = null;
    this.remoteUserId = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isVideoEnabled = false;
    this.onRemoteStream = null;
    this.onCallStatusChange = null;
  }

  init(socket, userId, onRemoteStream, onCallStatusChange) {
    this.socket = socket;
    this.userId = userId;
    this.onRemoteStream = onRemoteStream;
    this.onCallStatusChange = onCallStatusChange;

    // Configurer les écouteurs d'événements
    this.socket.on('call-offer', this.handleOffer.bind(this));
    this.socket.on('call-answer', this.handleAnswer.bind(this));
    this.socket.on('ice-candidate', this.handleIceCandidate.bind(this));
  }

  async getLocalMedia(withVideo) {
    try {
      const constraints = {
        audio: true,
        video: withVideo
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isVideoEnabled = withVideo;
      return { success: true, stream: this.localStream };
    } catch (error) {
      console.error('Erreur lors de l\'accès aux médias:', error);
      return { success: false, error };
    }
  }

  async makeCall(targetUserId, withVideo) {
    this.remoteUserId = targetUserId;
    this.isVideoEnabled = withVideo;

    // Créer une nouvelle connexion peer
    this.createPeerConnection();

    // Ajouter les pistes locales
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    try {
      // Créer l'offre
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Envoyer l'offre
      this.socket.emit('call-offer', {
        offer: this.peerConnection.localDescription,
        from: this.userId,
        to: targetUserId,
        withVideo
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la création de l\'offre:', error);
      return { success: false, error };
    }
  }

  async handleOffer(data) {
    console.log('Offre reçue:', data);
    this.remoteUserId = data.from;
    this.isVideoEnabled = data.withVideo;

    // Créer une connexion peer si elle n'existe pas
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    try {
      // Définir l'offre distante
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    } catch (error) {
      console.error('Erreur lors de la définition de l\'offre distante:', error);
    }
  }

  async acceptCall() {
    try {
      // Ajouter les pistes locales si elles existent
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Créer une réponse
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Envoyer la réponse
      this.socket.emit('call-answer', {
        answer: this.peerConnection.localDescription,
        to: this.remoteUserId, 
        withVideo: this.isVideoEnabled
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de l\'appel:', error);
      return { success: false, error };
    }
  }

  async handleAnswer(answer) {
    console.log('Réponse reçue:', answer);
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Erreur lors de la définition de la réponse distante:', error);
    }
  }

  handleIceCandidate(data) {
    if (data.candidate) {
      try {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('Erreur lors de l\'ajout du candidat ICE:', error);
      }
    }
  }

  createPeerConnection() {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Gérer les candidats ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          from: this.userId,
          to: this.remoteUserId
        });
      }
    };

    // Gérer les pistes distantes
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Gérer les changements d'état de connexion
    this.peerConnection.onconnectionstatechange = () => {
      console.log('État de connexion:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'connected') {
        if (this.onCallStatusChange) {
          this.onCallStatusChange('connected', this.remoteUserId, this.isVideoEnabled);
        }
      }
    };

    return this.peerConnection;
  }

  endCall() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.remoteStream = null;
    this.remoteUserId = null;
  }
}

export default new WebRTCService();
