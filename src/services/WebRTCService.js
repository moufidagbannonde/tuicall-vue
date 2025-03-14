class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.socket = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentUserId = null;
    this.onStreamCallback = null;
    this.onStatusCallback = null;
  }

  static init(socket, userId, onStream, onStatus) {
    if (!this.instance) {
      this.instance = new WebRTCService();
    }
    this.instance.socket = socket;
    this.instance.currentUserId = userId;
    this.instance.onStreamCallback = onStream;
    this.instance.onStatusCallback = onStatus;
    return this.instance;
  }

  static async getLocalMedia(withVideo = false) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: withVideo,
        audio: true
      });
      this.instance.localStream = stream;
      return { success: true, stream };
    } catch (error) {
      console.error('Error getting local media:', error);
      return { success: false, error };
    }
  }

  static async acceptCall(remoteUserId, withVideo = true) {
    try {
      // Initialiser le flux local d'abord
      const mediaResult = await this.getLocalMedia(withVideo);
      if (!mediaResult.success) {
        throw new Error('Failed to get local media');
      }

      this.instance.remoteUserId = remoteUserId;

      // Créer une nouvelle connexion peer
      this.instance.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Ajouter les gestionnaires d'événements
      this.instance.peerConnection.ontrack = (event) => {
        this.instance.remoteStream = event.streams[0];
        if (this.instance.onStreamCallback) {
          this.instance.onStreamCallback(event.streams[0]);
        }
      };

      // Ajouter le flux local
      this.instance.localStream.getTracks().forEach(track => {
        this.instance.peerConnection.addTrack(track, this.instance.localStream);
      });

      // Créer et envoyer l'offre
      const offer = await this.instance.peerConnection.createOffer();
      await this.instance.peerConnection.setLocalDescription(offer);

      // Émettre l'acceptation avec l'offre
      this.instance.socket.emit('call-accepted', {
        from: this.instance.currentUserId,
        to: remoteUserId,
        localDescription: offer
      });

      // Gérer les candidats ICE
      this.instance.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.instance.socket.emit('ice-candidate', {
            candidate: event.candidate,
            from: this.instance.currentUserId,
            to: remoteUserId
          });
        }
      };

      return true;
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  }

  static rejectCall() {
    if (this.instance && this.instance.socket) {
      this.instance.socket.emit('call-rejected', {
        from: this.instance.currentUserId
      });
    }
  }

  static endCall() {
    if (this.instance) {
      // Fermer la connexion peer
      if (this.instance.peerConnection) {
        this.instance.peerConnection.close();
        this.instance.peerConnection = null;
      }

      // Arrêter les flux
      if (this.instance.localStream) {
        this.instance.localStream.getTracks().forEach(track => track.stop());
        this.instance.localStream = null;
      }

      // Émettre la fin d'appel
      if (this.instance.socket) {
        this.instance.socket.emit('call-ended', {
          from: this.instance.currentUserId
        });
      }
    }
  }

  // Singleton pattern
  static get instance() {
    return this._instance;
  }

  static set instance(value) {
    this._instance = value;
  }
}

export default WebRTCService;
