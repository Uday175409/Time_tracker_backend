import mongoose, { Schema } from 'mongoose';
const TimeEntrySchema = new Schema({
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
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});
const TimeEntry = mongoose.models.TimeEntry || mongoose.model('TimeEntry', TimeEntrySchema);
export default TimeEntry;
