
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {GoogleGenAI, LiveServerMessage, Modality} from '@google/genai';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Video} from '../types';
import {
  PlayIcon,
  SparklesIcon,
  XMarkIcon,
  ShareIcon,
  PlusIcon,
} from './icons';

interface VideoPlayerProps {
  video: Video;
  allVideos: Video[];
  isInline?: boolean;
  onClose: () => void;
  onPlay: (video: Video) => void;
}

// --- Audio Helper Functions ---

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  const binary = String.fromCharCode(...new Uint8Array(int16.buffer));
  const base64 = btoa(binary);
  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Recommendation Logic ---

function calculateRelevance(current: Video, candidate: Video): number {
  if (current.id === candidate.id) return -1;
  const tokenize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 3 && !['with', 'this', 'that', 'from', 'into'].includes(w),
      );
  const currentTokens = new Set(
    tokenize(`${current.title} ${current.description}`),
  );
  const candidateTokens = tokenize(
    `${candidate.title} ${candidate.description}`,
  );
  let matches = 0;
  candidateTokens.forEach((token) => {
    if (currentTokens.has(token)) matches++;
  });
  if (current.title.split(' ')[0] === candidate.title.split(' ')[0]) {
    matches += 2;
  }
  return matches;
}

/**
 * A component that renders a video player and an optional AI companion using the Live API.
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  allVideos,
  isInline = false,
  onClose,
  onPlay,
}) => {
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Used to toggle between Playlist and AI
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  
  // Live API Resources
  const audioContextRef = useRef<any>(null);
  const inputContextRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Recommendations
  const {upNext, moreVideos} = useMemo(() => {
    const sorted = [...allVideos]
      .filter((v) => v.id !== video.id)
      .map((v) => ({video: v, score: calculateRelevance(video, v)}))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.video);
    return {
      upNext: sorted[0],
      moreVideos: sorted.slice(1),
    };
  }, [video, allVideos]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const disconnect = () => {
    if (sessionRef.current) {
       sessionRef.current = null;
    }
    
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setConnected(false);
    setIsConnecting(false);
    setMicActive(false);
  };

  const connect = async () => {
    if (connected || isConnecting) return;
    setIsConnecting(true);

    try {
      const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
      
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      audioContextRef.current = new AudioContextClass({sampleRate: 24000});
      const outputNode = audioContextRef.current.createGain();
      outputNode.connect(audioContextRef.current.destination);
      nextStartTimeRef.current = audioContextRef.current.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      streamRef.current = stream;
      inputContextRef.current = new AudioContextClass({sampleRate: 16000});
      const inputSource = inputContextRef.current.createMediaStreamSource(stream);
      const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
      
      inputSource.connect(processor);
      processor.connect(inputContextRef.current.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Zephyr'}},
          },
          systemInstruction: `You are a helpful AI video companion. You are watching a video titled "${video.title}". Description: "${video.description}". Answer their questions about what is happening on screen concisely and enthusiastically.`,
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setConnected(true);
            setIsConnecting(false);
            setMicActive(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
               try {
                   if (audioContextRef.current?.state === 'suspended') {
                       await audioContextRef.current.resume();
                   }
                   
                   const audioBuffer = await decodeAudioData(
                       decode(base64Audio),
                       audioContextRef.current,
                       24000,
                       1
                   );

                   const source = audioContextRef.current.createBufferSource();
                   source.buffer = audioBuffer;
                   source.connect(outputNode);
                   
                   const currentTime = audioContextRef.current.currentTime;
                   const startTime = Math.max(nextStartTimeRef.current, currentTime);
                   source.start(startTime);
                   nextStartTimeRef.current = startTime + audioBuffer.duration;
                   
                   source.onended = () => {
                       sourcesRef.current.delete(source);
                   };
                   sourcesRef.current.add(source);
                   
                   setAudioLevel(0.5 + Math.random() * 0.5); 
                   setTimeout(() => setAudioLevel(0), audioBuffer.duration * 1000);

               } catch (e) {
                   console.error("Audio decode error", e);
               }
            }

            if (message.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = audioContextRef.current.currentTime;
            }
          },
          onclose: () => {
            disconnect();
          },
          onerror: (err) => {
            console.error(err);
            disconnect();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

      processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createBlob(inputData);
          sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
          });
      };

      const captureFrame = () => {
          if (!videoRef.current || !videoCanvasRef.current) return;
          const video = videoRef.current;
          const canvas = videoCanvasRef.current;
          
          if (video.videoWidth === 0 || video.videoHeight === 0) return;

          canvas.width = video.videoWidth / 4; 
          canvas.height = video.videoHeight / 4;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
              
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ 
                      media: {
                          mimeType: 'image/jpeg',
                          data: base64
                      } 
                  });
              });
          }
      };

      videoIntervalRef.current = window.setInterval(captureFrame, 1000);

    } catch (err) {
      console.error('Failed to connect to Gemini Live', err);
      setIsConnecting(false);
      disconnect();
    }
  };

  const toggleSidebarMode = () => {
    if (isSidebarOpen) {
      // If closing AI, disconnect
      disconnect();
      setIsSidebarOpen(false);
    } else {
      // Opening AI
      setIsSidebarOpen(true);
      connect();
    }
  };

  const SidebarVideoItem = ({ video, isUpNext = false }: { video: Video, isUpNext?: boolean }) => (
    <button
      onClick={() => onPlay(video)}
      className={`group w-full flex gap-3 text-left rounded-lg overflow-hidden hover:bg-white/5 p-2 transition-all ${isUpNext ? 'bg-white/5 mb-6 ring-1 ring-white/10' : ''}`}
    >
      <div className="relative w-36 aspect-video bg-[#2f2f2f] shrink-0 rounded-md overflow-hidden">
        <video
          src={video.videoUrl}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          muted
          playsInline
          preload="metadata"
        />
        {/* Hover Overlay */}
         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <PlayIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
         </div>
         {isUpNext && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#F54997]"></div>}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {isUpNext && (
          <p className="text-[#F54997] text-[10px] font-bold uppercase tracking-widest mb-1">
            Up Next
          </p>
        )}
        <h4 className="font-medium text-gray-200 text-sm line-clamp-2 leading-snug group-hover:text-white transition-colors">
          {video.title}
        </h4>
        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
          {isUpNext ? "Starting in 5s..." : "Trending Now"}
        </p>
      </div>
    </button>
  );

  const RecommendationsList = () => (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
       <div className="p-5 border-b border-white/5">
          <h3 className="font-bold text-white text-lg tracking-tight">Watch Next</h3>
       </div>
       <div className="overflow-y-auto custom-scrollbar flex-1 p-4 space-y-2">
          {upNext && <SidebarVideoItem video={upNext} isUpNext={true} />}
          {moreVideos.map(v => <SidebarVideoItem key={v.id} video={v} />)}
       </div>
    </div>
  );

  const AICompanionPanel = () => (
      <div className="flex flex-col h-full bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-full h-1/2 bg-[#F54997]/5 blur-3xl pointer-events-none rounded-full transform translate-x-1/4 -translate-y-1/4"></div>

        <div className="flex items-center justify-between p-5 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#F54997]/20 p-1.5 rounded-md">
                <SparklesIcon className="w-5 h-5 text-[#F54997]" />
              </div>
              <div>
                  <h3 className="font-bold text-white text-base">Gemini Live</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Video Assistant</p>
              </div>
            </div>
            <button 
                onClick={toggleSidebarMode}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all"
            >
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-10 relative z-10">
            {isConnecting ? (
                <div className="flex flex-col items-center gap-6 animate-pulse">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-[#F54997] animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <SparklesIcon className="w-6 h-6 text-[#F54997]/50" />
                        </div>
                    </div>
                    <p className="text-gray-300 font-medium text-sm tracking-wide">Establishing Connection...</p>
                </div>
            ) : connected ? (
                <div className="flex flex-col items-center gap-8 w-full">
                    {/* Visualizer */}
                    <div className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${micActive ? 'bg-gradient-to-tr from-[#F54997]/20 to-purple-500/10 shadow-[0_0_50px_rgba(245,73,151,0.2)]' : 'bg-white/5'}`}>
                         {/* Ripple Effects */}
                        {micActive && (
                            <>
                                <div className="absolute inset-0 rounded-full border border-[#F54997]/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                <div className="absolute inset-4 rounded-full border border-[#F54997]/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] animation-delay-500"></div>
                            </>
                        )}
                        
                        {/* Audio Bars */}
                        <div className="flex items-end gap-1.5 h-16 z-10">
                            {[...Array(5)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="w-3 rounded-full bg-gradient-to-t from-[#F54997] to-purple-400 shadow-[0_0_10px_rgba(245,73,151,0.5)] transition-all duration-75 ease-out"
                                    style={{
                                        height: `${audioLevel > 0 ? Math.max(20, Math.random() * 100 * audioLevel) : 15}%`,
                                        opacity: audioLevel > 0 ? 1 : 0.6
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="text-center space-y-3 max-w-xs mx-auto">
                            <h4 className="text-xl font-bold text-white">I'm Listening</h4>
                            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                <p className="text-gray-300 text-xs leading-relaxed">
                                    "I can see the video <span className="text-[#F54997]">{video.title}</span>. Ask me anything about the scene!"
                                </p>
                            </div>
                    </div>
                </div>
            ) : (
                 <div className="flex flex-col items-center text-center space-y-4 opacity-60">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                        <SparklesIcon className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-gray-500 font-medium">Assistant Offline</p>
                </div>
            )}
        </div>
        
        <div className="p-5 border-t border-white/5 bg-[#0a0a0a]/50 backdrop-blur-sm z-10">
            <button 
                onClick={disconnect} 
                disabled={!connected}
                className={`w-full py-4 font-bold text-sm uppercase tracking-widest rounded-lg transition-all transform active:scale-95 ${connected ? 'bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white shadow-lg' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
            >
                {connected ? 'End Session' : 'Offline'}
            </button>
        </div>
      </div>
  );

  const Content = (
    <div
      className="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-[#0a0a0a]"
      onClick={(e) => e.stopPropagation()}>
      
      {/* LEFT COLUMN: Main Video Player */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar relative">
        {!isInline && (
         <button
          onClick={onClose}
          className="absolute top-6 left-6 text-white/80 hover:text-[#F54997] z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors backdrop-blur-md lg:hidden"
          aria-label="Close video player">
          <XMarkIcon className="w-6 h-6" />
        </button>
        )}

        {/* Video Container - Sticky on Desktop */}
        <div className="w-full bg-black aspect-video shrink-0 lg:sticky lg:top-0 z-10 shadow-2xl relative group">
          <video
            ref={videoRef}
            key={video.id}
            className="w-full h-full object-contain mx-auto"
            src={video.videoUrl}
            controls
            autoPlay
            muted
            loop
            aria-label={video.title}
          />
           {/* Gradient Overlay for Controls (Optional, usually handled by native controls but adds polish if customized) */}
        </div>

        {/* Video Metadata & Actions */}
        <div className="w-full p-6 lg:p-10 space-y-8 bg-gradient-to-b from-[#0a0a0a] to-[#121212]">
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/5 pb-8">
            <div className="flex-1 space-y-4">
              
              {/* Metadata Tags */}
              <div className="flex items-center gap-3 text-xs font-semibold text-gray-400 tracking-wider">
                  <span className="bg-white/10 px-2 py-0.5 rounded text-gray-200">4K</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded text-gray-200">HDR</span>
                  <span>2024</span>
                  <span>•</span>
                  <span>Sci-Fi</span>
                  <span>•</span>
                  <span>2m 14s</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                {video.title}
              </h2>
              
              {/* Action Buttons Row */}
              <div className="flex items-center gap-4 pt-2">
                 <button className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded font-bold text-sm transition-colors">
                    <PlayIcon className="w-5 h-5" />
                    <span>Resume</span>
                 </button>
                 <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded font-bold text-sm transition-colors border border-white/5">
                    <PlusIcon className="w-5 h-5" />
                    <span>My List</span>
                 </button>
                 <button className="p-2.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
                     <ShareIcon className="w-5 h-5" />
                 </button>
              </div>

              <p className="text-gray-300 leading-relaxed text-base md:text-lg max-w-3xl pt-2 font-light">
                {video.description}
              </p>
            </div>
            
            {/* AI Call to Action */}
            <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={toggleSidebarMode}
                  className={`relative overflow-hidden group flex-1 md:flex-none flex items-center justify-center gap-3 font-bold py-4 px-8 rounded-lg transition-all uppercase tracking-wider text-sm shadow-xl ${
                      isSidebarOpen 
                      ? 'bg-gray-800 text-white border border-white/10' 
                      : 'bg-gradient-to-r from-[#F54997] to-[#b31d62] text-white hover:shadow-[0_0_30px_-5px_rgba(245,73,151,0.6)] hover:scale-[1.02]'
                  }`}
                  aria-label="Toggle AI Companion">
                    
                  {/* Button Glow Effect */}
                  {!isSidebarOpen && <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 skew-x-12 -ml-4 w-[120%]"></div>}
                  
                  <SparklesIcon className={`w-5 h-5 ${!isSidebarOpen && 'animate-pulse'}`} />
                  <span className="relative z-10">{isSidebarOpen ? 'Close AI' : 'Ask AI Companion'}</span>
                </button>
            </div>
          </div>

          {/* Mobile Recommendations (Hidden on LG) */}
          <div className="lg:hidden">
              <RecommendationsList />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Sidebar (Desktop Only) */}
      <div className="hidden lg:flex w-[380px] xl:w-[420px] bg-[#0a0a0a] border-l border-white/5 flex-col h-full shrink-0 z-20">
         {isSidebarOpen ? <AICompanionPanel /> : <RecommendationsList />}
      </div>
    </div>
  );

  if (isInline) {
    return Content;
  }

  return (
    <div
      className="fixed inset-0 bg-[#000000] z-50 flex items-center justify-center animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog">
      {Content}
    </div>
  );
};
