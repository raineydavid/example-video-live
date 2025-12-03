
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import {Video} from '../types';
import {VideoCard} from './VideoCard';

interface VideoGridProps {
  videos: Video[];
  onPlayVideo: (video: Video) => void;
}

/**
 * A component that renders a grid of video cards.
 */
export const VideoGrid: React.FC<VideoGridProps> = ({videos, onPlayVideo}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} onPlay={onPlayVideo} />
      ))}
    </div>
  );
};
