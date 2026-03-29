import TimeEntry from '../models/TimeEntry.js';
import { CategoryService } from './category.service.js';
async function getCompletedEntries(userId, startDate, endDate) {
    const timeFilter = endDate
        ? { $gte: startDate, $lte: endDate }
        : { $gte: startDate };
    return TimeEntry.find({
        userId,
        startTime: timeFilter,
        status: 'completed'
    })
        .select('category durationSeconds date startTime -_id')
        .sort({ startTime: 1 })
        .lean();
}
export class AnalyticsService {
    static async getProductivityStats(userId, range) {
        const now = new Date();
        const startDate = new Date();
        if (range === 'day')
            startDate.setHours(0, 0, 0, 0);
        else if (range === 'week')
            startDate.setDate(now.getDate() - 7);
        else
            startDate.setDate(now.getDate() - 30);
        const [entries, productiveNames] = await Promise.all([
            getCompletedEntries(userId, startDate),
            CategoryService.getProductiveNames(userId),
        ]);
        // Use user's own productive categories instead of a hardcoded list.
        const productiveCategories = new Set(productiveNames);
        let productiveSeconds = 0;
        let totalSeconds = 0;
        let streak = 0;
        let maxStreak = 0;
        entries.forEach(entry => {
            totalSeconds += entry.durationSeconds;
            if (productiveCategories.has(entry.category)) {
                productiveSeconds += entry.durationSeconds;
                streak++;
            }
            else {
                streak = 0;
            }
            if (streak > maxStreak)
                maxStreak = streak;
        });
        const score = totalSeconds > 0 ? Math.round((productiveSeconds / totalSeconds) * 100) : 0;
        return {
            totalHours: (totalSeconds / 3600).toFixed(2),
            productiveHours: (productiveSeconds / 3600).toFixed(2),
            productivityScore: score,
            maxFocusStreak: maxStreak, // in number of sessions
        };
    }
    // ─── Daily trend data (for line charts) ─────────────────
    static async getDailyTrend(userId, days = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        const [entries, productiveNames] = await Promise.all([
            getCompletedEntries(userId, startDate, endDate),
            CategoryService.getProductiveNames(userId),
        ]);
        const productiveCategories = new Set(productiveNames);
        // Build a map: date → { totalSeconds, productiveSeconds, sessions }
        const dateMap = {};
        // Pre-fill every date so we get zero days too
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().split('T')[0];
            dateMap[key] = { totalSeconds: 0, productiveSeconds: 0, sessions: 0, totalSessionDuration: 0 };
        }
        entries.forEach((e) => {
            const key = e.date;
            if (!dateMap[key]) {
                dateMap[key] = { totalSeconds: 0, productiveSeconds: 0, sessions: 0, totalSessionDuration: 0 };
            }
            dateMap[key].totalSeconds += e.durationSeconds;
            dateMap[key].sessions += 1;
            dateMap[key].totalSessionDuration += e.durationSeconds;
            if (productiveCategories.has(e.category)) {
                dateMap[key].productiveSeconds += e.durationSeconds;
            }
        });
        return Object.entries(dateMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, d]) => ({
            date,
            totalHours: +(d.totalSeconds / 3600).toFixed(2),
            productiveHours: +(d.productiveSeconds / 3600).toFixed(2),
            sessions: d.sessions,
            avgSessionMinutes: d.sessions > 0 ? +(d.totalSessionDuration / d.sessions / 60).toFixed(1) : 0,
        }));
    }
    // ─── Weekly category comparison ─────────────────────────
    static async getWeeklyCategoryComparison(userId, weeks = 4) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - weeks * 7);
        startDate.setHours(0, 0, 0, 0);
        const entries = await getCompletedEntries(userId, startDate, endDate);
        // Group by ISO week → category → seconds
        const weekMap = {};
        entries.forEach((e) => {
            const d = new Date(e.startTime);
            // Get ISO week label: "Feb 3" style (Monday of that week)
            const day = d.getDay() || 7; // Sun=7
            const monday = new Date(d);
            monday.setDate(d.getDate() - day + 1);
            const weekLabel = `${monday.toLocaleString('en', { month: 'short' })} ${monday.getDate()}`;
            if (!weekMap[weekLabel])
                weekMap[weekLabel] = {};
            weekMap[weekLabel][e.category] = (weekMap[weekLabel][e.category] || 0) + e.durationSeconds;
        });
        // Flatten: array of { week, category, hours }
        const result = [];
        for (const [week, cats] of Object.entries(weekMap)) {
            for (const [category, seconds] of Object.entries(cats)) {
                result.push({ week, category, hours: +(seconds / 3600).toFixed(2) });
            }
        }
        return result;
    }
    // ─── Heatmap data (GitHub-style) ────────────────────────
    static async getHeatmapData(userId, days = 365) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        const entries = await getCompletedEntries(userId, startDate, endDate);
        // Build map: YYYY-MM-DD → total hours
        const dateMap = {};
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dateMap[d.toISOString().split('T')[0]] = 0;
        }
        entries.forEach((e) => {
            if (dateMap[e.date] !== undefined) {
                dateMap[e.date] += e.durationSeconds / 3600;
            }
        });
        return Object.entries(dateMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, hours]) => ({
            date,
            hours: +hours.toFixed(2),
        }));
    }
    // ─── Insights (most productive day, avg session, etc.) ──
    static async getInsights(userId) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        const [entries, productiveNames] = await Promise.all([
            getCompletedEntries(userId, startDate),
            CategoryService.getProductiveNames(userId),
        ]);
        const productiveCategories = new Set(productiveNames);
        // Group by day-of-week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayTotals = new Array(7).fill(0);
        const dayCounts = new Array(7).fill(0);
        let totalDuration = 0;
        let sessionCount = entries.length;
        const categoryTotals = {};
        entries.forEach((e) => {
            const dow = new Date(e.startTime).getDay();
            dayTotals[dow] += e.durationSeconds;
            dayCounts[dow] += 1;
            totalDuration += e.durationSeconds;
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.durationSeconds;
        });
        // Most productive day of the week (highest avg hours)
        let bestDayIdx = 0;
        let bestDayAvg = 0;
        dayTotals.forEach((total, i) => {
            const avg = total;
            if (avg > bestDayAvg) {
                bestDayAvg = avg;
                bestDayIdx = i;
            }
        });
        // Top category
        const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0];
        // Average session length
        const avgSessionMinutes = sessionCount > 0 ? +(totalDuration / sessionCount / 60).toFixed(1) : 0;
        // Productive percentage
        let productiveSeconds = 0;
        entries.forEach((e) => {
            if (productiveCategories.has(e.category))
                productiveSeconds += e.durationSeconds;
        });
        // Daily average
        const uniqueDays = new Set(entries.map((e) => e.date)).size || 1;
        const dailyAvgHours = +(totalDuration / uniqueDays / 3600).toFixed(2);
        return {
            mostProductiveDay: dayNames[bestDayIdx],
            mostProductiveDayHours: +(bestDayAvg / 3600).toFixed(2),
            avgSessionMinutes,
            topCategory: topCategory ? { name: topCategory[0], hours: +(topCategory[1] / 3600).toFixed(2) } : null,
            totalSessions: sessionCount,
            dailyAvgHours,
            productivityRate: totalDuration > 0 ? Math.round((productiveSeconds / totalDuration) * 100) : 0,
            daysTracked: uniqueDays,
        };
    }
}
