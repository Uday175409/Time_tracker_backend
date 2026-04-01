import { TimeService } from '../services/time.service.js';
import { handleControllerError } from '../utils/error-handler.js';
import { z } from 'zod';
const startSchema = z.object({
    userId: z.string().min(1),
    category: z.string().trim().min(1).max(50),
    description: z.string().max(500).optional(),
});
const stopSchema = z.object({
    userId: z.string().min(1),
});
const todayQuerySchema = z.object({
    userId: z.string().min(1),
});
const historyQuerySchema = z.object({
    userId: z.string().min(1),
    days: z.coerce.number().int().min(1).max(90).optional().default(7),
});
const updateEntrySchema = z.object({
    entryId: z.string().min(1),
    userId: z.string().min(1),
    updates: z.object({
        startTime: z.coerce.date().optional(),
        endTime: z.coerce.date().optional(),
        description: z.string().max(500).optional(),
        category: z.string().trim().min(1).max(50).optional(),
    }),
});
const manualEntrySchema = z.object({
    userId: z.string().min(1),
    category: z.string().trim().min(1).max(50),
    description: z.string().max(500).optional(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    overwrite: z.boolean().optional().default(false),
});
const regularizeParamsSchema = z.object({
    entryId: z.string().min(1),
});
const regularizeEntrySchema = z.object({
    userId: z.string().min(1),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    category: z.string().trim().min(1).max(50).optional(),
    description: z.string().max(500).optional(),
    reason: z.string().trim().min(3).max(500),
});
const reviewRegularizationSchema = z.object({
    status: z.enum(['approved', 'rejected']),
});
export const startTracking = async (req, res) => {
    try {
        const { userId, category, description } = startSchema.parse(req.body);
        const entry = await TimeService.startEntry(userId, category, description);
        res.json({ success: true, entry });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const stopTracking = async (req, res) => {
    try {
        const { userId } = stopSchema.parse(req.body);
        const entry = await TimeService.stopEntry(userId);
        res.json({ success: true, entry });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const getToday = async (req, res) => {
    try {
        const { userId } = todayQuerySchema.parse(req.query);
        // Cache for 2 seconds since data changes frequently
        res.set('Cache-Control', 'private, max-age=2');
        const data = await TimeService.getTodayData(userId);
        res.json({ success: true, ...data });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const getHistory = async (req, res) => {
    try {
        const { userId, days } = historyQuerySchema.parse(req.query);
        // Cache history for 5 minutes since it changes infrequently
        res.set('Cache-Control', 'private, max-age=300');
        const history = await TimeService.getHistory(userId, days);
        res.json({ success: true, history });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const updateEntry = async (req, res) => {
    try {
        const { entryId, userId, updates } = updateEntrySchema.parse(req.body);
        const entry = await TimeService.updateEntry(entryId, userId, updates);
        res.json({ success: true, entry });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const createManualEntryController = async (req, res) => {
    try {
        const { userId, category, description, startTime, endTime, overwrite } = manualEntrySchema.parse(req.body);
        const entry = await TimeService.createManualEntry({
            userId,
            category,
            description,
            startTime,
            endTime,
            overwrite,
        });
        res.status(201).json({ success: true, entry });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const regularizeEntryController = async (req, res) => {
    try {
        const { entryId } = regularizeParamsSchema.parse(req.params);
        const { userId, startTime, endTime, category, description, reason } = regularizeEntrySchema.parse(req.body);
        const entry = await TimeService.regularizeEntry(entryId, {
            userId,
            startTime,
            endTime,
            category,
            description,
            reason,
        });
        res.json({ success: true, entry });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const reviewRegularizationController = async (req, res) => {
    try {
        const { entryId } = regularizeParamsSchema.parse(req.params);
        const { status } = reviewRegularizationSchema.parse(req.body);
        const entry = await TimeService.reviewRegularization(entryId, { status });
        res.json({ success: true, entry });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
