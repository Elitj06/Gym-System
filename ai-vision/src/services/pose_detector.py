"""
Pose Detection Service using MediaPipe
"""

import cv2
import mediapipe as mp
import numpy as np
import base64
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class PoseDetector:
    """Pose detection using MediaPipe Pose"""
    
    def __init__(self, confidence_threshold=0.7):
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,
            smooth_landmarks=True,
            min_detection_confidence=confidence_threshold,
            min_tracking_confidence=confidence_threshold
        )
        
        self.total_detections = 0
        self.confidence_scores = []
        
        # Landmark names for reference
        self.landmark_names = [
            'NOSE', 'LEFT_EYE_INNER', 'LEFT_EYE', 'LEFT_EYE_OUTER',
            'RIGHT_EYE_INNER', 'RIGHT_EYE', 'RIGHT_EYE_OUTER',
            'LEFT_EAR', 'RIGHT_EAR', 'MOUTH_LEFT', 'MOUTH_RIGHT',
            'LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ELBOW', 'RIGHT_ELBOW',
            'LEFT_WRIST', 'RIGHT_WRIST', 'LEFT_PINKY', 'RIGHT_PINKY',
            'LEFT_INDEX', 'RIGHT_INDEX', 'LEFT_THUMB', 'RIGHT_THUMB',
            'LEFT_HIP', 'RIGHT_HIP', 'LEFT_KNEE', 'RIGHT_KNEE',
            'LEFT_ANKLE', 'RIGHT_ANKLE', 'LEFT_HEEL', 'RIGHT_HEEL',
            'LEFT_FOOT_INDEX', 'RIGHT_FOOT_INDEX'
        ]
    
    def decode_image(self, image_data: str) -> Optional[np.ndarray]:
        """Decode base64 image to numpy array"""
        try:
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return image
        except Exception as e:
            logger.error(f"Error decoding image: {str(e)}")
            return None
    
    def detect(self, image_data: str) -> Optional[Dict]:
        """
        Detect pose from image data
        
        Args:
            image_data: Base64 encoded image
            
        Returns:
            Dictionary containing landmarks and metadata
        """
        try:
            # Decode image
            image = self.decode_image(image_data)
            if image is None:
                return None
            
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Process image
            results = self.pose.process(image_rgb)
            
            if not results.pose_landmarks:
                logger.warning("No pose detected in image")
                return None
            
            # Extract landmarks
            landmarks = []
            for idx, landmark in enumerate(results.pose_landmarks.landmark):
                landmarks.append({
                    'name': self.landmark_names[idx],
                    'x': landmark.x,
                    'y': landmark.y,
                    'z': landmark.z,
                    'visibility': landmark.visibility
                })
            
            # Calculate average confidence
            avg_visibility = np.mean([lm.visibility for lm in results.pose_landmarks.landmark])
            
            # Update statistics
            self.total_detections += 1
            self.confidence_scores.append(avg_visibility)
            
            return {
                'landmarks': landmarks,
                'confidence': float(avg_visibility),
                'timestamp': datetime.utcnow().isoformat(),
                'image_shape': image.shape
            }
            
        except Exception as e:
            logger.error(f"Error detecting pose: {str(e)}")
            return None
    
    def calculate_angle(self, a: Dict, b: Dict, c: Dict) -> float:
        """Calculate angle between three points"""
        try:
            a = np.array([a['x'], a['y']])
            b = np.array([b['x'], b['y']])
            c = np.array([c['x'], c['y']])
            
            radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - \
                      np.arctan2(a[1] - b[1], a[0] - b[0])
            angle = np.abs(radians * 180.0 / np.pi)
            
            if angle > 180.0:
                angle = 360 - angle
                
            return angle
        except Exception as e:
            logger.error(f"Error calculating angle: {str(e)}")
            return 0.0
    
    def get_landmark_by_name(self, landmarks: List[Dict], name: str) -> Optional[Dict]:
        """Get landmark by name"""
        for landmark in landmarks:
            if landmark['name'] == name:
                return landmark
        return None
    
    def get_total_detections(self) -> int:
        """Get total number of detections"""
        return self.total_detections
    
    def get_avg_confidence(self) -> float:
        """Get average confidence score"""
        if not self.confidence_scores:
            return 0.0
        return float(np.mean(self.confidence_scores))
    
    def __del__(self):
        """Cleanup"""
        if hasattr(self, 'pose'):
            self.pose.close()
