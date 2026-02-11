"""
Video Processor - Process video files for pose detection
"""

import cv2
import numpy as np
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class VideoProcessor:
    """Process video files for pose detection"""
    
    def __init__(self):
        self.max_fps = 30
    
    def process_video(
        self,
        video_path: str,
        pose_detector,
        exercise_analyzer,
        alert_system
    ) -> Dict:
        """
        Process video file
        
        Args:
            video_path: Path to video file
            pose_detector: PoseDetector instance
            exercise_analyzer: ExerciseAnalyzer instance
            alert_system: AlertSystem instance
            
        Returns:
            Processing results
        """
        try:
            cap = cv2.VideoCapture(video_path)
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = int(cap.get(cv2.CAP_PROP_FPS))
            
            results = {
                'total_frames': total_frames,
                'detected_frames': 0,
                'exercises': {},
                'alerts': [],
                'summary': {}
            }
            
            frame_count = 0
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Process every Nth frame to maintain target FPS
                if frame_count % (fps // self.max_fps) != 0:
                    continue
                
                # Convert frame to base64 for processing
                _, buffer = cv2.imencode('.jpg', frame)
                import base64
                image_base64 = base64.b64encode(buffer).decode('utf-8')
                
                # Detect pose
                detection = pose_detector.detect(image_base64)
                
                if detection:
                    results['detected_frames'] += 1
                    
                    # Analyze exercise
                    exercise = exercise_analyzer.analyze(detection['landmarks'])
                    
                    # Track exercises
                    ex_type = exercise['type']
                    if ex_type not in results['exercises']:
                        results['exercises'][ex_type] = {
                            'count': 0,
                            'total_reps': 0
                        }
                    
                    results['exercises'][ex_type]['count'] += 1
                    results['exercises'][ex_type]['total_reps'] = exercise['reps']
                    
                    # Check alerts
                    alerts = alert_system.check_alerts(
                        detection['landmarks'],
                        ex_type
                    )
                    results['alerts'].extend(alerts)
            
            cap.release()
            
            # Generate summary
            results['summary'] = {
                'processed_frames': frame_count,
                'detection_rate': results['detected_frames'] / total_frames if total_frames > 0 else 0,
                'total_exercises': len(results['exercises']),
                'total_alerts': len(results['alerts'])
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Error processing video: {str(e)}")
            return {
                'total_frames': 0,
                'detected_frames': 0,
                'exercises': {},
                'alerts': [],
                'summary': {'error': str(e)}
            }
