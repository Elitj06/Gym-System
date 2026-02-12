"""
Alert System - Detects posture issues and safety concerns
"""

from typing import Dict, List
import logging
import numpy as np

logger = logging.getLogger(__name__)


class AlertSystem:
    """System for generating alerts based on pose analysis"""
    
    def __init__(self):
        self.alert_thresholds = {
            'posture_angle_threshold': 30,  # degrees
            'visibility_threshold': 0.5,
            'safety_distance_threshold': 0.1
        }
    
    def check_alerts(self, landmarks: List[Dict], exercise_type: str) -> List[Dict]:
        """
        Check for alerts based on landmarks and exercise type
        
        Args:
            landmarks: List of pose landmarks
            exercise_type: Type of exercise being performed
            
        Returns:
            List of alerts with severity and messages
        """
        alerts = []
        
        try:
            # Check posture alerts
            posture_alerts = self._check_posture(landmarks, exercise_type)
            alerts.extend(posture_alerts)
            
            # Check safety alerts
            safety_alerts = self._check_safety(landmarks)
            alerts.extend(safety_alerts)
            
            # Check overload alerts
            overload_alerts = self._check_overload(landmarks, exercise_type)
            alerts.extend(overload_alerts)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking alerts: {str(e)}")
            return []
    
    def _check_posture(self, landmarks: List[Dict], exercise_type: str) -> List[Dict]:
        """Check for posture-related issues"""
        alerts = []
        
        try:
            if exercise_type == 'squat':
                # Check knee alignment
                left_hip = self._get_landmark(landmarks, 'LEFT_HIP')
                left_knee = self._get_landmark(landmarks, 'LEFT_KNEE')
                left_ankle = self._get_landmark(landmarks, 'LEFT_ANKLE')
                
                if all([left_hip, left_knee, left_ankle]):
                    # Check if knees are too far forward
                    if left_knee['x'] > left_ankle['x'] + 0.1:
                        alerts.append({
                            'type': 'posture',
                            'severity': 'medium',
                            'message': 'Joelhos muito à frente - risco de lesão',
                            'recommendation': 'Mantenha os joelhos alinhados com os tornozelos'
                        })
                
                # Check back alignment
                left_shoulder = self._get_landmark(landmarks, 'LEFT_SHOULDER')
                if left_shoulder and left_hip:
                    back_angle = abs(left_shoulder['x'] - left_hip['x'])
                    if back_angle > 0.2:
                        alerts.append({
                            'type': 'posture',
                            'severity': 'high',
                            'message': 'Costas inclinadas - mantenha postura ereta',
                            'recommendation': 'Mantenha o tronco reto durante o movimento'
                        })
            
            elif exercise_type == 'deadlift':
                # Check back rounding
                alerts.append({
                    'type': 'posture',
                    'severity': 'low',
                    'message': 'Verifique a postura das costas',
                    'recommendation': 'Mantenha as costas retas e neutras'
                })
        
        except Exception as e:
            logger.error(f"Error checking posture: {str(e)}")
        
        return alerts
    
    def _check_safety(self, landmarks: List[Dict]) -> List[Dict]:
        """Check for safety concerns"""
        alerts = []
        
        try:
            # Check visibility of key landmarks
            critical_landmarks = ['LEFT_HIP', 'RIGHT_HIP', 'LEFT_KNEE', 'RIGHT_KNEE']
            
            for landmark_name in critical_landmarks:
                landmark = self._get_landmark(landmarks, landmark_name)
                if landmark and landmark['visibility'] < self.alert_thresholds['visibility_threshold']:
                    alerts.append({
                        'type': 'safety',
                        'severity': 'medium',
                        'message': f'Ponto crítico {landmark_name} não visível',
                        'recommendation': 'Ajuste o ângulo da câmera'
                    })
            
        except Exception as e:
            logger.error(f"Error checking safety: {str(e)}")
        
        return alerts
    
    def _check_overload(self, landmarks: List[Dict], exercise_type: str) -> List[Dict]:
        """Check for potential overload"""
        alerts = []
        
        try:
            # Check for trembling (would require frame-to-frame comparison)
            # Placeholder for now
            pass
            
        except Exception as e:
            logger.error(f"Error checking overload: {str(e)}")
        
        return alerts
    
    def _get_landmark(self, landmarks: List[Dict], name: str) -> Dict:
        """Get landmark by name"""
        for landmark in landmarks:
            if landmark['name'] == name:
                return landmark
        return None
    
    def _calculate_angle(self, a: Dict, b: Dict, c: Dict) -> float:
        """Calculate angle between three points"""
        if not all([a, b, c]):
            return 0.0
        
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
