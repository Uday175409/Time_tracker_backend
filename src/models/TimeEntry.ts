import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ITimeEntryHistory {
  updatedAt: Date;
  reason: string;
  previousDuration: number;
  previousStartTime: Date;
  previousEndTime: Date | null;
}

export interface ITimeEntryAuditHistory {
  oldStartTime: Date;
  oldEndTime: Date | null;
  oldCategory: string;
  oldDescription?: string;
  changedAt: Date;
  reason: string;
}

export interface ITimeEntry extends Document {
  category: string;
  startTime: Date;
  endTime: Date | null;
  date: string;
  durationSeconds: number;
  userId: mongoose.Types.ObjectId;
  description?: string;
  isIdle?: boolean;
  history?: ITimeEntryHistory[];
  status: 'running' | 'completed' | 'paused';
  source: 'auto' | 'manual';
  isRegularized: boolean;
  regularizationReason?: string;
  regularizationStatus: 'pending' | 'approved' | 'rejected';
  auditHistory: ITimeEntryAuditHistory[];
}

const TimeEntryHistorySchema = new Schema({
  updatedAt: { type: Date, default: Date.now },
  reason: String,
  previousDuration: Number,
  previousStartTime: Date,
  previousEndTime: Date,
}, { _id: false });

const TimeEntryAuditHistorySchema = new Schema({
  oldStartTime: { type: Date, required: true },
  oldEndTime: { type: Date, default: null },
  oldCategory: { type: String, required: true },
  oldDescription: { type: String, default: '' },
  changedAt: { type: Date, default: Date.now },
  reason: { type: String, required: true },
}, { _id: false });

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      // Categories are user-defined in Category collection; validation is enforced in TimeService.
      // 'Break' is still blocked there because Pomodoro owns break tracking.
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    date: {
      type: String,
      required: true,
      index: true, 
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    isIdle: {
      type: Boolean,
      default: false,
    },
    history: [TimeEntryHistorySchema],
    status: {
      type: String,
      enum: ['running', 'completed', 'paused'],
      default: 'running',
    },
    source: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
      index: true,
    },
    isRegularized: {
      type: Boolean,
      default: false,
      index: true,
    },
    regularizationReason: {
      type: String,
      default: '',
    },
    regularizationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    auditHistory: {
      type: [TimeEntryAuditHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying of user's daily data
TimeEntrySchema.index({ userId: 1, date: 1 });
// Index for finding running entries
TimeEntrySchema.index({ userId: 1, status: 1 });
// Covers frequently used filters for recent completed and running entry lookups
TimeEntrySchema.index({ userId: 1, status: 1, startTime: -1 });
TimeEntrySchema.index({ userId: 1, status: 1, date: 1 });
TimeEntrySchema.index({ userId: 1, startTime: 1, endTime: 1 });

const TimeEntry: Model<ITimeEntry> =
  mongoose.models.TimeEntry || mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);

export default TimeEntry;
