"""
AI Vision Service - Pose Detection and Exercise Analysis
Main application file
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv

from src.services.pose_detector import PoseDetector
from src.services.exercise_analyzer import ExerciseAnalyzer
from src.services.alert_system import AlertSystem
from src.utils.logger import setup_logger
from src.utils.video_processor import VideoProcessor

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Setup logging
logger = setup_logger(__name__)

# Initialize services
pose_detector = PoseDetector()
exercise_analyzer = ExerciseAnalyzer()
alert_system = AlertSystem()
video_processor = VideoProcessor()

# Configuration
PORT = int(os.getenv('PORT', 5000))
DEBUG = os.getenv('FLASK_ENV') == 'development'
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', 0.7))


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ai-vision',
        'version': '1.0.0'
    }), 200


@app.route('/api/v1/detect-pose', methods=['POST'])
def detect_pose():
    """
    Detect pose from image or video frame
    
    Expected payload:
    {
        "image": "base64_encoded_image" or "image_url",
        "userId": "user_id",
        "gymId": "gym_id",
        "cameraId": "camera_id"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        image_data = data.get('image')
        user_id = data.get('userId')
        gym_id = data.get('gymId')
        camera_id = data.get('cameraId')
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Process image and detect pose
        result = pose_detector.detect(image_data)
        
        if not result:
            return jsonify({'error': 'Pose detection failed'}), 500
        
        # Analyze exercise
        exercise_data = exercise_analyzer.analyze(result['landmarks'])
        
        # Check for alerts
        alerts = alert_system.check_alerts(
            landmarks=result['landmarks'],
            exercise_type=exercise_data['type']
        )
        
        # Build response
        response = {
            'success': True,
            'data': {
                'landmarks': result['landmarks'],
                'confidence': result['confidence'],
                'exercise': exercise_data,
                'alerts': alerts,
                'userId': user_id,
                'gymId': gym_id,
                'cameraId': camera_id,
                'timestamp': result['timestamp']
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f'Error in pose detection: {str(e)}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/v1/analyze-video', methods=['POST'])
def analyze_video():
    """
    Analyze video for pose detection
    
    Expected payload:
    {
        "videoUrl": "url_to_video" or "base64_video",
        "userId": "user_id",
        "gymId": "gym_id"
    }
    """
    try:
        data = request.get_json()
        
        video_url = data.get('videoUrl')
        user_id = data.get('userId')
        gym_id = data.get('gymId')
        
        if not video_url:
            return jsonify({'error': 'No video provided'}), 400
        
        # Process video
        results = video_processor.process_video(
            video_url,
            pose_detector,
            exercise_analyzer,
            alert_system
        )
        
        response = {
            'success': True,
            'data': {
                'totalFrames': results['total_frames'],
                'detectedFrames': results['detected_frames'],
                'exercises': results['exercises'],
                'alerts': results['alerts'],
                'summary': results['summary'],
                'userId': user_id,
                'gymId': gym_id
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f'Error in video analysis: {str(e)}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/v1/exercises', methods=['GET'])
def get_supported_exercises():
    """Get list of supported exercises"""
    exercises = exercise_analyzer.get_supported_exercises()
    return jsonify({
        'success': True,
        'data': exercises
    }), 200


@app.route('/api/v1/metrics', methods=['GET'])
def get_metrics():
    """Get service metrics"""
    metrics = {
        'total_detections': pose_detector.get_total_detections(),
        'avg_confidence': pose_detector.get_avg_confidence(),
        'uptime': app.config.get('uptime', 0)
    }
    return jsonify({
        'success': True,
        'data': metrics
    }), 200


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f'Internal server error: {str(error)}')
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    logger.info(f"""
    ╔════════════════════════════════════════════╗
    ║                                            ║
    ║     🤖 AI VISION SERVICE - STARTING       ║
    ║                                            ║
    ║  Port:        {PORT}                       ║
    ║  Environment: {os.getenv('FLASK_ENV')}    ║
    ║  Confidence:  {CONFIDENCE_THRESHOLD}      ║
    ║                                            ║
    ╚════════════════════════════════════════════╝
    """)
    
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=DEBUG
    )
