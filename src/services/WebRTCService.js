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

    // Configuration STUN/TURN servers
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  /**
   * initialiser la connexion P2P (Peer-To-Peer)
   */
  initPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.remoteUserId) {
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: this.remoteUserId,
          from: this.currentUserId
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
  }

  async getLocalMedia(withVideo) {
    try {
      const constraints = {
        audio: true,
        video: withVideo
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isVideoEnabled = withVideo;

      // Ajouter les pistes au peer connection s'il existe
      if (this.peerConnection && this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      return {
        success: true,
        stream: this.localStream
      };
    } catch (error) {
      if (error.name === 'NotFoundError' && withVideo) {
        // Essayer l'audio uniquement si la caméra n'est pas trouvée
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });

          if (this.peerConnection && this.localStream) {
            this.localStream.getTracks().forEach(track => {
              this.peerConnection.addTrack(track, this.localStream);
            });
          }

          return {
            success: true,
            stream: this.localStream,
            fallbackToAudio: true
          };
        } catch (audioError) {
          return {
            success: false,
            error: audioError,
            noAudioDevice: true
          };
        }
      }
      return {
        success: false,
        error
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
      console.log('Making call to:', remoteUserId, 'with video:', withVideo);
  
      // Initialize peer connection
      this.initPeerConnection();
  
      // S'assurer que nous avons un flux local avant de créer l'offre
      if (!this.localStream) {
        const mediaResult = await this.getLocalMedia(withVideo);
        if (!mediaResult.success) {
          throw new Error('Failed to get local media');
        }
      }
  
      // Create and send offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: withVideo
      });
      
      console.log('Offer created:', offer);
      await this.peerConnection.setLocalDescription(offer);
  
      // Mettre à jour l'état de l'appel avant d'envoyer l'offre
      if (this.onCallStatusChangeCallback) {
        this.onCallStatusChangeCallback('outgoing', remoteUserId, withVideo);
      }
  
      // Send the offer to remote peer
      this.socket.emit('call-offer', {
        offer: this.peerConnection.localDescription,
        to: this.remoteUserId,
        from: this.currentUserId,
        withVideo: withVideo
      });
  
      return true;
    } catch (error) {
      console.error('Error making call:', error);
      this.isCallActive = false;
      return false;
    }
  }
  // écouteurs d'événements pour la signalisation WebRTC
  async setupSocketListeners() {
    if (!this.socket) return;
  
    this.socket.on('call-offer', async (data) => {
        if (data.to === this.currentUserId) {
          console.log('Received call offer:', data);
          // Set the remoteUserId when receiving the offer
          this.remoteUserId = data.from;
          this.isVideoEnabled = data.withVideo;
          this.pendingOffer = data.offer;
          
          if (this.onCallStatusChangeCallback) {
            this.onCallStatusChangeCallback('incoming', data.from, data.withVideo);
          }
        }
      });
    // Garder uniquement celui qui est déjà défini plus haut
  }
  async acceptCall() {
    console.log("Appel accepté");
    try {
      if (!this.pendingOffer) {
        throw new Error('No pending offer to accept');
      }

      console.log('Current remote user:', this.remoteUserId); // Add this log
      this.isCallActive = true;
      
      if (!this.localStream) {
        const mediaResult = await this.getLocalMedia(this.isVideoEnabled);
        if (!mediaResult.success) {
          throw new Error('Failed to get local media');
        }
      }

      this.initPeerConnection();

      console.log('Setting remote description from pending offer');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));

      console.log('Creating answer');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      if (!this.remoteUserId) {
        throw new Error('Remote user ID not set');
      }

      this.socket.emit('call-answer', {
        answer: answer,
        to: this.remoteUserId,
        from: this.currentUserId,
        withVideo: this.isVideoEnabled
      });

      return true;
    } catch (error) {
      console.error('Error accepting call:', error);
      this.isCallActive = false;
      return false;
    }
  }
  // Reject an incoming call
  rejectCall() {
    if (this.remoteUserId && this.socket) {
      this.socket.emit('call-rejected', {
        to: this.remoteUserId,
        from: this.currentUserId
      });

      this.resetCall();
    }
  }
  // End an active call
  async endCall() {
    if (this.remoteUserId && this.socket && this.isCallActive) {
      this.socket.emit('call-ended', {
        to: this.remoteUserId,
        from: this.currentUserId
      });
    }

    this.resetCall();
  }
  // Reset call state
  async resetCall() {
    // Stop all tracks in local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.isCallActive = false;
    this.remoteUserId = null;
    this.pendingOffer = null;
  }
  // Toggle audio mute
  async toggleAudio(mute) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !mute;
      }
    }
  }
  // Toggle video
  async toggleVideo(off) {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !off;
      }
    }
  }
}

export default new WebRTCService();