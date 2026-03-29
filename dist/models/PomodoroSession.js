import mongoose, { Schema } from 'mongoose';
const PomodoroSessionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    completedPomodoros: {
        type: Number,
        default: 0,
    },
    completedBreaks: {
        type: Number,
        default: 0,
    },
    mode: {
        type: String,
        enum: ['25/5', '50/10', 'custom'],
        default: '25/5',
    },
    customWorkMinutes: {
        type: Number,
        default: 25,
        min: 1,
        max: 180,
    },
    customBreakMinutes: {
        type: Number,
        default: 5,
        min: 0,
        max: 60,
    },
    activePhase: {
        type: String,
        enum: ['idle', 'work', 'break'],
        default: 'idle',
    },
    phaseStartedAt: {
        type: Date,
        default: null,
    },
    phaseCategory: {
        type: String,
        default: '',
    },
    pausedAt: {
        type: Date,
        default: null,
    },
    totalPausedSeconds: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });
// One record per user per day
PomodoroSessionSchema.index({ userId: 1, date: 1 }, { unique: true });
const PomodoroSession = mongoose.models.PomodoroSession ||
    mongoose.model('PomodoroSession', PomodoroSessionSchema);
export default PomodoroSession;
