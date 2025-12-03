
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {Video} from '../types';
import {PlayIcon} from './icons';

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
}

/**
 * A component that renders a video card with a thumbnail, title, and play button.
 */
export const VideoCard: React.FC<VideoCardProps> = ({video, onPlay}) => {
  return (
    <button
      type="button"
      className="group w-full text-left bg-transparent rounded-sm overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F54997]"
      onClick={() => onPlay(video)}
      aria-label={`Play video: ${video.title}`}>
      <div className="relative aspect-video bg-[#2f2f2f] mb-3">
        <video
          className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-500 ease-out"
          src={video.videoUrl}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"></video>
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

        {/* Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-14 h-14 bg-[#F54997] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
               <PlayIcon className="w-8 h-8 text-white ml-1" />
             </div>
        </div>
        
        {/* Pink branding line on hover */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#F54997] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
      </div>
      
      <div className="px-1">
        <h3
          className="text-lg font-bold text-gray-100 leading-tight group-hover:text-[#F54997] transition-colors line-clamp-2"
          title={video.title}>
          {video.title}
        </h3>
        <p className="text-sm text-gray-400 mt-1 line-clamp-1">
            Video Generation • 2 mins
        </p>
      </div>
    </button>
  );
};
