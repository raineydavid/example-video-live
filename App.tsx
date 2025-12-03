
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useState} from 'react';
import {
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  VideoCameraIcon,
} from './components/icons';
import {VideoPlayer} from './components/VideoPlayer';
import {MOCK_VIDEOS} from './constants';
import {Video} from './types';

/**
 * Main component for the Example.com app.
 * It manages the state of videos and the active video player.
 */
export const App: React.FC = () => {
  const [videos] = useState<Video[]>(MOCK_VIDEOS);
  // Default to the first video for the "Home Page" experience
  const [playingVideo, setPlayingVideo] = useState<Video | null>(MOCK_VIDEOS[0]);

  const handlePlayVideo = (video: Video) => {
    setPlayingVideo(video);
  };

  const handleClosePlayer = () => {
    // In inline mode, closing might just mean doing nothing, or resetting to default.
    // Since the player is the home page, we generally don't "close" it.
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-gray-100 font-sans selection:bg-[#F54997] selection:text-white overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 w-full flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-xl border-b border-white/5 z-50 transition-all duration-300">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-gradient-to-br from-[#F54997] to-[#b31d62] p-2 rounded-lg shadow-lg shadow-[#F54997]/20 group-hover:shadow-[#F54997]/40 transition-all">
              <VideoCameraIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white group-hover:opacity-90 transition-opacity">
              Example<span className="text-[#F54997]">.com</span>
            </h1>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
            <a href="#" className="text-white hover:text-[#F54997] transition-colors">Home</a>
            <a href="#" className="hover:text-white transition-colors">Movies</a>
            <a href="#" className="hover:text-white transition-colors">Series</a>
            <a href="#" className="hover:text-white transition-colors">New & Popular</a>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-5">
           <div className="hidden sm:flex items-center bg-[#1f1f1f] rounded-full px-3 py-1.5 border border-white/10 focus-within:border-[#F54997] transition-colors">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search titles, people..." 
                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-32 lg:w-48 text-white placeholder-gray-500"
              />
           </div>
           
           <button className="text-gray-400 hover:text-white transition-colors relative">
              <BellIcon className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#F54997] rounded-full"></span>
           </button>
           
           <button className="text-gray-400 hover:text-white transition-colors">
              <UserCircleIcon className="w-8 h-8" />
           </button>
        </div>
      </header>

      {/* Main Content - Added padding-top to account for fixed header */}
      <main className="flex-1 pt-[72px] relative">
        {playingVideo ? (
          <VideoPlayer
            key={playingVideo.id}
            video={playingVideo}
            allVideos={videos}
            isInline={true}
            onClose={handleClosePlayer}
            onPlay={handlePlayVideo}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a video to start watching
          </div>
        )}
      </main>
    </div>
  );
};
