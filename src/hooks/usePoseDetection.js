import { useEffect, useRef, useState, useCallback } from 'react';

// Access MediaPipe globals safely
const getPose = () => window.Pose;
const getCamera = () => window.Camera;
const getPoseConnections = () => window.POSE_CONNECTIONS;
const getDrawConnectors = () => window.drawConnectors;
const getDrawLandmarks = () => window.drawLandmarks;

export const usePoseDetection = ({ videoRef, canvasRef, onResults }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameId = useRef(null);
  const isVideoFileMode = useRef(false);
  const onResultsRef = useRef(onResults);

  // Keep latest onResults callback reference without restarting effects
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  // Sync canvas dimensions with video dimensions only when they actually change
  const syncCanvasToVideo = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }
    }
  }, [videoRef, canvasRef]);

  // Handle pose results from MediaPipe
  const handleResults = useCallback((results) => {
    setErrorMsg(null);
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pose skeleton connectors and landmarks on top of the live video
    if (results.poseLandmarks) {
      const POSE_CONNECTIONS = getPoseConnections();
      const drawConnectors = getDrawConnectors();
      const drawLandmarks = getDrawLandmarks();

      if (drawConnectors && POSE_CONNECTIONS) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 4,
        });
      }
      if (drawLandmarks) {
        drawLandmarks(canvasCtx, results.poseLandmarks, {
          color: '#FF0000',
          lineWidth: 2,
        });
      }

      if (onResultsRef.current) {
        onResultsRef.current(results.poseLandmarks);
      }
    }
    canvasCtx.restore();
  }, [videoRef, canvasRef]);

  // Initialize MediaPipe Pose instance
  const initPose = useCallback(() => {
    if (poseRef.current) return poseRef.current;

    const PoseClass = getPose();
    if (!PoseClass) {
      throw new Error("MediaPipe Pose library is not loaded. Please check your internet connection.");
    }

    const pose = new PoseClass({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(handleResults);
    poseRef.current = pose;
    return pose;
  }, [handleResults]);

  // Stop camera and release tracks
  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (e) {
        console.warn("Error stopping camera instance:", e);
      }
      cameraRef.current = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject;
          const tracks = stream.getTracks ? stream.getTracks() : [];
          tracks.forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        }
        videoRef.current.src = '';
      } catch (_) {}
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setIsLoaded(false);
  }, [videoRef, canvasRef]);

  // Lifecycle setup
  useEffect(() => {
    try {
      initPose();
    } catch (_) {}

    const video = videoRef.current;
    const handleMetadata = () => {
      syncCanvasToVideo();
    };
    if (video) {
      video.addEventListener('loadedmetadata', handleMetadata);
    }

    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', handleMetadata);
      }
      stopCamera();
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (_) {}
        poseRef.current = null;
      }
    };
  }, [initPose, syncCanvasToVideo, stopCamera, videoRef]);

  // Start live webcam feed
  const startCamera = async () => {
    isVideoFileMode.current = false;
    setErrorMsg(null);

    const video = videoRef.current;
    if (!video) {
      setErrorMsg("Video element is not available.");
      return;
    }

    try {
      video.muted = true;
      video.playsInline = true;

      // Stop any existing camera instance
      if (cameraRef.current) {
        try {
          await cameraRef.current.stop();
        } catch (_) {}
        cameraRef.current = null;
      }

      const CameraClass = getCamera();
      if (!CameraClass) {
        throw new Error("MediaPipe Camera utility is not loaded yet. Please check your internet connection.");
      }

      // Initialize Pose model
      const pose = initPose();
      if (pose) {
        try {
          await pose.initialize();
        } catch (e) {
          console.warn("Pose initialize warning:", e);
        }
      }

      // Resolution optimization
      const isMobile = window.innerWidth <= 768;
      const camW = isMobile ? 640 : 1280;
      const camH = isMobile ? 480 : 720;

      cameraRef.current = new CameraClass(video, {
        onFrame: async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              syncCanvasToVideo();
              if (poseRef.current) {
                await poseRef.current.send({ image: videoRef.current });
              }
            } catch (error) {
              console.error("Error in pose.send (camera):", error);
            }
          }
        },
        width: camW,
        height: camH,
      });

      await cameraRef.current.start();

      // Ensure video element is playing
      try {
        await video.play();
      } catch (_) {}

      syncCanvasToVideo();
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to start camera or initialize pose:", error);
      setErrorMsg(`Camera error: ${error.message || error}`);
      setIsLoaded(false);
    }
  };

  // Start processing uploaded video file
  const startVideoFile = async (videoEl) => {
    isVideoFileMode.current = true;
    setErrorMsg(null);
    if (!videoEl) return;

    try {
      if (cameraRef.current) {
        try {
          await cameraRef.current.stop();
        } catch (_) {}
        cameraRef.current = null;
      }

      const pose = initPose();
      if (pose) {
        try {
          await pose.initialize();
        } catch (e) {
          console.warn("Pose initialize warning:", e);
        }
      }
      setIsLoaded(true);

      const processFrame = async () => {
        if (!videoEl.paused && !videoEl.ended) {
          try {
            syncCanvasToVideo();
            if (poseRef.current) {
              await poseRef.current.send({ image: videoEl });
            }
          } catch (error) {
            console.error("Error in pose.send (video file):", error);
          }
        }
        if (!videoEl.ended) {
          animationFrameId.current = requestAnimationFrame(processFrame);
        }
      };

      const startProcessing = () => {
        syncCanvasToVideo();
        processFrame();
      };

      if (videoEl.readyState >= 1) {
        startProcessing();
      } else {
        videoEl.addEventListener('loadedmetadata', startProcessing, { once: true });
      }
      videoEl.onplay = startProcessing;

      try {
        await videoEl.play();
      } catch (_) {}

      if (!videoEl.paused && !videoEl.ended) {
        startProcessing();
      }
    } catch (error) {
      console.error("Failed to start video file processing:", error);
      setErrorMsg(`Video error: ${error.message || error}`);
      setIsLoaded(false);
    }
  };

  return { isLoaded, errorMsg, startCamera, startVideoFile, stopCamera };
};
