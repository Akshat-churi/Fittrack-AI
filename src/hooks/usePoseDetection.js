import { useEffect, useRef, useState } from 'react';

// Using globals loaded from index.html CDN scripts
const Pose = window.Pose;
const POSE_CONNECTIONS = window.POSE_CONNECTIONS;
const Camera = window.Camera;
const drawConnectors = window.drawConnectors;
const drawLandmarks = window.drawLandmarks;

export const usePoseDetection = ({ videoRef, canvasRef, onResults }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameId = useRef(null);
  const isVideoFileMode = useRef(false);

  // Sync canvas dimensions with video dimensions
  const syncCanvasToVideo = useRef(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log("Canvas synced to video dimensions:", canvas.width, "x", canvas.height);
      }
    }
  });

  useEffect(() => {
    let active = true;

    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Add listener to sync canvas when video metadata loads
    const handleMetadata = () => {
      console.log("Video metadata loaded!");
      syncCanvasToVideo.current();
    };
    video.addEventListener('loadedmetadata', handleMetadata);

    // Also sync immediately in case metadata is already loaded
    syncCanvasToVideo.current();

    poseRef.current = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    poseRef.current.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    poseRef.current.onResults((results) => {
      // Clear error if we get results
      setErrorMsg(null);
      
      if (!active) return;
      if (!canvasRef.current || !videoRef.current) return;

      console.log("Pose results received! Has landmarks:", !!results.poseLandmarks);

      const canvasCtx = canvasRef.current.getContext('2d');
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw video frame to canvas
      canvasCtx.drawImage(
        results.image, 0, 0, canvasRef.current.width, canvasRef.current.height
      );

      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                       {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks,
                      {color: '#FF0000', lineWidth: 2});
        
        if (onResults) {
          console.log("Calling onResults with landmarks!");
          onResults(results.poseLandmarks);
        }
      }
      canvasCtx.restore();
    });

    // We only start the camera manually when requested, not immediately on mount
    return () => {
      active = false;
      video.removeEventListener('loadedmetadata', handleMetadata);
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, [videoRef, canvasRef, onResults]);

  const startCamera = async () => {
    isVideoFileMode.current = false;
    if (videoRef.current && poseRef.current) {
      try {
        // Pre-initialize the model so it doesn't block on the first frame
        await poseRef.current.initialize();

        // Use lower resolution on mobile for better performance
        const isMobile = window.innerWidth <= 768;
        const camW = isMobile ? 640 : 1280;
        const camH = isMobile ? 480 : 720;

        cameraRef.current = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                syncCanvasToVideo.current();
                await poseRef.current.send({ image: videoRef.current });
              } catch (error) {
                console.error("Error in pose.send (camera):", error);
                setErrorMsg(`Pose error: ${error.message}`);
              }
            }
          },
          width: camW,
          height: camH,
        });
        await cameraRef.current.start();
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to start camera or initialize pose:", error);
        setErrorMsg(`Init error: ${error.message}`);
      }
    }
  };

  const startVideoFile = async (videoEl) => {
    isVideoFileMode.current = true;
    if (poseRef.current && videoEl) {
      try {
        await poseRef.current.initialize();
        setIsLoaded(true);

        const processFrame = async () => {
          if (!videoEl.paused && !videoEl.ended) {
            try {
              // Sync canvas before processing each frame
              syncCanvasToVideo.current();
              await poseRef.current.send({ image: videoEl });
            } catch (error) {
              console.error("Error in pose.send (video file):", error);
              setErrorMsg(`Pose error: ${error.message}`);
            }
          }
          if (!videoEl.ended) {
            animationFrameId.current = requestAnimationFrame(processFrame);
          }
        };

        // Start processing immediately and when video plays
        const startProcessing = () => {
          console.log("Starting video file processing!");
          processFrame();
        };

        if (videoEl.readyState >= 1) { // HAVE_METADATA or better
          startProcessing();
        } else {
          videoEl.addEventListener('loadedmetadata', startProcessing, { once: true });
        }
        videoEl.onplay = startProcessing;
        
        // If video is already playing, start right away
        if (!videoEl.paused && !videoEl.ended) {
          startProcessing();
        }
      } catch (error) {
        console.error("Failed to start video or initialize pose:", error);
        setErrorMsg(`Init error: ${error.message}`);
      }
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    setIsLoaded(false);
  };

  return { isLoaded, errorMsg, startCamera, startVideoFile, stopCamera };
};
