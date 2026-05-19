export type AppMode = "idle" | "camera" | "monitor";

export interface SignalEvent {
  from: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface PeerConnection {
  socketId: string;
  pc: RTCPeerConnection;
}
