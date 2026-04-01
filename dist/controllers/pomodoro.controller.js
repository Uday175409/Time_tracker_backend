import { PomodoroService } from '../services/pomodoro.service.js';
import { handleControllerError } from '../utils/error-handler.js';
import { z } from 'zod';
const completePomodoroSchema = z.object({
    userId: z.string().min(1),
    category: z.string().min(1),
});
const completeBreakSchema = z.object({
    userId: z.string().min(1),
});
const setModeSchema = z.object({
    userId: z.string().min(1),
    mode: z.enum(['25/5', '50/10', 'custom']),
    customWorkMinutes: z.coerce.number().int().min(1).max(180).optional(),
    customBreakMinutes: z.coerce.number().int().min(0).max(60).optional(),
});
const startWorkSchema = z.object({
    userId: z.string().min(1),
    category: z.string().min(1),
});
const userIdSchema = z.object({
    userId: z.string().min(1),
});
/** GET /pomodoro/today?userId=... */
export const getPomodoroToday = async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId)
            return res.status(400).json({ success: false, message: 'userId required', errorType: 'missing_required_field' });
        const session = await PomodoroService.getTodaySession(userId);
        res.json({ success: true, session });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
/** POST /pomodoro/start-work — begin a work pomodoro */
export const startWork = async (req, res) => {
    try {
        const { userId, category } = startWorkSchema.parse(req.body);
        const result = await PomodoroService.startWork(userId, category);
        res.json({ success: true, ...result });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
/** POST /pomodoro/complete-work — work pomodoro finished */
export const completePomodoro = async (req, res) => {
    try {
        const { userId, category } = completePomodoroSchema.parse(req.body);
        const result = await PomodoroService.completePomodoro(userId, category);
        res.json({ success: true, ...result });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
/** POST /pomodoro/complete-break — break finished */
export const completeBreak = async (req, res) => {
    try {
        const { userId } = completeBreakSchema.parse(req.body);
        const result = await PomodoroService.completeBreak(userId);
        res.json({ success: true, ...result });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
/** POST /pomodoro/cancel — cancel active pomodoro */
export const cancelPomodoro = async (req, res) => {
    try {
        const { userId } = userIdSchema.parse(req.body);
        const result = await PomodoroService.cancelPomodoro(userId);
        res.json({ success: true, ...result });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
/** POST /pomodoro/pause — pause active pomodoro */
export const pausePomodoro = async (req, res) => {
    try {
        const { userId } = userIdSchema.parse(req.body);
        const result = await PomodoroService.pausePomodoro(userId);
        res.json({ success: true, ...result });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
/** POST /pomodoro/resume — resume paused pomodoro */
export const resumePomodoro = async (req, res) => {
    try {
        const { userId } = userIdSchema.parse(req.body);
        const result = await PomodoroService.resumePomodoro(userId);
        res.json({ success: true, ...result });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
/** PUT /pomodoro/mode — change 25/5, 50/10 or custom */
export const setMode = async (req, res) => {
    try {
        const { userId, mode, customWorkMinutes, customBreakMinutes } = setModeSchema.parse(req.body);
        const session = await PomodoroService.setMode(userId, mode, customWorkMinutes, customBreakMinutes);
        res.json({ success: true, session });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
