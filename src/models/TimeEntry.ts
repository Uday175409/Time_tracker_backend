import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ITimeEntry extends Document {
  category: string;
  startTime: Date;
  endTime: Date | null;
  date: string;
  durationSeconds: number;
  userId: mongoose.Types.ObjectId;
  description?: string;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    category: {
      type: String,
      required: true,
      enum: ['Python', 'SQL', 'Datasetu', 'Break', 'TT'],
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    date: {
      type: String,
      required: true,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const TimeEntry: Model<ITimeEntry> =
  mongoose.models.TimeEntry || mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);

export default TimeEntry;
