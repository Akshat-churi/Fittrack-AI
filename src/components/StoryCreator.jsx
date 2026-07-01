import React, { useState, useRef } from 'react';
import { X, Upload, Type, Smile, Palette, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { createStory } from '../utils/supabaseBridge';
import { getCurrentUser } from '../utils/auth';
import { useToast } from './Toast';
import EmojiPicker from './EmojiPicker';

const BG_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#1a1a2e',
  '#2d1b69', '#11162e', '#1e3a2f', '#3d1515',
  '#1a0a2e', '#0a1628', '#1f2937', '#111827',
];

/**
 * Modal for creating a new story with photo/video, text, emoji, and color background.
 *
 * Props:
 *   onClose    - Callback to close the modal
 *   onCreated  - Callback after successful creation, receives the new story object
 */
const StoryCreator = ({ onClose, onCreated }) => {
  const currentUser = getCurrentUser();
  const { addToast } = useToast();

  const [file, setFile]               = useState(null);
  const [preview, setPreview]         = useState(null);
  const [mediaType, setMediaType]     = useState('image');
  const [textOverlay, setTextOverlay] = useState('');
  const [emojiOverlay, setEmojiOverlay] = useState('');
  const [bgColor, setBgColor]         = useState('#1a1a2e');
  const [showEmoji, setShowEmoji]     = useState(false);
  const [uploading, setUploading]     = useState(false);

  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const isVideo = f.type.startsWith('video/');
    setFile(f);
    setMediaType(isVideo ? 'video' : 'image');

    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      addToast('Please sign in to create stories.', 'error');
      return;
    }
    if (!file) {
      addToast('Please select a photo or video.', 'error');
      return;
    }

    setUploading(true);
    try {
      const story = await createStory(
        currentUser.id,
        file,
        textOverlay.trim(),
        emojiOverlay,
        bgColor
      );

      if (story) {
        addToast('Story posted! It will expire in 24 hours.', 'success');
        if (onCreated) onCreated(story);
        onClose();
      } else {
        addToast('Failed to post story. Try again.', 'error');
      }
    } catch (err) {
      console.error('[StoryCreator]', err);
      addToast('Something went wrong.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-brand-surface border border-brand-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border/60">
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">Create Story</h2>
            <p className="text-slate-500 text-xs">Expires in 24 hours</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-brand-border/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Preview area */}
          <div
            className="relative w-full aspect-[9/16] max-h-64 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-brand-border/60 hover:border-brand-orange/40 transition-colors"
            style={{ background: bgColor }}
            onClick={() => !preview && fileRef.current?.click()}
          >
            {preview ? (
              <>
                {mediaType === 'video'
                  ? <video src={preview} autoPlay muted loop playsInline className="w-full h-full object-contain" />
                  : <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                }

                {/* Text overlay preview */}
                {textOverlay && (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center px-4">
                    <div className="bg-black/60 px-3 py-1.5 rounded-xl">
                      <p className="text-white text-xs font-semibold text-center">{textOverlay}</p>
                    </div>
                  </div>
                )}

                {/* Emoji overlay preview */}
                {emojiOverlay && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <span className="text-3xl">{emojiOverlay}</span>
                  </div>
                )}

                {/* Change media button */}
                <button
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="w-8 h-8 text-brand-orange/60" />
                    <span className="text-[10px]">Photo</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Video className="w-8 h-8 text-sky-400/60" />
                    <span className="text-[10px]">Video</span>
                  </div>
                </div>
                <p className="text-xs font-medium">Tap to select media</p>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Text overlay input */}
          <div className="relative">
            <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              placeholder="Add text overlay..."
              maxLength={100}
              className="w-full bg-brand-dark border border-brand-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-orange/40 transition-colors"
            />
          </div>

          {/* Emoji + color row */}
          <div className="flex items-center gap-3">
            {/* Emoji picker */}
            <div className="relative">
              <button
                onClick={() => setShowEmoji(p => !p)}
                className="flex items-center gap-2 px-3 py-2.5 bg-brand-dark border border-brand-border rounded-xl text-sm text-slate-400 hover:text-white hover:border-brand-orange/30 transition-colors"
              >
                <Smile className="w-4 h-4" />
                {emojiOverlay || <span className="text-xs">Emoji</span>}
              </button>
              {showEmoji && (
                <div className="absolute bottom-12 left-0 z-20">
                  <EmojiPicker
                    onSelect={(emoji) => { setEmojiOverlay(emoji); setShowEmoji(false); }}
                    onClose={() => setShowEmoji(false)}
                  />
                </div>
              )}
            </div>

            {/* Clear emoji */}
            {emojiOverlay && (
              <button
                onClick={() => setEmojiOverlay('')}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Clear emoji
              </button>
            )}
          </div>

          {/* Background color picker */}
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-2 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Background Color
            </p>
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setBgColor(color)}
                  className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    background: color,
                    borderColor: bgColor === color ? '#ff7e33' : 'transparent',
                    boxShadow: bgColor === color ? '0 0 0 2px rgba(255,126,51,0.4)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={uploading || !file}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all bg-gradient-to-r from-brand-orange to-[#ff4b1f] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              'Share Story'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryCreator;
