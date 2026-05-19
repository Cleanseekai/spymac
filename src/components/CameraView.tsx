import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Copy, Camera, Check, Settings, Eye, EyeOff, Monitor, VideoOff, RefreshCw, X, Video, MicOff, Mic, ThumbsUp, Heart, Smile } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface CameraViewProps {
  roomId: string;
  onBack: () => void;
}

export default function CameraView({ roomId, onBack }: CameraViewProps) {
  const [status, setStatus] = useState<"connecting" | "ready" | "streaming" | "error">("connecting");
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [sharingType, setSharingType] = useState<"camera" | "screen">("camera");
  const [showPreview, setShowPreview] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [observerStream, setObserverStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    socketRef.current = io();
    const socket = socketRef.current;

    socket.on("connect", () => {
      socket.emit("join-room", roomId);
    });

    socket.on("user-joined", async (userId: string) => {
      const pc = createPeerConnection(userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { to: userId, offer });
      setStatus("streaming");
    });

    socket.on("answer", async ({ from, answer }: { from: string, answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(from);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.disconnect();
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
    };
  }, [roomId]);

  useEffect(() => {
    const startStreaming = async () => {
      try {
        streamRef.current?.getTracks().forEach(t => t.stop());

        const stream = sharingType === "camera" 
          ? await navigator.mediaDevices.getUserMedia({
              video: { facingMode: isFrontCamera ? "user" : "environment" },
              audio: true
            })
          : await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: true
            });
        
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("ready");

        peerConnections.current.forEach(pc => {
          const tracks = stream.getTracks();
          const senders = pc.getSenders();
          
          tracks.forEach(track => {
            const sender = senders.find(s => s.track?.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track);
            } else {
              pc.addTrack(track, stream);
            }
          });
        });

        stream.getVideoTracks()[0].onended = () => {
          if (sharingType === "screen") setSharingType("camera");
        };

      } catch (err: any) {
        setStatus("error");
        if (sharingType === "screen") setSharingType("camera");
      }
    };

    startStreaming();

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [isFrontCamera, sharingType]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => { track.enabled = !isPrivacyMode; });
      streamRef.current.getAudioTracks().forEach(track => { track.enabled = !isAudioMuted; });
      if (socketRef.current) {
        socketRef.current.emit("privacy-update", { roomId, enabled: isPrivacyMode });
      }
    }
  }, [isPrivacyMode, isAudioMuted, roomId]);

  const createPeerConnection = (userId: string) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerConnections.current.set(userId, pc);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current!));
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setObserverStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", { to: userId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        peerConnections.current.delete(userId);
        setObserverStream(null);
      }
    };

    return pc;
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  return (
    <div className="fixed inset-0 bg-[#18191A] flex flex-col overflow-hidden select-none font-sans text-white">
      {/* Background Video (Feed Placeholder) */}
      <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
         {showPreview && (
           <video
             ref={videoRef}
             autoPlay
             muted
             playsInline
             className={cn("w-full h-full object-contain", isFrontCamera && "scale-x-[-1]")}
           />
         )}
      </div>

      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

      {/* Top Bar - FB Live Style */}
      <div className="relative z-20 p-4 flex items-start justify-between w-full">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-fb-blue to-purple-500 border border-white/20 shadow-lg" />
            <div>
               <div className="flex items-center gap-2">
                 <span className="font-semibold text-[15px] shadow-sm">Jane Doe</span>
                 {status === "streaming" && (
                   <span className="bg-red-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shadow-lg animate-pulse">Live</span>
                 )}
               </div>
               <div className="text-[12px] text-white/80 font-medium">Broadcast ID: {roomId}</div>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <button 
              onClick={copyRoomId}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-lg text-white font-semibold text-[14px] flex items-center gap-2 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
               {copied ? "Copied" : "Copy ID"}
            </button>
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
         </div>
      </div>

      {observerStream && (
         <div className="absolute top-20 right-4 z-20 w-32 h-44 bg-black border-2 border-white/20 rounded-xl overflow-hidden shadow-2xl">
           <video
             ref={(el) => { if (el) el.srcObject = observerStream; }}
             autoPlay
             playsInline
             className="w-full h-full object-cover"
           />
           <div className="absolute bottom-1 left-1 bg-black/50 px-2 py-0.5 rounded text-[10px] font-bold">Guest</div>
         </div>
      )}

      {/* Bottom Controls */}
      <div className="relative z-20 p-4 mt-auto w-full flex flex-col gap-4">
         <div className="flex items-center gap-4 text-[13px] font-semibold">
           <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Eye className="w-4 h-4" /> {status === "streaming" ? "1 Viewer" : "0 Viewers"}
           </div>
         </div>

         <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
               <button 
                 onClick={() => setIsFrontCamera(!isFrontCamera)}
                 disabled={sharingType === "screen"}
                 className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all", sharingType === "screen" ? "opacity-50" : "hover:bg-white/10")}
               >
                 <RefreshCw className="w-5 h-5" />
               </button>
               <button 
                 onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                 className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all", isPrivacyMode ? "bg-red-500" : "hover:bg-white/10")}
               >
                 {isPrivacyMode ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
               </button>
               <button 
                 onClick={() => setIsAudioMuted(!isAudioMuted)}
                 className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all", isAudioMuted ? "bg-red-500" : "hover:bg-white/10")}
               >
                 {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
               </button>
               <button 
                 onClick={() => setSharingType(sharingType === "camera" ? "screen" : "camera")}
                 className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all", sharingType === "screen" ? "bg-blue-500" : "hover:bg-white/10")}
               >
                 {sharingType === "screen" ? <Monitor className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
               </button>
               <button 
                 onClick={() => setShowPreview(!showPreview)}
                 className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all hover:bg-white/10")}
               >
                 {showPreview ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
               </button>
            </div>
            
            <button className="h-12 px-6 rounded-full bg-fb-blue hover:bg-blue-600 text-white font-bold transition-all shadow-lg shadow-blue-500/20">
              Finish
            </button>
         </div>
      </div>
    </div>
  );
}
