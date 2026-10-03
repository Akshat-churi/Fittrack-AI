import { useState, useCallback, useRef } from 'react';
import { calculateAngle } from '../utils/angleCalculator';

export const useExerciseTracker = (type) => {
  const [reps, setReps] = useState(0);
  const [status, setStatus] = useState('UP'); // 'UP' or 'DOWN'
  // Use a ref to store the latest status to avoid stale closures in callbacks
  const statusRef = useRef('UP');

  const updateStatus = (newStatus) => {
    setStatus(newStatus);
    statusRef.current = newStatus;
  };

  const processLandmarks = useCallback((landmarks) => {
    console.log("useExerciseTracker: processLandmarks called with landmarks:", landmarks?.length);
    if (!landmarks || landmarks.length === 0) return;

    if (type === 'pushups') {
      // Try left side first, then fall back to right side
      let shoulder, elbow, wrist;
      
      // Check left side (11, 13, 15)
      const leftShoulder = landmarks[11];
      const leftElbow = landmarks[13];
      const leftWrist = landmarks[15];
      const leftSideVisible = leftShoulder && leftElbow && leftWrist && 
                              leftShoulder.visibility > 0.5 && leftElbow.visibility > 0.5 && leftWrist.visibility > 0.5;
      
      if (leftSideVisible) {
        shoulder = leftShoulder; elbow = leftElbow; wrist = leftWrist;
        console.log("Using LEFT side for pushups");
      } else {
        // Check right side (12, 14, 16)
        const rightShoulder = landmarks[12];
        const rightElbow = landmarks[14];
        const rightWrist = landmarks[16];
        const rightSideVisible = rightShoulder && rightElbow && rightWrist && 
                               rightShoulder.visibility > 0.5 && rightElbow.visibility > 0.5 && rightWrist.visibility > 0.5;
        if (rightSideVisible) {
          shoulder = rightShoulder; elbow = rightElbow; wrist = rightWrist;
          console.log("Using RIGHT side for pushups");
        } else {
          console.log("Neither side visible enough for pushups");
          return;
        }
      }

      const angle = calculateAngle(shoulder, elbow, wrist);
      console.log("Pushup angle:", angle, "Current status:", statusRef.current);

      if (angle > 160) {
        if (statusRef.current === 'DOWN') {
          console.log("REP COUNTED! +1");
          setReps((prev) => prev + 1);
        }
        updateStatus('UP');
      } else if (angle < 90) {
        updateStatus('DOWN');
      }
    } else if (type === 'squats') {
      // Try left side first, then fall back to right side for squats too!
      let hip, knee, ankle;
      
      // Left side (23,25,27)
      const leftHip = landmarks[23];
      const leftKnee = landmarks[25];
      const leftAnkle = landmarks[27];
      const leftSideVisible = leftHip && leftKnee && leftAnkle && 
                              leftHip.visibility > 0.5 && leftKnee.visibility > 0.5 && leftAnkle.visibility > 0.5;
      
      if (leftSideVisible) {
        hip = leftHip; knee = leftKnee; ankle = leftAnkle;
        console.log("Using LEFT side for squats");
      } else {
        // Right side (24, 26, 28)
        const rightHip = landmarks[24];
        const rightKnee = landmarks[26];
        const rightAnkle = landmarks[28];
        const rightSideVisible = rightHip && rightKnee && rightAnkle && 
                               rightHip.visibility > 0.5 && rightKnee.visibility > 0.5 && rightAnkle.visibility > 0.5;
        if (rightSideVisible) {
          hip = rightHip; knee = rightKnee; ankle = rightAnkle;
          console.log("Using RIGHT side for squats");
        } else {
          console.log("Neither side visible enough for squats");
          return;
        }
      }

      const angle = calculateAngle(hip, knee, ankle);
      console.log("Squat angle:", angle, "Current status:", statusRef.current);

      if (angle > 160) {
        if (statusRef.current === 'DOWN') {
          console.log("REP COUNTED! +1");
          setReps((prev) => prev + 1);
        }
        updateStatus('UP');
      } else if (angle < 90) {
        updateStatus('DOWN');
      }
    }
  }, [type]);

  const resetReps = useCallback(() => {
    setReps(0);
    updateStatus('UP');
  }, []);

  return { reps, status, processLandmarks, resetReps };
};
