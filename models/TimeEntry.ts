import mongoose, { Schema, Model } from 'mongoose';

export interface ITimeEntry {
  category: string;
  startTime: Date;
  endTime: Date | null;
  date: string; // YYYY-MM-DD
  durationSeconds: number;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    category: {
      type: String,
      required: true,
      enum: ['Python', 'SQL', 'Midas', 'Datasetu', 'Break', 'TT'],
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
  },
  {
    timestamps: true,
  }
);

const TimeEntry: Model<ITimeEntry> =
  mongoose.models.TimeEntry || mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);

export default TimeEntry;
