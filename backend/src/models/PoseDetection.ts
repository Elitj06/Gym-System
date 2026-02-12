import mongoose, { Schema, Document } from 'mongoose';

export interface IPoseDetection extends Document {
  userId: string;
  gymId: string;
  cameraId: string;
  timestamp: Date;
  landmarks: {
    x: number;
    y: number;
    z: number;
    visibility: number;
    name: string;
  }[];
  exercise: {
    type: string;
    confidence: number;
    reps: number;
    sets: number;
  };
  alerts: {
    type: 'posture' | 'overload' | 'safety';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
  }[];
  metrics: {
    duration: number;
    avgConfidence: number;
    peakLoad: number;
  };
  videoUrl?: string;
  thumbnailUrl?: string;
}

const PoseDetectionSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    gymId: {
      type: String,
      required: true,
      index: true,
    },
    cameraId: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    landmarks: [
      {
        x: Number,
        y: Number,
        z: Number,
        visibility: Number,
        name: String,
      },
    ],
    exercise: {
      type: {
        type: String,
        required: true,
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
      reps: {
        type: Number,
        default: 0,
      },
      sets: {
        type: Number,
        default: 0,
      },
    },
    alerts: [
      {
        type: {
          type: String,
          enum: ['posture', 'overload', 'safety'],
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metrics: {
      duration: Number,
      avgConfidence: Number,
      peakLoad: Number,
    },
    videoUrl: String,
    thumbnailUrl: String,
  },
  {
    timestamps: true,
    collection: 'pose_detections',
  }
);

// Indexes for better query performance
PoseDetectionSchema.index({ userId: 1, timestamp: -1 });
PoseDetectionSchema.index({ gymId: 1, timestamp: -1 });
PoseDetectionSchema.index({ 'exercise.type': 1 });

export default mongoose.model<IPoseDetection>('PoseDetection', PoseDetectionSchema);
