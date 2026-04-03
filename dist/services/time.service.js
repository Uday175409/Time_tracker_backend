import mongoose from 'mongoose';
import TimeEntry from '../models/TimeEntry.js';
import Category from '../models/Category.js';
import { clearLiveDayCaches, getSecondsUntilEndOfUtcDay, getTodayCacheKey, getUtcDateString, readJsonCache, writeJsonCache, } from '../lib/redis-cache.js';
const toObjectId = (value) => new mongoose.Types.ObjectId(value);
const requestError = (message, status = 400) => {
    const error = new Error(message);
    error.statusCode = status;
    return error;
};
export class TimeService {
    static async validateCategory(userId, category) {
        if (category === 'Break' || category === 'break') {
            throw requestError('Break is reserved for the Pomodoro system and cannot be manually tracked.');
        }
        const found = await Category.findOne({ userId, name: category })
            .collation({ locale: 'en', strength: 2 })
            .select('_id')
            .lean();
        if (!found) {
            throw requestError(`Invalid category "${category}". Please add it in Edit Categories first.`);
        }
    }
    static async validateTimeOverlap(userId, startTime, endTime, excludeEntryId) {
        const query = {
            userId: toObjectId(userId),
            startTime: { $lt: endTime },
            $or: [
                { endTime: { $gt: startTime } },
                { status: 'running', endTime: null },
            ],
        };
        if (excludeEntryId) {
            query._id = { $ne: toObjectId(excludeEntryId) };
        }
        const overlapping = await TimeEntry.findOne(query)
            .select('_id category startTime endTime status')
            .lean();
        if (overlapping) {
            throw requestError('Time entry overlaps with an existing session.', 409);
        }
    }
    static async getOverlappingEntries(userId, startTime, endTime, excludeEntryId) {
        const query = {
            userId: toObjectId(userId),
            startTime: { $lt: endTime },
            $or: [
                { endTime: { $gt: startTime } },
                { status: 'running', endTime: null },
            ],
        };
        if (excludeEntryId) {
            query._id = { $ne: toObjectId(excludeEntryId) };
        }
        return TimeEntry.find(query).sort({ startTime: 1 });
    }
    static recalculateEntry(entry) {
        if (!entry.endTime)
            return;
        entry.durationSeconds = Math.max(0, Math.floor((entry.endTime.getTime() - entry.startTime.getTime()) / 1000));
        entry.date = entry.startTime.toISOString().split('T')[0];
    }
    static async resolveManualOverwriteOverlaps(userId, startTime, endTime) {
        const overlaps = await this.getOverlappingEntries(userId, startTime, endTime);
        if (overlaps.length === 0)
            return;
        for (const entry of overlaps) {
            const entryStart = new Date(entry.startTime);
            const entryEnd = entry.endTime ? new Date(entry.endTime) : null;
            // Running sessions should be finalized before creating overlapping manual ranges.
            if (!entryEnd && entry.status === 'running') {
                throw requestError('Cannot overwrite an active running session. Stop it first, then retry manual overwrite.', 409);
            }
            if (!entryEnd) {
                await entry.deleteOne();
                continue;
            }
            const coversLeft = entryStart < startTime;
            const coversRight = entryEnd > endTime;
            if (!coversLeft && !coversRight) {
                // Existing entry is fully inside manual window.
                await entry.deleteOne();
                continue;
            }
            if (coversLeft && coversRight) {
                // Split entry into left and right pieces around manual window.
                const rightPiece = await TimeEntry.create({
                    userId: entry.userId,
                    category: entry.category,
                    description: entry.description || '',
                    startTime: endTime,
                    endTime: entryEnd,
                    date: endTime.toISOString().split('T')[0],
                    durationSeconds: 0,
                    status: 'completed',
                    source: entry.source || 'auto',
                    isRegularized: false,
                    regularizationStatus: 'approved',
                    regularizationReason: '',
                    isIdle: entry.isIdle || false,
                });
                rightPiece.durationSeconds = Math.max(0, Math.floor((entryEnd.getTime() - endTime.getTime()) / 1000));
                await rightPiece.save();
                entry.endTime = startTime;
                this.recalculateEntry(entry);
                await entry.save();
                continue;
            }
            if (coversLeft && entryEnd > startTime) {
                // Trim right side of existing entry.
                entry.endTime = startTime;
                this.recalculateEntry(entry);
                await entry.save();
                continue;
            }
            if (coversRight && entryStart < endTime) {
                // Trim left side of existing entry.
                entry.startTime = endTime;
                this.recalculateEntry(entry);
                await entry.save();
                continue;
            }
        }
    }
    static async startEntry(userId, category, description) {
        await this.validateCategory(userId, category);
        // Enforce single active session: stop any running entry first
        await this.stopEntry(userId);
        const now = new Date();
        // Use local date string logic if needed, but ISO YYYY-MM-DD is standard
        // Ideally we should handle timezone from client, but keeping simple for now
        const dateStr = now.toISOString().split('T')[0];
        const entry = await TimeEntry.create({
            userId,
            category,
            description,
            startTime: now,
            date: dateStr,
            status: 'running',
            source: 'auto',
            isRegularized: false,
            regularizationStatus: 'approved',
        });
        await clearLiveDayCaches(userId);
        return entry;
    }
    static async stopEntry(userId) {
        const entry = await TimeEntry.findOne({
            userId,
            status: 'running'
        });
        if (!entry)
            return null;
        const now = new Date();
        const duration = Math.floor((now.getTime() - entry.startTime.getTime()) / 1000);
        entry.endTime = now;
        entry.durationSeconds = duration;
        entry.status = 'completed';
        await entry.save();
        await clearLiveDayCaches(userId);
        return entry;
    }
    static async createManualEntry(data) {
        const { userId, category, description, startTime, endTime, overwrite = false } = data;
        await this.validateCategory(userId, category);
        if (startTime >= endTime) {
            throw requestError('startTime must be before endTime.');
        }
        if (overwrite) {
            await this.resolveManualOverwriteOverlaps(userId, startTime, endTime);
        }
        else {
            await this.validateTimeOverlap(userId, startTime, endTime);
        }
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        const dateStr = startTime.toISOString().split('T')[0];
        const entry = await TimeEntry.create({
            userId,
            category,
            description: description || '',
            startTime,
            endTime,
            date: dateStr,
            durationSeconds,
            status: 'completed',
            source: 'manual',
            isRegularized: false,
            regularizationStatus: 'approved',
            regularizationReason: '',
        });
        await clearLiveDayCaches(userId);
        return entry;
    }
    static async getTodayData(userId) {
        const dateStr = getUtcDateString();
        const cacheKey = getTodayCacheKey(userId, dateStr);
        const cached = await readJsonCache(cacheKey);
        if (cached) {
            return cached;
        }
        const [entries, fallbackRunningEntry] = await Promise.all([
            TimeEntry.find({
                userId,
                date: dateStr,
            })
                .select('category startTime endTime date durationSeconds description isIdle status source isRegularized regularizationStatus regularizationReason auditHistory')
                .sort({ startTime: -1 })
                .lean(),
            TimeEntry.findOne({
                userId,
                status: 'running',
            })
                .sort({ startTime: -1 })
                .select('category startTime endTime date durationSeconds description isIdle status source isRegularized regularizationStatus regularizationReason auditHistory')
                .lean(),
        ]);
        const totals = {};
        let runningEntry = null;
        entries.forEach(entry => {
            if (entry.status === 'running') {
                runningEntry = entry;
            }
            else {
                totals[entry.category] = (totals[entry.category] || 0) + entry.durationSeconds;
            }
        });
        // If no running entry was found in today's entries, check if there's
        // one from a previous date (e.g. started before UTC midnight).
        // This prevents sessions from "vanishing" at the date boundary.
        if (!runningEntry)
            runningEntry = fallbackRunningEntry;
        const payload = { entries, totals, runningEntry };
        await writeJsonCache(cacheKey, payload, getSecondsUntilEndOfUtcDay());
        return payload;
    }
    static async getHistory(userId, days = 7) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const maxEntries = Math.max(100, days * 200);
        const entries = await TimeEntry.find({
            userId,
            startTime: { $gte: startDate, $lte: endDate },
            status: 'completed'
        })
            .select('category startTime endTime date durationSeconds description isIdle status source isRegularized regularizationStatus regularizationReason auditHistory')
            .sort({ startTime: -1 })
            .limit(maxEntries)
            .lean();
        // Group by date
        const historyMap = new Map();
        entries.forEach(entry => {
            const date = entry.date;
            if (!historyMap.has(date)) {
                historyMap.set(date, { date, entries: [], totals: {}, totalSeconds: 0 });
            }
            const dayData = historyMap.get(date);
            dayData.entries.push(entry);
            dayData.totals[entry.category] = (dayData.totals[entry.category] || 0) + entry.durationSeconds;
            dayData.totalSeconds += entry.durationSeconds;
        });
        return Array.from(historyMap.values());
    }
    static async updateEntry(entryId, userId, updates) {
        const entry = await TimeEntry.findOne({ _id: entryId, userId });
        if (!entry)
            throw new Error('Entry not found');
        // Add to history if critical fields change
        if (updates.startTime || updates.endTime) {
            entry.history = entry.history || [];
            entry.history.push({
                updatedAt: new Date(),
                reason: 'Manual edit',
                previousDuration: entry.durationSeconds,
                previousStartTime: entry.startTime,
                previousEndTime: entry.endTime
            });
        }
        if (updates.startTime)
            entry.startTime = updates.startTime;
        if (updates.endTime)
            entry.endTime = updates.endTime;
        if (updates.description !== undefined)
            entry.description = updates.description;
        if (updates.category) {
            await this.validateCategory(userId, updates.category);
            entry.category = updates.category;
        }
        // Recalculate duration if start/end changed
        if (entry.endTime) {
            entry.durationSeconds = Math.floor((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000);
        }
        await entry.save();
        await clearLiveDayCaches(userId);
        return entry;
    }
    static async regularizeEntry(entryId, input) {
        const entry = await TimeEntry.findOne({ _id: entryId, userId: input.userId });
        if (!entry)
            throw requestError('Entry not found', 404);
        if (entry.status === 'running') {
            throw requestError('Cannot regularize a running entry.', 400);
        }
        const nextStart = input.startTime ?? entry.startTime;
        const nextEnd = input.endTime ?? entry.endTime;
        if (!nextEnd) {
            throw requestError('Regularized entry must include an endTime.', 400);
        }
        if (nextStart >= nextEnd) {
            throw requestError('startTime must be before endTime.', 400);
        }
        if (input.category)
            await this.validateCategory(input.userId, input.category);
        await this.validateTimeOverlap(input.userId, nextStart, nextEnd, entryId);
        entry.auditHistory = entry.auditHistory || [];
        entry.auditHistory.push({
            oldStartTime: entry.startTime,
            oldEndTime: entry.endTime,
            oldCategory: entry.category,
            oldDescription: entry.description || '',
            changedAt: new Date(),
            reason: input.reason,
        });
        entry.startTime = nextStart;
        entry.endTime = nextEnd;
        entry.category = input.category ?? entry.category;
        if (input.description !== undefined)
            entry.description = input.description;
        entry.date = nextStart.toISOString().split('T')[0];
        entry.durationSeconds = Math.floor((nextEnd.getTime() - nextStart.getTime()) / 1000);
        entry.isRegularized = true;
        entry.regularizationReason = input.reason;
        entry.regularizationStatus = 'pending';
        await entry.save();
        await clearLiveDayCaches(input.userId);
        return entry;
    }
    static async reviewRegularization(entryId, input) {
        const entry = await TimeEntry.findById(entryId);
        if (!entry)
            throw requestError('Entry not found', 404);
        if (!entry.isRegularized) {
            throw requestError('Entry has no pending regularization.', 400);
        }
        entry.regularizationStatus = input.status;
        await entry.save();
        await clearLiveDayCaches(String(entry.userId));
        return entry;
    }
}
