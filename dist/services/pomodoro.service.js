import PomodoroSession from '../models/PomodoroSession.js';
/**
 * PomodoroService orchestrates pomodoro cycles independently of the
 * time-tracking system.
 *
 * Phase state (activePhase, phaseStartedAt, pausedAt, totalPausedSeconds)
 * is persisted in the PomodoroSession document so the timer survives
 * page reloads.
 */
export class PomodoroService {
    /** Helper: get phase duration in seconds based on mode */
    static getPhaseDuration(session, phase) {
        if (phase === 'work') {
            if (session.mode === 'custom')
                return (session.customWorkMinutes ?? 25) * 60;
            if (session.mode === '50/10')
                return 50 * 60;
            return 25 * 60;
        }
        else {
            if (session.mode === 'custom')
                return (session.customBreakMinutes ?? 5) * 60;
            if (session.mode === '50/10')
                return 10 * 60;
            return 5 * 60;
        }
    }
    /** Get (or create) today's pomodoro record for a user.
     *  Auto-expires stale phases so the frontend never sees an expired timer. */
    static async getTodaySession(userId) {
        const date = new Date().toISOString().split('T')[0];
        let session = await PomodoroSession.findOne({ userId, date });
        if (!session) {
            session = await PomodoroSession.create({
                userId,
                date,
                completedPomodoros: 0,
                completedBreaks: 0,
                mode: '25/5',
                activePhase: 'idle',
            });
            return session;
        }
        // Auto-expire stale phases (user closed tab / was away while timer ran out)
        if (session.activePhase !== 'idle' &&
            session.phaseStartedAt &&
            !session.pausedAt // don't expire if paused
        ) {
            const elapsedSec = (Date.now() - new Date(session.phaseStartedAt).getTime()) / 1000 -
                (session.totalPausedSeconds || 0);
            const phaseDuration = this.getPhaseDuration(session, session.activePhase);
            if (elapsedSec >= phaseDuration) {
                // Phase expired while user was away — reset to idle.
                // Increment the completed counter so the user gets credit.
                const wasPhase = session.activePhase;
                session.activePhase = 'idle';
                session.phaseStartedAt = null;
                session.phaseCategory = '';
                session.pausedAt = null;
                session.totalPausedSeconds = 0;
                if (wasPhase === 'work')
                    session.completedPomodoros += 1;
                else
                    session.completedBreaks += 1;
                await session.save();
            }
        }
        return session;
    }
    static async startWork(userId, category) {
        const date = new Date().toISOString().split('T')[0];
        // Persist phase state
        const session = await PomodoroSession.findOneAndUpdate({ userId, date }, {
            $set: {
                activePhase: 'work',
                phaseStartedAt: new Date(),
                phaseCategory: category,
                pausedAt: null,
                totalPausedSeconds: 0,
            },
            $setOnInsert: { completedPomodoros: 0, completedBreaks: 0, mode: '25/5' },
        }, { upsert: true, new: true });
        return { session };
    }
    static async completePomodoro(userId, category) {
        const date = new Date().toISOString().split('T')[0];
        // Get session to check modes
        let existingSession = await PomodoroSession.findOne({ userId, date });
        const breakDuration = existingSession ? this.getPhaseDuration(existingSession, 'break') : 5 * 60;
        if (breakDuration > 0) {
            const session = await PomodoroSession.findOneAndUpdate({ userId, date }, {
                $inc: { completedPomodoros: 1 },
                $set: {
                    activePhase: 'break',
                    phaseStartedAt: new Date(),
                    phaseCategory: category,
                    pausedAt: null,
                    totalPausedSeconds: 0,
                },
                $setOnInsert: { mode: '25/5', completedBreaks: 0 },
            }, { upsert: true, new: true });
            return { session };
        }
        else {
            const session = await PomodoroSession.findOneAndUpdate({ userId, date }, {
                $inc: { completedPomodoros: 1 },
                $set: {
                    activePhase: 'idle',
                    phaseStartedAt: null,
                    phaseCategory: '',
                    pausedAt: null,
                    totalPausedSeconds: 0,
                },
                $setOnInsert: { mode: '25/5', completedBreaks: 0 },
            }, { upsert: true, new: true });
            return { session };
        }
    }
    /**
     * Called when a break period finishes.
     * Increments break counter, resets phase to idle.
     */
    static async completeBreak(userId) {
        const date = new Date().toISOString().split('T')[0];
        const session = await PomodoroSession.findOneAndUpdate({ userId, date }, {
            $inc: { completedBreaks: 1 },
            $set: {
                activePhase: 'idle',
                phaseStartedAt: null,
                phaseCategory: '',
                pausedAt: null,
                totalPausedSeconds: 0,
            },
        }, { new: true });
        return { session };
    }
    /**
     * Cancel an active pomodoro — resets phase to idle.
     */
    static async cancelPomodoro(userId) {
        const date = new Date().toISOString().split('T')[0];
        const session = await PomodoroSession.findOneAndUpdate({ userId, date }, {
            $set: {
                activePhase: 'idle',
                phaseStartedAt: null,
                phaseCategory: '',
                pausedAt: null,
                totalPausedSeconds: 0,
            },
        }, { new: true });
        return { session };
    }
    /**
     * Pause the current pomodoro phase.
     * Records pausedAt timestamp for elapsed-time calculation on resume.
     */
    static async pausePomodoro(userId) {
        const date = new Date().toISOString().split('T')[0];
        const session = await PomodoroSession.findOneAndUpdate({ userId, date, activePhase: { $ne: 'idle' }, pausedAt: null }, { $set: { pausedAt: new Date() } }, { new: true });
        return { session };
    }
    /**
     * Resume a paused pomodoro.
     * Adds paused duration to totalPausedSeconds and clears pausedAt.
     */
    static async resumePomodoro(userId) {
        const date = new Date().toISOString().split('T')[0];
        const session = await PomodoroSession.findOne({ userId, date });
        if (!session || !session.pausedAt)
            return { session };
        const pausedDuration = Math.floor((Date.now() - new Date(session.pausedAt).getTime()) / 1000);
        session.totalPausedSeconds += pausedDuration;
        session.pausedAt = null;
        await session.save();
        return { session };
    }
    /** Update the user's preferred pomodoro mode for today */
    static async setMode(userId, mode, customWorkMinutes, customBreakMinutes) {
        const date = new Date().toISOString().split('T')[0];
        const updateFields = { mode };
        if (mode === 'custom') {
            updateFields.customWorkMinutes = customWorkMinutes ?? 25;
            updateFields.customBreakMinutes = customBreakMinutes ?? 5;
        }
        const session = await PomodoroSession.findOneAndUpdate({ userId, date }, { $set: updateFields, $setOnInsert: { completedPomodoros: 0, completedBreaks: 0 } }, { upsert: true, new: true });
        return session;
    }
}
