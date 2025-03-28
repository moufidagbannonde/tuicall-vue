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

        // Configuration STUN/TURN servers
        this.configuration = {
            "iceServers": [
                { urls: 'stun:stun2.l.google.com:19302' },
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
    
        // Stocker les candidats ICE en attente
        this.pendingCandidates = [];

        this.socket.on('call-offer', async (data) => {
            if (data.to === this.currentUserId) {
                console.log('Received call offer:', data);
                this.remoteUserId = data.from;
                this.isVideoEnabled = data.withVideo;
                this.pendingOffer = data.offer;
    
                // Déclencher la confirmation d'appel
                if (this.onCallStatusChangeCallback) {
                    this.onCallStatusChangeCallback('incoming', data.from, data.withVideo);
                }
            }
        });

        this.socket.on('ice-candidate', async (data) => {
            if (data.to === this.currentUserId && this.peerConnection) {
                try {
                    if (this.peerConnection.remoteDescription) {
                        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } else {
                        this.pendingCandidates.push(data.candidate);
                    }
                } catch (error) {
                    console.error('Error handling ICE candidate:', error);
                }
            }
        });

        this.socket.on('call-answer', async (data) => {
            if (data.to === this.currentUserId) {
                try {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                    
                    // Ajouter les candidats ICE en attente après la description distante
                    for (const candidate of this.pendingCandidates) {
                        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    this.pendingCandidates = [];
                } catch (error) {
                    console.error('Error in call-answer:', error);
                }
            }
        });

        // Ajouter l'écouteur pour la fin d'appel
        this.socket.on('call-ended', (data) => {
            if (data.to === this.currentUserId) {
                console.log('Appel terminé par:', data.from);
                // Informer l'interface utilisateur
                if (this.onCallStatusChangeCallback) {
                    this.onCallStatusChangeCallback('ended', data.from, false);
                }
                // Réinitialiser l'état de l'appel
                this.resetCall();
            }
        });
        //   changement de périphériques média
        this.onMediaStateChange = null; // Ajouter cette ligne
        this.socket.on('media-state-change', (data) => {
            if (data.to === this.currentUserId) {
                if (this.onMediaStateChange) {
                    this.onMediaStateChange(data);
                }
            }
        });

        // Appel rejeté
        this.socket.on('call-rejected', (data) => {
            if (data.to === this.currentUserId) {
                console.log('Appel rejeté par:', data.from);
                if (this.onCallStatusChangeCallback) {
                    this.onCallStatusChangeCallback('rejected', data.from, false);
                }
                this.resetCall();
            }
        });
    }

    startRecording() {
        if (this.localStream && this.remoteStream) {
            const combinedStream = new MediaStream([
                ...this.localStream.getTracks(),
                ...this.remoteStream.getTracks()
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
                    type: 'video/webm'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
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
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            return true;
        }
        return false;
    }



    async acceptCall() {
        console.log("Appel accepté");
        try {
            if (!this.pendingOffer) {
                throw new Error('No pending offer to accept');
            }

            // Obtenir le flux local avant d'initialiser la connexion
            if (!this.localStream) {
                const mediaResult = await this.getLocalMedia(this.isVideoEnabled);
                if (!mediaResult.success) {
                    throw new Error('Failed to get local media');
                }
            }

            // Initialiser la connexion peer après avoir obtenu le flux local
            this.initPeerConnection();

            // Définir la description distante
            console.log('Setting remote description from pending offer');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));

            // Créer et envoyer la réponse
            console.log('Creating answer');
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Ajouter les candidats ICE en attente
            if (this.pendingCandidates && this.pendingCandidates.length > 0) {
                console.log('Adding pending ICE candidates:', this.pendingCandidates.length);
                for (const candidate of this.pendingCandidates) {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
                this.pendingCandidates = [];
            }

            this.isCallActive = true;
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
        this.isVideoEnabled = false;
        this.remoteUserId = null;
        this.pendingOffer = null;

        // Émettre un changement de statut
        if (this.onCallStatusChangeCallback) {
            this.onCallStatusChangeCallback('idle', null, false);
        }
    }
    // Toggle audio mute
    async toggleAudio(mute, remoteUserId, currentUserId) {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks[0].enabled = !mute;
                this.socket.emit('toggle-audio', {
                    to: remoteUserId,
                    from: currentUserId || this.currentUserId, 
                    off: mute 
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
                this.socket.emit('toggle-video', {
                    to: remoteUserId,
                    from: currentUserId || this.currentUserId, 
                    off: off 
                });
            }
        }
    }
}

export default new WebRTCService();