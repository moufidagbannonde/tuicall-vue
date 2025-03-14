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
   async init(socket, userId, onRemoteStream, onCallStatusChange) {
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

            // Get local media automatically for video calls
            if (!this.localStream) {
                const mediaResult = await this.getLocalMedia(withVideo);
                if (!mediaResult.success) {
                    throw new Error('Failed to get local media');
                }
            }

            // Create and send offer automatically
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true // Always enable video
            });

            await this.peerConnection.setLocalDescription(offer);

            // Update call status
            if (this.onCallStatusChangeCallback) {
                this.onCallStatusChangeCallback('outgoing', remoteUserId, true);
            }

            // Send offer
            this.socket.emit('call-offer', {
                offer: this.peerConnection.localDescription,
                to: this.remoteUserId,
                from: this.currentUserId,
                withVideo: true
            });

            return true;
        } catch (error) {
            console.error('Error making call:', error);
            return false;
        }
    }
    // Ajouter après la méthode init
    setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on('ice-candidate', async ({ candidate, from }) => {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        this.socket.on('call-offer', async ({ offer, from, withVideo }) => {
            this.remoteUserId = from;
            if (this.onCallStatusChangeCallback) {
                this.onCallStatusChangeCallback('incoming', from, withVideo);
            }
        });

        this.socket.on('call-answer', async ({ answer, from }) => {
            if (this.peerConnection) {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        this.socket.on('call-rejected', ({ from }) => {
            if (this.onCallStatusChangeCallback) {
                this.onCallStatusChangeCallback('rejected', from);
            }
        });
    }
}
export default new WebRTCService();
