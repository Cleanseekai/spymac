import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { X, Video, VideoOff, Maximize2, Mic, Eye, ThumbsUp, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as blazeface from "@tensorflow-models/blazeface";

interface MonitorViewProps {
  roomId: string;
  onBack: () => void;
}

export default function MonitorView({ roomId, onBack }: MonitorViewProps) {
  const [status, setStatus] = useState<"connecting" | "waiting" | "receiving" | "error">("connecting");
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const [aiEnabled, setAiEnabled] = useState(true);
  const [modelLoading, setModelLoading] = useState(false);
  const [detections, setDetections] = useState<cocoSsd.DetectedObject[]>([]);
  const [isMotionDetected, setIsMotionDetected] = useState(false);
  const [eventLogs, setEventLogs] = useState<{ id: string; text: string; time: Date }[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const animationFrameRef = useRef<number>();
  const cocoModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const faceModelRef = useRef<blazeface.BlazeFaceModel | null>(null);

  const addEventLog = (text: string) => {
    setEventLogs(prev => {
      if (prev.length > 0 && prev[0].text === text && (Date.now() - prev[0].time.getTime() < 3000)) return prev;
      return [{ id: Math.random().toString(), text, time: new Date() }, ...prev].slice(0, 5);
    });
  };

  // Initialize AI Models
  useEffect(() => {
    if (aiEnabled && !cocoModelRef.current) {
      setModelLoading(true);
      tf.ready().then(() => Promise.all([cocoSsd.load(), blazeface.load()]))
        .then(([coco, face]) => {
          cocoModelRef.current = coco;
          faceModelRef.current = face;
          setModelLoading(false);
          addEventLog("System activated: ML Models Online");
        }).catch(err => {
          console.error("Failed to load AI model", err);
          setModelLoading(false);
          setAiEnabled(false);
        });
    }
  }, [aiEnabled]);

  // AI Detection Loop
  useEffect(() => {
    const detectFrame = async () => {
      if (aiEnabled && cocoModelRef.current && faceModelRef.current && videoRef.current && canvasRef.current) {
         if (videoRef.current.readyState === 4 && videoRef.current.videoWidth > 0) {
           const video = videoRef.current;
           const canvas = canvasRef.current;
           
           if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
             canvas.width = video.videoWidth;
             canvas.height = video.videoHeight;
             offscreenCanvasRef.current = document.createElement("canvas");
             offscreenCanvasRef.current.width = video.videoWidth / 4;
             offscreenCanvasRef.current.height = video.videoHeight / 4;
           }

           const ctx = canvas.getContext("2d");
           if (ctx) {
             ctx.clearRect(0, 0, canvas.width, canvas.height);

             // Motion Detection
             let motionFound = false;
             if (offscreenCanvasRef.current) {
                const offCtx = offscreenCanvasRef.current.getContext("2d");
                if (offCtx) {
                  offCtx.drawImage(video, 0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
                  const frameData = offCtx.getImageData(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
                  if (lastFrameDataRef.current) {
                    let diffCount = 0;
                    for (let i = 0; i < frameData.data.length; i += 4) {
                      const diff = Math.abs(frameData.data[i] - lastFrameDataRef.current[i]);
                      if (diff > 50) diffCount++;
                    }
                    if (diffCount > (frameData.data.length / 4) * 0.05) {
                      motionFound = true;
                      addEventLog("Motion Detected");
                    }
                  }
                  lastFrameDataRef.current = frameData.data;
                }
             }
             setIsMotionDetected(motionFound);

             // Object & Pet Detection
             const predictions = await cocoModelRef.current.detect(video);
             setDetections(predictions);
             predictions.forEach(prediction => {
               if (["person", "cat", "dog", "bird"].includes(prediction.class)) {
                 addEventLog(`${prediction.class.toUpperCase()} Detected`);
               }
               const [x, y, width, height] = prediction.bbox;
               ctx.strokeStyle = '#3b82f6'; // fb blue
               ctx.lineWidth = 3;
               ctx.strokeRect(x, y, width, height);

               ctx.fillStyle = '#3b82f6';
               ctx.fillRect(x, y - 24, Math.max(80, ctx.measureText(prediction.class).width + 60), 24);

               ctx.fillStyle = '#ffffff';
               ctx.font = 'bold 14px sans-serif';
               ctx.fillText(`${prediction.class.toUpperCase()} ${Math.round(prediction.score * 100)}%`, x + 5, y - 6);
             });

             // Face Detection
             const faces = await faceModelRef.current.estimateFaces(video, false);
             if (faces.length > 0) addEventLog("FACE Detected");
             faces.forEach((face) => {
               const start = face.topLeft as [number, number];
               const end = face.bottomRight as [number, number];
               const size = [end[0] - start[0], end[1] - start[1]];
               
               ctx.strokeStyle = '#ef4444'; // red
               ctx.lineWidth = 2;
               ctx.setLineDash([5, 5]);
               ctx.strokeRect(start[0], start[1], size[0], size[1]);
               ctx.setLineDash([]);
               
               ctx.fillStyle = '#ef4444';
               ctx.fillRect(start[0], start[1] - 20, 80, 20);
               ctx.fillStyle = '#ffffff';
               ctx.font = 'bold 12px sans-serif';
               ctx.fillText('FACE', start[0] + 5, start[1] - 5);
             });
           }
         }
      } else {
         const ctx = canvasRef.current?.getContext("2d");
         if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
         setDetections([]);
         setIsMotionDetected(false);
      }
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };
    
    detectFrame();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [aiEnabled]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    socketRef.current = io();
    const socket = socketRef.current;

    socket.on("privacy-update", ({ enabled }: { enabled: boolean }) => {
      setIsPrivacyMode(enabled);
    });

    const setupReceiver = async () => {
      socket.emit("join-room", roomId);
      setStatus("waiting");

      socket.on("offer", async ({ from, offer }: { from: string, offer: RTCSessionDescriptionInit }) => {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { to: from, answer });
      });

      socket.on("ice-candidate", async ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });
    };

    const createPeerConnection = (userId: string) => {
      if (peerConnection.current) peerConnection.current.close();
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerConnection.current = pc;

      if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      }

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          setStatus("receiving");
        }
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) socket.emit("ice-candidate", { to: userId, candidate: event.candidate });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setStatus("waiting");
          setTimeout(() => { if (socketRef.current?.connected) socket.emit("join-room", roomId); }, 3000);
        }
      };
      return pc;
    };

    setupReceiver();
    return () => { 
      socket.disconnect(); 
      peerConnection.current?.close(); 
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
  }, [roomId]);

  const toggleLocalCamera = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      if (peerConnection.current) {
        peerConnection.current.getSenders().forEach(sender => {
          if (sender.track) peerConnection.current?.removeTrack(sender);
        });
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
        setLocalStream(stream);
        if (peerConnection.current) {
          stream.getTracks().forEach(track => peerConnection.current?.addTrack(track, stream));
        }
      } catch (err) {}
    }
  };

  return (
    <div className="fixed inset-0 bg-[#18191A] text-white flex flex-col overflow-hidden select-none font-sans">
       <div className="absolute inset-0 bg-black flex items-center justify-center">
         <motion.video
            animate={{ opacity: (status === "receiving" && !isPrivacyMode) ? 1 : 0.4 }}
            ref={videoRef}
            autoPlay
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-contain"
         />
         <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
         />
       </div>

       <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

       {/* Top Bar  */}
       <div className="relative z-20 p-4 flex items-start justify-between w-full">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-fb-blue to-purple-500 border border-white/20 shadow-lg" />
            <div>
               <div className="flex items-center gap-2">
                 <span className="font-semibold text-[15px] shadow-sm">Jane Doe</span>
                 <span className="bg-red-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shadow-lg animate-pulse">Live</span>
               </div>
               <div className="flex items-center gap-2 text-[12px] text-white/80 font-medium">
                 {status === "receiving" ? "Connected" : "Waiting for connection"}
               </div>
            </div>
         </div>
         <div className="flex items-center gap-3">
             <button 
              onClick={onBack}
              className="w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center transition-colors border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
         </div>
       </div>

       {isPrivacyMode && (
         <div className="absolute inset-0 z-15 flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold mb-2">Video Paused</h2>
            <p className="text-white/60 text-sm">The broadcast is temporarily muted/hidden.</p>
         </div>
       )}

       {localStream && (
         <div className="absolute top-20 right-4 z-20 w-32 h-44 bg-black border-2 border-white/20 rounded-xl overflow-hidden shadow-2xl">
           <video
             ref={(el) => { if (el) el.srcObject = localStream; }}
             autoPlay
             playsInline
             muted
             className="w-full h-full object-cover scale-x-[-1]"
           />
           <div className="absolute bottom-1 left-1 bg-black/50 px-2 py-0.5 rounded text-[10px] font-bold">You</div>
         </div>
       )}

       {/* Bottom Overlay Comments (Fake) */}
       <div className="relative z-20 p-4 mt-auto w-full flex flex-col gap-4">
           
          {/* Notification Logs */}
          <div className="flex flex-col gap-2 mb-2 pointer-events-none max-h-48 overflow-hidden justify-end">
             <AnimatePresence>
               {eventLogs.map((log) => (
                 <motion.div
                   key={log.id}
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.9 }}
                   className="flex items-center gap-2"
                 >
                   <div className="w-8 h-8 rounded-full bg-blue-600 border border-white/20 flex flex-shrink-0 items-center justify-center shadow-lg">
                      <Activity className="w-4 h-4 text-white" />
                   </div>
                   <div className="bg-black/60 backdrop-blur-md rounded-2xl rounded-bl-sm px-3 py-1.5 border border-white/10 shadow-lg text-[13px]">
                      <span className="font-bold text-white/90">System: </span>
                      <span className={cn(
                        "font-medium",
                        log.text.includes("Motion") ? "text-yellow-400" :
                        log.text.includes("FACE") ? "text-red-400" : "text-green-400"
                      )}>{log.text}</span>
                   </div>
                 </motion.div>
               ))}
             </AnimatePresence>
          </div>

          {/* Reaction Stats */}
          <div className="flex items-center justify-between pointer-events-none">
             <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-[13px] font-semibold">
                <Eye className="w-4 h-4" /> {detections.length > 0 ? `${detections.length} objects` : "1 Viewer"}
                {isMotionDetected && <span className="ml-2 bg-yellow-500 text-black text-[10px] px-1.5 rounded font-bold uppercase">Motion</span>}
             </div>
             
             <div className="flex gap-2">
                <div className="bg-fb-blue text-white rounded-full p-2 shadow-lg"><ThumbsUp className="w-4 h-4" /></div>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={toggleLocalCamera}
                title={localStream ? "Turn off camera" : "Join camera"}
                className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all bg-black/40 backdrop-blur-md border border-white/20", localStream && "bg-white/20")}
             >
                {localStream ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white/80" />}
             </button>
             <button 
                onClick={() => setAiEnabled(!aiEnabled)}
                title={aiEnabled ? "Disable AI Tracking" : "Enable AI Tracking"}
                className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all bg-black/40 backdrop-blur-md border border-white/20", aiEnabled && "bg-green-500/20 border-green-500")}
             >
                {modelLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Activity className={cn("w-5 h-5", aiEnabled ? "text-green-500" : "text-white/80")} />
                )}
             </button>
             <div className="relative flex-1 bg-black/40 backdrop-blur-md border border-white/20 rounded-full flex items-center px-4 py-2 text-white/50 text-sm">
                Write a comment...
             </div>
          </div>
       </div>
    </div>
  );
}
