"""
Exercise Analyzer - Identifies and analyzes exercises
"""

import numpy as np
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class ExerciseAnalyzer:
    """Analyze exercises based on pose landmarks"""
    
    def __init__(self):
        self.supported_exercises = {
            'squat': 'Agachamento',
            'deadlift': 'Levantamento Terra',
            'bench_press': 'Supino',
            'shoulder_press': 'Desenvolvimento',
            'bicep_curl': 'Rosca Bíceps',
            'tricep_extension': 'Extensão Tríceps',
            'lunge': 'Afundo',
            'plank': 'Prancha',
            'push_up': 'Flexão',
            'pull_up': 'Barra Fixa',
            'leg_press': 'Leg Press',
            'lat_pulldown': 'Puxada Alta',
            'chest_fly': 'Crucifixo',
            'shoulder_lateral_raise': 'Elevação Lateral'
        }
        
        self.rep_counters = {}
        self.set_counters = {}
    
    def analyze(self, landmarks: List[Dict]) -> Dict:
        """
        Analyze landmarks to identify exercise and count reps
        
        Args:
            landmarks: List of pose landmarks
            
        Returns:
            Dictionary with exercise type, reps, and metrics
        """
        try:
            # Identify exercise type
            exercise_type = self._identify_exercise(landmarks)
            
            # Count reps
            reps = self._count_reps(landmarks, exercise_type)
            
            # Calculate form score
            form_score = self._calculate_form_score(landmarks, exercise_type)
            
            # Get recommendations
            recommendations = self._get_recommendations(landmarks, exercise_type)
            
            return {
                'type': exercise_type,
                'name': self.supported_exercises.get(exercise_type, 'Unknown'),
                'reps': reps,
                'sets': self.set_counters.get(exercise_type, 0),
                'confidence': self._get_confidence(landmarks, exercise_type),
                'formScore': form_score,
                'recommendations': recommendations
            }
            
        except Exception as e:
            logger.error(f"Error analyzing exercise: {str(e)}")
            return {
                'type': 'unknown',
                'name': 'Unknown',
                'reps': 0,
                'sets': 0,
                'confidence': 0.0,
                'formScore': 0.0,
                'recommendations': []
            }
    
    def _identify_exercise(self, landmarks: List[Dict]) -> str:
        """Identify exercise type from landmarks"""
        try:
            # Get key landmark positions
            left_shoulder = self._get_landmark(landmarks, 'LEFT_SHOULDER')
            right_shoulder = self._get_landmark(landmarks, 'RIGHT_SHOULDER')
            left_hip = self._get_landmark(landmarks, 'LEFT_HIP')
            right_hip = self._get_landmark(landmarks, 'RIGHT_HIP')
            left_knee = self._get_landmark(landmarks, 'LEFT_KNEE')
            right_knee = self._get_landmark(landmarks, 'RIGHT_KNEE')
            left_ankle = self._get_landmark(landmarks, 'LEFT_ANKLE')
            right_ankle = self._get_landmark(landmarks, 'RIGHT_ANKLE')
            left_elbow = self._get_landmark(landmarks, 'LEFT_ELBOW')
            right_elbow = self._get_landmark(landmarks, 'RIGHT_ELBOW')
            
            if not all([left_hip, right_hip, left_knee, right_knee]):
                return 'unknown'
            
            # Calculate angles
            hip_knee_angle_left = self._calculate_angle(left_shoulder, left_hip, left_knee)
            hip_knee_angle_right = self._calculate_angle(right_shoulder, right_hip, right_knee)
            knee_angle_left = self._calculate_angle(left_hip, left_knee, left_ankle)
            knee_angle_right = self._calculate_angle(right_hip, right_knee, right_ankle)
            
            # Squat detection
            avg_knee_angle = (knee_angle_left + knee_angle_right) / 2
            if avg_knee_angle < 100:  # Knees bent
                return 'squat'
            
            # Push-up detection (horizontal body position)
            shoulder_hip_diff = abs(left_shoulder['y'] - left_hip['y'])
            if shoulder_hip_diff < 0.2:
                return 'push_up'
            
            # Plank detection (horizontal and stable)
            if shoulder_hip_diff < 0.15:
                return 'plank'
            
            # Default to unknown
            return 'unknown'
            
        except Exception as e:
            logger.error(f"Error identifying exercise: {str(e)}")
            return 'unknown'
    
    def _count_reps(self, landmarks: List[Dict], exercise_type: str) -> int:
        """Count repetitions for the exercise"""
        # Initialize counter if needed
        if exercise_type not in self.rep_counters:
            self.rep_counters[exercise_type] = {
                'count': 0,
                'stage': None
            }
        
        counter = self.rep_counters[exercise_type]
        
        if exercise_type == 'squat':
            return self._count_squat_reps(landmarks, counter)
        elif exercise_type == 'push_up':
            return self._count_pushup_reps(landmarks, counter)
        elif exercise_type == 'bicep_curl':
            return self._count_curl_reps(landmarks, counter)
        
        return counter['count']
    
    def _count_squat_reps(self, landmarks: List[Dict], counter: Dict) -> int:
        """Count squat reps"""
        try:
            left_hip = self._get_landmark(landmarks, 'LEFT_HIP')
            left_knee = self._get_landmark(landmarks, 'LEFT_KNEE')
            left_ankle = self._get_landmark(landmarks, 'LEFT_ANKLE')
            
            if not all([left_hip, left_knee, left_ankle]):
                return counter['count']
            
            angle = self._calculate_angle(left_hip, left_knee, left_ankle)
            
            # Down position
            if angle < 90 and counter['stage'] != 'down':
                counter['stage'] = 'down'
            
            # Up position - count rep
            if angle > 160 and counter['stage'] == 'down':
                counter['stage'] = 'up'
                counter['count'] += 1
            
            return counter['count']
            
        except Exception as e:
            logger.error(f"Error counting squat reps: {str(e)}")
            return counter['count']
    
    def _count_pushup_reps(self, landmarks: List[Dict], counter: Dict) -> int:
        """Count push-up reps"""
        # Similar logic for push-ups
        return counter['count']
    
    def _count_curl_reps(self, landmarks: List[Dict], counter: Dict) -> int:
        """Count bicep curl reps"""
        # Similar logic for curls
        return counter['count']
    
    def _calculate_form_score(self, landmarks: List[Dict], exercise_type: str) -> float:
        """Calculate form score (0-100)"""
        # Placeholder - would implement actual form analysis
        return 85.0
    
    def _get_recommendations(self, landmarks: List[Dict], exercise_type: str) -> List[str]:
        """Get form recommendations"""
        recommendations = []
        
        # Placeholder - would implement actual recommendations
        if exercise_type == 'squat':
            recommendations.append("Mantenha as costas retas")
            recommendations.append("Desça até os joelhos formarem 90 graus")
        
        return recommendations
    
    def _get_confidence(self, landmarks: List[Dict], exercise_type: str) -> float:
        """Get confidence score for exercise identification"""
        if exercise_type == 'unknown':
            return 0.0
        return 0.85  # Placeholder
    
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
    
    def get_supported_exercises(self) -> List[Dict]:
        """Get list of supported exercises"""
        return [
            {'id': k, 'name': v}
            for k, v in self.supported_exercises.items()
        ]
    
    def reset_counters(self, exercise_type: str = None):
        """Reset rep/set counters"""
        if exercise_type:
            if exercise_type in self.rep_counters:
                self.rep_counters[exercise_type] = {'count': 0, 'stage': None}
        else:
            self.rep_counters = {}
            self.set_counters = {}
