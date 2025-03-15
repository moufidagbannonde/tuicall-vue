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
    
    // Ajouter les écouteurs d'événements socket
    this.instance.socket.on('ice-candidate', (data) => {
      if (data.to === this.instance.currentUserId) {
        console.log('Received ICE candidate:', data);
        this.handleIceCandidate(data.candidate);
      }
    });
    
    this.instance.socket.on('call-offer', (data) => {
      if (data.to === this.instance.currentUserId) {
        console.log('Received call offer:', data);
        this.handleOffer(data.offer, data.from);
        if (this.instance.onStatusCallback) {
          this.instance.onStatusCallback('incoming', data.from, data.withVideo);
        }
      }
    });
    
    this.instance.socket.on('call-answer', (data) => {
      if (data.to === this.instance.currentUserId) {
        console.log('Received call answer:', data);
        this.handleAnswer(data.answer);
        if (this.instance.onStatusCallback) {
          this.instance.onStatusCallback('connected', data.from, true);
        }
      }
    });
    
    return this.instance;
  }

  // Renommer handleOffer en handleCallOffer pour cohérence
  static async handleCallOffer(data) {
    try {
      const { offer, from, withVideo } = data;
      
      if (!this.instance.peerConnection) {
        this.instance.peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        
        // Configurer les gestionnaires d'événements
        this.instance.peerConnection.ontrack = (event) => {
          this.instance.remoteStream = event.streams[0];
          if (this.instance.onStreamCallback) {
            this.instance.onStreamCallback(event.streams[0]);
          }
        };
        
        this.instance.peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            this.instance.socket.emit('ice-candidate', {
              candidate: event.candidate,
              from: this.instance.currentUserId,
              to: from
            });
          }
        };
      }

      await this.instance.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Ajouter les pistes locales si disponibles
      if (this.instance.localStream) {
        this.instance.localStream.getTracks().forEach(track => {
          this.instance.peerConnection.addTrack(track, this.instance.localStream);
        });
      }
      
      const answer = await this.instance.peerConnection.createAnswer();
      await this.instance.peerConnection.setLocalDescription(answer);

      this.instance.socket.emit('call-answer', {
        answer,
        from: this.instance.currentUserId,
        to: from,
        withVideo
      });
      
    } catch (error) {
      console.error('Error handling call offer:', error);
      throw error;
    }
  }

  // Renommer handleAnswer en handleCallAnswer pour cohérence
  static async handleCallAnswer(data) {
    try {
      const { answer, from } = data;
      console.log('Setting remote description from answer');
      const remoteDesc = new RTCSessionDescription(answer);
      await this.instance.peerConnection.setRemoteDescription(remoteDesc);
      
      if (this.instance.onStatusCallback) {
        this.instance.onStatusCallback('connected', from, true);
      }
    } catch (error) {
      console.error('Error handling call answer:', error);
      throw error;
    }
  }

  static async acceptCall(remoteUserId, withVideo = false) {
    try {
      if (!this.instance) {
        throw new Error('WebRTCService not initialized');
      }
  
      // Create peer connection if not exists
      if (!this.instance.peerConnection) {
        this.instance.peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        
        // Handle incoming tracks
        this.instance.peerConnection.ontrack = (event) => {
          console.log('Track received in acceptCall:', event.streams[0]);
          this.instance.remoteStream = event.streams[0];
          if (this.instance.onStreamCallback) {
            this.instance.onStreamCallback(event.streams[0]);
          }
        };
        
        // Handle ICE candidates
        this.instance.peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('Sending ICE candidate in acceptCall');
            this.instance.socket.emit('ice-candidate', {
              candidate: event.candidate,
              from: this.instance.currentUserId,
              to: remoteUserId
            });
          }
        };
      }
  
      // Add local stream tracks to peer connection
      if (this.instance.localStream) {
        this.instance.localStream.getTracks().forEach(track => {
          this.instance.peerConnection.addTrack(track, this.instance.localStream);
        });
      }
  
      // Notify that we're ready to receive an offer
      this.instance.socket.emit('ready-for-offer', {
        from: this.instance.currentUserId,
        to: remoteUserId,
        withVideo
      });
  
      return true;
    } catch (error) {
      console.error('Error in acceptCall:', error);
      throw error;
    }
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

  static async makeCall(remoteUserId, withVideo = true) {
    try {
      this.instance.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Ajouter les tracks locaux
      this.instance.localStream.getTracks().forEach(track => {
        this.instance.peerConnection.addTrack(track, this.instance.localStream);
      });

      // Gérer les tracks distants
      this.instance.peerConnection.ontrack = (event) => {
        this.instance.remoteStream = event.streams[0];
        if (this.instance.onStreamCallback) {
          this.instance.onStreamCallback(event.streams[0]);
        }
      };

      // Créer et envoyer l'offre
      const offer = await this.instance.peerConnection.createOffer();
      await this.instance.peerConnection.setLocalDescription(offer);

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

      // Envoyer l'offre
      this.instance.socket.emit('call-offer', {
        offer,
        from: this.instance.currentUserId,
        to: remoteUserId,
        withVideo
      });

    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  }

  static async handleOffer(offer, from) {
    try {
      if (!this.instance.peerConnection) {
        this.instance.peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
      }

      await this.instance.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.instance.peerConnection.createAnswer();
      await this.instance.peerConnection.setLocalDescription(answer);

      this.instance.socket.emit('call-answer', {
        answer,
        from: this.instance.currentUserId,
        to: from
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  static async handleAnswer(answer) {
    try {
      const remoteDesc = new RTCSessionDescription(answer);
      await this.instance.peerConnection.setRemoteDescription(remoteDesc);
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  static async handleIceCandidate(candidate) {
    try {
      if (this.instance.peerConnection) {
        await this.instance.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
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

  static toggleAudio(muted) {
    if (this.instance.localStream) {
      this.instance.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  static toggleVideo(disabled) {
    if (this.instance.localStream) {
      this.instance.localStream.getVideoTracks().forEach(track => {
        track.enabled = !disabled;
      });
    }
  }
}

export default WebRTCService;
