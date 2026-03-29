import TimeEntry from '../models/TimeEntry.js';
export class TimeService {
    static async startEntry(userId, category, description) {
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
        });
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
        return entry;
    }
    static async getTodayData(userId) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const [entries, fallbackRunningEntry] = await Promise.all([
            TimeEntry.find({
                userId,
                date: dateStr,
            })
                .select('category startTime endTime date durationSeconds description isIdle status')
                .sort({ startTime: -1 })
                .lean(),
            TimeEntry.findOne({
                userId,
                status: 'running',
            })
                .sort({ startTime: -1 })
                .select('category startTime endTime date durationSeconds description isIdle status')
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
        return { entries, totals, runningEntry };
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
            .select('category startTime endTime date durationSeconds description isIdle status')
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
        if (updates.category)
            entry.category = updates.category;
        // Recalculate duration if start/end changed
        if (entry.endTime) {
            entry.durationSeconds = Math.floor((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000);
        }
        await entry.save();
        return entry;
    }
}
