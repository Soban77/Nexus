import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';

export const CallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [status, setStatus] = useState('Connecting...');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!user || !roomId) return;

    const socketClient = io(API_BASE_URL || '', { transports: ['websocket', 'polling'] });
    setSocket(socketClient);

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerRef.current = peer;

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        peer.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socketClient.emit('ice_candidate', { roomId, candidate: event.candidate });
          }
        };

        socketClient.emit('join_room', {
          roomId,
          user: { id: user.id, name: user.name, role: user.role }
        });

        socketClient.on('room_joined', async ({ participants }) => {
          setStatus('In call');
          if (participants.length <= 1) return;

          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socketClient.emit('offer', { roomId, offer });
        });

        socketClient.on('offer', async ({ offer, from }) => {
          await peer.setRemoteDescription(offer);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socketClient.emit('answer', { roomId, answer, to: from });
        });

        socketClient.on('answer', async ({ answer }) => {
          await peer.setRemoteDescription(answer);
        });

        socketClient.on('ice_candidate', async ({ candidate }) => {
          if (candidate) {
            await peer.addIceCandidate(candidate);
          }
        });

        socketClient.on('call_ended', () => {
          cleanup();
          navigate(-1);
        });
      } catch (error) {
        setStatus('Could not access camera/microphone');
        console.error(error);
      }
    };

    startCall();

    return () => {
      socketClient.emit('leave_room', { roomId });
      socketClient.disconnect();
      cleanup();
    };
  }, [user, roomId, navigate]);

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current?.close();
  };

  const toggleAudio = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setAudioEnabled((prev) => !prev);
    socket?.emit('toggle_media', { roomId, audio: !audioEnabled, video: videoEnabled });
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setVideoEnabled((prev) => !prev);
    socket?.emit('toggle_media', { roomId, audio: audioEnabled, video: !videoEnabled });
  };

  const endCall = () => {
    socket?.emit('end_call', { roomId });
    cleanup();
    navigate(-1);
  };

  if (!user || !roomId) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Call</h1>
          <p className="text-gray-600">{status}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>Back to chat</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500 mb-2">You</p>
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded-lg bg-gray-900 aspect-video" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-gray-500 mb-2">Remote participant</p>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded-lg bg-gray-900 aspect-video" />
          </CardBody>
        </Card>
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={toggleAudio} aria-label="Toggle audio">
          {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
        </Button>
        <Button variant="outline" onClick={toggleVideo} aria-label="Toggle video">
          {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        </Button>
        <Button variant="error" onClick={endCall} leftIcon={<PhoneOff size={18} />}>
          End Call
        </Button>
      </div>
    </div>
  );
};
