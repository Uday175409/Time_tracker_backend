import { Request, Response } from 'express';
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

export const startTracking = async (req: Request, res: Response) => {
    try {
        const { userId, category, description } = startSchema.parse(req.body);
        const entry = await TimeService.startEntry(userId, category, description);
        res.json({ success: true, entry });
    } catch (error) {
        handleControllerError(res, error);
    }
};

export const stopTracking = async (req: Request, res: Response) => {
    try {
        const { userId } = stopSchema.parse(req.body);
        const entry = await TimeService.stopEntry(userId);
        res.json({ success: true, entry });
    } catch (error) {
        handleControllerError(res, error);
    }
};

export const getToday = async (req: Request, res: Response) => {
    try {
        const { userId } = todayQuerySchema.parse(req.query);
        // Cache for 2 seconds since data changes frequently
        res.set('Cache-Control', 'private, max-age=2');
        const data = await TimeService.getTodayData(userId);
        res.json({ success: true, ...data });
    } catch (error) {
        handleControllerError(res, error);
    }
};

export const getHistory = async (req: Request, res: Response) => {
    try {
        const { userId, days } = historyQuerySchema.parse(req.query);
        // Cache history for 5 minutes since it changes infrequently
        res.set('Cache-Control', 'private, max-age=300');
        const history = await TimeService.getHistory(userId, days);
        res.json({ success: true, history });
    } catch (error) {
        handleControllerError(res, error);
    }
};

export const updateEntry = async (req: Request, res: Response) => {
    try {
        const { entryId, userId, updates } = updateEntrySchema.parse(req.body);
        const entry = await TimeService.updateEntry(entryId, userId, updates);
        res.json({ success: true, entry });
    } catch (error) {
        handleControllerError(res, error);
    }
}
