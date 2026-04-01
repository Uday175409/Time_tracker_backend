import { AnalyticsService } from '../services/analytics.service.js';
import { handleControllerError } from '../utils/error-handler.js';
import { z } from 'zod';
const productivityQuerySchema = z.object({
    userId: z.string().min(1),
    range: z.enum(['day', 'week', 'month']).optional().default('day'),
});
const dailyTrendQuerySchema = z.object({
    userId: z.string().min(1),
    days: z.coerce.number().int().min(1).max(365).optional().default(30),
});
const weeklyCategoryQuerySchema = z.object({
    userId: z.string().min(1),
    weeks: z.coerce.number().int().min(1).max(52).optional().default(4),
});
const heatmapQuerySchema = z.object({
    userId: z.string().min(1),
    days: z.coerce.number().int().min(1).max(365).optional().default(365),
});
const userIdQuerySchema = z.object({
    userId: z.string().min(1),
});
export const getProductivity = async (req, res) => {
    try {
        const { userId, range } = productivityQuerySchema.parse(req.query);
        // Cache productivity stats for 1 minute
        res.set('Cache-Control', 'private, max-age=60');
        const data = await AnalyticsService.getProductivityStats(userId, range);
        res.json({ success: true, data });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const getDailyTrend = async (req, res) => {
    try {
        const { userId, days } = dailyTrendQuerySchema.parse(req.query);
        // Cache trend data for 5 minutes
        res.set('Cache-Control', 'private, max-age=300');
        const data = await AnalyticsService.getDailyTrend(userId, days);
        res.json({ success: true, data });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const getWeeklyCategories = async (req, res) => {
    try {
        const { userId, weeks } = weeklyCategoryQuerySchema.parse(req.query);
        // Cache weekly data for 5 minutes
        res.set('Cache-Control', 'private, max-age=300');
        const data = await AnalyticsService.getWeeklyCategoryComparison(userId, weeks);
        res.json({ success: true, data });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const getHeatmap = async (req, res) => {
    try {
        const { userId, days } = heatmapQuerySchema.parse(req.query);
        // Cache heatmap data for 5 minutes
        res.set('Cache-Control', 'private, max-age=300');
        const data = await AnalyticsService.getHeatmapData(userId, days);
        res.json({ success: true, data });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
export const getInsights = async (req, res) => {
    try {
        const { userId } = userIdQuerySchema.parse(req.query);
        // Cache insights for 10 minutes
        res.set('Cache-Control', 'private, max-age=600');
        const data = await AnalyticsService.getInsights(userId);
        res.json({ success: true, data });
    }
    catch (error) {
        handleControllerError(res, error);
    }
};
