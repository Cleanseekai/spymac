import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Video, Image, Smile, Search, Bell, MessageCircle, Menu, Home, Tv, Store, Users, Gamepad2, MoreHorizontal, ThumbsUp, MessageSquare, Share2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import CameraView from "./components/CameraView";
import MonitorView from "./components/MonitorView";
import { cn } from "@/src/lib/utils";
import type { AppMode } from "./types";

export default function App() {
  const [mode, setMode] = useState<AppMode>("idle");
  const [roomId, setRoomId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [history, setHistory] = useState<{ id: string; type: "camera" | "monitor"; timestamp: number }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("fb_cam_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  const addToHistory = (id: string, type: "camera" | "monitor") => {
    const newItem = { id, type, timestamp: Date.now() };
    const filtered = history.filter(item => item.id !== id);
    const updated = [newItem, ...filtered].slice(0, 5);
    setHistory(updated);
    localStorage.setItem("fb_cam_history", JSON.stringify(updated));
  };

  const startAsCamera = () => {
    const id = uuidv4().slice(0, 6).toUpperCase();
    setRoomId(id);
    addToHistory(id, "camera");
    setMode("camera");
  };

  const startAsMonitor = (id: string) => {
    if (!id) return;
    const cleanId = id.toUpperCase();
    setRoomId(cleanId);
    addToHistory(cleanId, "monitor");
    setMode("monitor");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.length >= 6) {
      startAsMonitor(searchInput);
    }
  };

  if (mode === "camera") {
    return <CameraView roomId={roomId} onBack={() => setMode("idle")} />;
  }

  if (mode === "monitor") {
    return <MonitorView roomId={roomId} onBack={() => setMode("idle")} />;
  }

  return (
    <div className="min-h-screen bg-fb-bg text-fb-dark font-sans flex flex-col">
      {/* Navbar overlaying app */}
      <div className="h-14 bg-white shadow-sm border-b border-fb-border flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {/* Fake Facebook Logo */}
          <div className="w-10 h-10 bg-fb-blue text-white rounded-full flex items-center justify-center font-bold text-2xl font-serif tracking-tighter cursor-pointer">
            f
          </div>
          <form onSubmit={handleSearch} className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fb-gray cursor-pointer" />
            <input 
              type="text" 
              placeholder="Search Facebook (Enter Code)" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-fb-bg border-none rounded-full py-2 pl-9 pr-4 w-64 text-[15px] focus:outline-none focus:ring-2 focus:ring-fb-blue/50 transition-all font-medium placeholder:font-normal"
            />
          </form>
        </div>

        {/* Center Icons */}
        <div className="hidden lg:flex items-center gap-2">
          {[
            { icon: Home, active: true },
            { icon: Tv, active: false },
            { icon: Store, active: false },
            { icon: Users, active: false },
            { icon: Gamepad2, active: false }
          ].map((item, i) => (
            <button key={i} className={cn(
              "px-10 py-3 rounded-lg flex items-center justify-center transition-colors relative",
              item.active ? "text-fb-blue" : "text-fb-gray hover:bg-fb-bg"
            )}>
              <item.icon className="w-6 h-6" />
              {item.active && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-fb-blue rounded-t-full" />}
            </button>
          ))}
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 bg-fb-bg rounded-full cursor-pointer hover:bg-fb-light transition-colors">
            <Menu className="w-5 h-5 text-fb-dark" />
          </div>
          <div className="hidden sm:flex items-center justify-center w-10 h-10 bg-fb-bg rounded-full cursor-pointer hover:bg-fb-light transition-colors">
            <MessageCircle className="w-5 h-5 text-fb-dark" />
          </div>
          <div className="flex items-center justify-center w-10 h-10 bg-fb-bg rounded-full cursor-pointer hover:bg-fb-light transition-colors relative">
            <Bell className="w-5 h-5 text-fb-dark" />
            <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] text-white flex items-center justify-center font-bold">
              3
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-fb-blue to-purple-500 ml-1 overflow-hidden shrink-0 cursor-pointer" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 md:grid-cols-[1fr_minmax(auto,680px)_1fr] pt-4 px-2 lg:px-0">
        
        {/* Left Sidebar */}
        <div className="hidden lg:block pl-2 pr-4 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-3 p-2 hover:bg-fb-light rounded-lg cursor-pointer transition-colors font-medium">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-fb-blue to-purple-500" />
              User Profile
            </div>
            <div className="flex items-center gap-3 p-2 hover:bg-fb-light rounded-lg cursor-pointer transition-colors font-medium text-fb-dark">
              <Users className="w-8 h-8 text-fb-blue" />
              Friends
            </div>
            <div className="flex items-center gap-3 p-2 hover:bg-fb-light rounded-lg cursor-pointer transition-colors font-medium text-fb-dark">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><Bell className="w-5 h-5 text-fb-blue" /></div>
              Memories
            </div>
            <div className="flex items-center gap-3 p-2 hover:bg-fb-light rounded-lg cursor-pointer transition-colors font-medium text-fb-dark">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center"><Tv className="w-5 h-5 text-purple-600" /></div>
              Saved
            </div>
            <div className="flex items-center gap-3 p-2 hover:bg-fb-light rounded-lg cursor-pointer transition-colors font-medium text-fb-dark">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center"><Users className="w-5 h-5 text-teal-600" /></div>
              Groups
            </div>
            <div className="flex items-center gap-3 p-2 hover:bg-fb-light rounded-lg cursor-pointer transition-colors font-medium text-fb-dark">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><Video className="w-5 h-5 text-blue-500" /></div>
              Video
            </div>
          </div>
          <div className="mt-4 border-t border-fb-border pt-4">
            <h3 className="px-2 text-[17px] font-semibold text-fb-gray mb-2">Recent connections</h3>
            {history.length > 0 ? history.map(item => (
              <button 
                key={item.id}
                onClick={() => startAsMonitor(item.id)}
                className="w-full flex items-center gap-3 p-2 hover:bg-fb-light rounded-lg cursor-pointer transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-fb-bg flex items-center justify-center">
                  <Video className="w-4 h-4 text-fb-gray" />
                </div>
                <div>
                  <div className="font-medium text-fb-dark text-[15px]">Room {item.id}</div>
                  <div className="text-[13px] text-fb-gray">Rejoin feed</div>
                </div>
              </button>
            )) : (
              <div className="px-2 text-[13px] text-fb-gray">No recent active streams.</div>
            )}
          </div>
        </div>

        {/* Center Feed */}
        <div className="max-w-[680px] w-full mx-auto pb-20">
          
          {/* Create Post / HIDDEN CAM TRIGGER */}
          <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.2)] p-3 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-fb-blue to-purple-500 shrink-0" />
              <input 
                type="text"
                placeholder="What's on your mind?"
                className="bg-fb-bg rounded-full px-4 py-2 w-full text-[17px] hover:bg-fb-light transition-colors cursor-pointer outline-none placeholder:text-fb-gray border-none"
              />
            </div>
            <div className="border-t border-fb-border pt-2 flex justify-between">
              <button 
                onClick={startAsCamera}
                className="flex-1 flex justify-center items-center gap-2 hover:bg-fb-bg py-2 rounded-lg transition-colors text-[15px] font-semibold text-fb-gray whitespace-nowrap"
              >
                <Video className="w-6 h-6 text-red-500" />
                Live Video
              </button>
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-fb-bg py-2 rounded-lg transition-colors text-[15px] font-semibold text-fb-gray whitespace-nowrap">
                <Image className="w-6 h-6 text-green-500" />
                Photo/video
              </button>
              <button className="flex-1 hidden sm:flex justify-center items-center gap-2 hover:bg-fb-bg py-2 rounded-lg transition-colors text-[15px] font-semibold text-fb-gray whitespace-nowrap">
                <Smile className="w-6 h-6 text-yellow-500" />
                Feeling/activity
              </button>
            </div>
          </div>

          {/* Enter Code Mobile / Tablet (Optional block) */}
          <div className="md:hidden bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.2)] p-3 mb-4">
             <div className="font-semibold text-fb-dark mb-2 text-[15px]">Find Friends (Join Feed)</div>
             <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                  type="text" 
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Enter 6-letter feed ID..."
                  className="bg-fb-bg rounded-lg px-4 py-2 flex-1 text-[15px] focus:outline-none focus:ring-2 focus:ring-fb-blue/50"
                />
                <button type="submit" className="bg-fb-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-fb-blue/90 transition-colors">
                  Join
                </button>
             </form>
          </div>

          {/* Dummy Post 1 */}
          <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.2)] mb-4 pb-2">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full" />
                <div>
                  <div className="font-semibold text-fb-dark hover:underline cursor-pointer text-[15px]">National Geographic</div>
                  <div className="text-[13px] text-fb-gray flex items-center gap-1 hover:underline cursor-pointer">
                    2 hrs · <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
              <MoreHorizontal className="w-5 h-5 text-fb-gray cursor-pointer" />
            </div>
            <div className="px-4 text-[15px] text-fb-dark mb-3">
              The breathtaking views of the northern lights captured last night. Nature's light show never disappoints!
            </div>
            <img src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200" alt="Northern Lights" className="w-full h-auto object-cover max-h-[500px]" />
            <div className="px-4 py-2 flex items-center justify-between border-b border-fb-border mx-2">
              <div className="flex items-center gap-1 text-fb-gray text-[15px]">
                <div className="bg-fb-blue w-5 h-5 rounded-full flex items-center justify-center"><ThumbsUp className="w-3 h-3 text-white" /></div>
                1.2K
              </div>
              <div className="text-[15px] text-fb-gray hover:underline cursor-pointer">
                124 comments · 45 shares
              </div>
            </div>
            <div className="px-2 pt-1 flex justify-between">
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-fb-bg py-1.5 rounded-lg transition-colors text-[15px] font-semibold text-fb-gray">
                <ThumbsUp className="w-5 h-5" /> Like
              </button>
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-fb-bg py-1.5 rounded-lg transition-colors text-[15px] font-semibold text-fb-gray">
                <MessageSquare className="w-5 h-5" /> Comment
              </button>
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-fb-bg py-1.5 rounded-lg transition-colors text-[15px] font-semibold text-fb-gray">
                <Share2 className="w-5 h-5" /> Share
              </button>
            </div>
          </div>
          
          {/* Dummy Post 2 */}
          <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.2)] mb-4 pb-2">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full" />
                <div>
                  <div className="font-semibold text-fb-dark hover:underline cursor-pointer text-[15px]">Architecture Daily</div>
                  <div className="text-[13px] text-fb-gray flex items-center gap-1 hover:underline cursor-pointer">
                    5 hrs · <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
              <MoreHorizontal className="w-5 h-5 text-fb-gray cursor-pointer" />
            </div>
            <div className="px-4 text-[15px] text-fb-dark mb-3">
              Modern interior setups to maximize your living space. Which one is your favorite?
            </div>
            <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200" alt="Interior" className="w-full h-auto object-cover max-h-[500px]" />
            <div className="px-4 py-2 flex items-center justify-between border-b border-fb-border mx-2">
              <div className="flex items-center gap-1 text-fb-gray text-[15px]">
                <div className="bg-fb-blue w-5 h-5 rounded-full flex items-center justify-center"><ThumbsUp className="w-3 h-3 text-white" /></div>
                856
              </div>
              <div className="text-[15px] text-fb-gray hover:underline cursor-pointer">
                92 comments · 12 shares
              </div>
            </div>
            <div className="px-2 pt-1 flex justify-between">
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-fb-bg py-1.5 rounded-lg transition-colors text-[15px] font-semibold text-fb-gray">
                <ThumbsUp className="w-5 h-5" /> Like
              </button>
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-fb-bg py-1.5 rounded-lg transition-colors text-[15px] font-semibold text-fb-gray">
                <MessageSquare className="w-5 h-5" /> Comment
              </button>
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-fb-bg py-1.5 rounded-lg transition-colors text-[15px] font-semibold text-fb-gray">
                <Share2 className="w-5 h-5" /> Share
              </button>
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="hidden md:block pr-2 pl-4 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-[17px] font-semibold text-fb-gray mb-3 flex items-center justify-between">
              Sponsored
            </h3>
            <div className="flex items-center gap-3 mb-4 cursor-pointer group">
               <div className="w-[110px] h-[110px] rounded-lg overflow-hidden shrink-0">
                  <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
               </div>
               <div>
                 <div className="font-semibold text-[15px] text-fb-dark">Professional Photography Masterclass</div>
                 <div className="text-[13px] text-fb-gray">Learn from the best in the industry.</div>
               </div>
            </div>
             <div className="flex items-center gap-3 cursor-pointer group">
               <div className="w-[110px] h-[110px] rounded-lg overflow-hidden shrink-0">
                  <img src="https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=400" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
               </div>
               <div>
                 <div className="font-semibold text-[15px] text-fb-dark">Eco-Friendly Home Solutions</div>
                 <div className="text-[13px] text-fb-gray">Upgrade your living space today.</div>
               </div>
            </div>
          </div>
          
          <div className="border-t border-fb-border pt-4">
            <h3 className="text-[17px] font-semibold text-fb-gray mb-2 flex items-center justify-between">
              Contacts
              <div className="flex gap-3">
                <Search className="w-4 h-4 cursor-pointer" />
                <MoreHorizontal className="w-4 h-4 cursor-pointer" />
              </div>
            </h3>
            <div className="space-y-1">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 hover:bg-fb-light rounded-lg cursor-pointer transition-colors relative">
                  <div className="w-9 h-9 rounded-full bg-fb-border relative">
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-fb-bg rounded-full" />
                  </div>
                  <div className="font-medium text-fb-dark text-[15px]">Friend {i}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
