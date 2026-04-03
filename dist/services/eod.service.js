import EODSummary from '../models/EODSummary.js';
import TimeEntry from '../models/TimeEntry.js';
import { CategoryService } from './category.service.js';
import { clearLiveDayCaches, getCurrentEodCacheKey, getSecondsUntilEndOfUtcDay, getUtcDateString, readJsonCache, writeJsonCache, } from '../lib/redis-cache.js';
/**
 * EODService manages End-of-Day summaries.
 * Each user gets one summary per calendar date. The summary blends
 * auto-computed metrics (from TimeEntries) with user-editable context
 * (summary text, highlights, blockers). Every edit is versioned.
 */
export class EODService {
    static getCurrentDateString() {
        return getUtcDateString();
    }
    /**
     * Retrieve (or generate) the EOD summary for a given user + date.
     * Always recalculates metrics from TimeEntries so numbers stay accurate
     * even if entries are edited after the summary was first created.
     */
    static async getOrCreateEOD(userId, date) {
        // Compute metrics from actual tracked data
        const metrics = await this.computeMetrics(userId, date);
        // Upsert: create if missing, always refresh the computed fields
        let eod = await EODSummary.findOne({ userId, date });
        if (!eod) {
            eod = await EODSummary.create({
                userId,
                date,
                ...metrics,
                summary: '',
                highlights: [],
                blockers: [],
                versions: [],
            });
        }
        else {
            // Refresh auto-computed fields (user-editable fields are untouched)
            eod.totalHours = metrics.totalHours;
            eod.productiveHours = metrics.productiveHours;
            eod.categoryBreakdown = metrics.categoryBreakdown;
            await eod.save();
        }
        return eod;
    }
    /**
     * Retrieve the EOD summary for the server's current canonical date.
     * This keeps every client anchored to the same date key.
     */
    static async getCurrentEOD(userId) {
        const date = this.getCurrentDateString();
        const cacheKey = getCurrentEodCacheKey(userId, date);
        const cached = await readJsonCache(cacheKey);
        if (cached) {
            return cached;
        }
        const eod = await this.getOrCreateEOD(userId, date);
        const payload = { date, eod: eod.toObject() };
        await writeJsonCache(cacheKey, payload, getSecondsUntilEndOfUtcDay());
        return payload;
    }
    /**
     * Update the user-editable parts of an EOD summary.
     * Pushes the current state into versions before overwriting.
     */
    static async updateEOD(userId, date, updates) {
        // Ensure the EOD exists (and metrics are fresh)
        const eod = await this.getOrCreateEOD(userId, date);
        // Snapshot current user-editable content for audit trail
        eod.versions.push({
            summary: eod.summary,
            highlights: [...eod.highlights],
            blockers: [...eod.blockers],
            editedAt: new Date(),
        });
        // Apply updates (only overwrite fields that are provided)
        if (updates.summary !== undefined)
            eod.summary = updates.summary;
        if (updates.highlights !== undefined)
            eod.highlights = updates.highlights;
        if (updates.blockers !== undefined)
            eod.blockers = updates.blockers;
        await eod.save();
        await clearLiveDayCaches(userId);
        return eod;
    }
    /**
     * Aggregate time entries for a user on a given date into
     * total hours, productive hours, and per-category breakdown.
     */
    static async computeMetrics(userId, date) {
        const entries = await TimeEntry.find({
            userId,
            date,
            status: 'completed',
        });
        // Use user's own productive categories instead of a hardcoded list
        const productiveNames = await CategoryService.getProductiveNames(userId);
        let totalSeconds = 0;
        let productiveSeconds = 0;
        const categoryBreakdown = {};
        entries.forEach((entry) => {
            totalSeconds += entry.durationSeconds;
            categoryBreakdown[entry.category] =
                (categoryBreakdown[entry.category] || 0) + entry.durationSeconds;
            if (productiveNames.includes(entry.category)) {
                productiveSeconds += entry.durationSeconds;
            }
        });
        return {
            totalHours: parseFloat((totalSeconds / 3600).toFixed(2)),
            productiveHours: parseFloat((productiveSeconds / 3600).toFixed(2)),
            categoryBreakdown,
        };
    }
}
