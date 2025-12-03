
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, {useState} from 'react';
import {Video} from '../types';

interface EditVideoPageProps {
  video: Video;
  onSave: (updatedVideo: Video) => void;
  onCancel: () => void;
}

/**
 * A page that allows the user to edit the description of a video.
 * It provides input field for the description and buttons to save or cancel the changes.
 */
export const EditVideoPage: React.FC<EditVideoPageProps> = ({
  video,
  onSave,
  onCancel,
}) => {
  const [description, setDescription] = useState(video.description);

  const handleSave = () => {
    onSave({...video, description});
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 font-sans flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-3xl bg-[#1f1f1f] p-8 md:p-12 shadow-2xl border border-gray-800">
        <header className="mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
            Remix Video
          </h1>
           <p className="text-gray-400">Modify the prompt below to generate a new version.</p>
        </header>

        <main>
          <div className="mb-8">
            <label
              htmlFor="description"
              className="block text-sm font-bold text-[#F54997] mb-3 uppercase tracking-wider">
              Prompt
            </label>
            <textarea
              id="description"
              rows={10}
              className="w-full bg-[#121212] border border-gray-700 p-4 text-gray-200 focus:ring-2 focus:ring-[#F54997] focus:border-transparent transition-all duration-200 font-mono text-sm leading-relaxed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label={`Edit description for the video`}
            />
          </div>
        </main>

        <footer className="flex justify-end gap-4 pt-4 border-t border-gray-800">
          <button
            onClick={onCancel}
            className="px-8 py-3 bg-transparent hover:bg-gray-800 text-gray-300 font-bold transition-colors border border-gray-700 uppercase tracking-wide text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-[#F54997] hover:bg-[#d4357d] text-white font-bold transition-colors uppercase tracking-wide text-sm shadow-lg hover:shadow-pink-500/20">
            Generate New Video
          </button>
        </footer>
      </div>
    </div>
  );
};
