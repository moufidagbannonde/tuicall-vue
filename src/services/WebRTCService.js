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

      // Initialize peer connection
      this.initPeerConnection();

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

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
        console.log('Received call offer from:', data.from);
        this.remoteUserId = data.from;
        this.isVideoEnabled = data.withVideo;
  
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('incoming', this.remoteUserId, this.isVideoEnabled);
        }
  
        this.pendingOffer = data.offer;
      }
    });
  
    this.socket.on('call-answer', async (data) => {
      if (data.to === this.currentUserId) {
        console.log('Call accepted by:', data.from);
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          // Mettre à jour l'état de l'appel chez l'appelant
          this.isCallActive = true;
          
          if (this.onCallStatusChangeCallback) {
            this.onCallStatusChangeCallback('connected', this.remoteUserId, this.isVideoEnabled);
          }
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });
    
    // Ajouter la gestion des appels rejetés et terminés
    this.socket.on('call-rejected', (data) => {
      if (data.to === this.currentUserId) {
        console.log('Call rejected by:', data.from);
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('ended', this.remoteUserId, false);
        }
        this.resetCall();
      }
    });
    
    this.socket.on('call-ended', (data) => {
      if (data.to === this.currentUserId) {
        console.log('Call ended by:', data.from);
        if (this.onCallStatusChangeCallback) {
          this.onCallStatusChangeCallback('ended', this.remoteUserId, false);
        }
        this.resetCall();
      }
    });
  
    this.socket.on('ice-candidate', async (data) => {
      if (data.to === this.currentUserId && this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });
  }

  // Dans acceptCall
  async acceptCall() {
    try {
      if (!this.pendingOffer || !this.remoteUserId) {
        throw new Error('No pending call to accept');
      }

      this.isCallActive = true;
      this.initPeerConnection();

      // Set remote description (the offer)
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('call-answer', {
        answer: answer,
        to: this.remoteUserId,
        from: this.currentUserId
      });

      // Ajouter cette ligne pour mettre à jour le statut chez l'appelé
      if (this.onCallStatusChangeCallback) {
        this.onCallStatusChangeCallback('connected', this.remoteUserId, this.isVideoEnabled);
      }

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
  endCall() {
    if (this.remoteUserId && this.socket && this.isCallActive) {
      this.socket.emit('call-ended', {
        to: this.remoteUserId,
        from: this.currentUserId
      });
    }

    this.resetCall();
  }
  // Reset call state
  resetCall() {
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
  toggleAudio(mute) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !mute;
      }
    }
  }
  // Toggle video
  toggleVideo(off) {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !off;
      }
    }
  }
}

export default new WebRTCService();