import express from 'express';
import TimeEntry from '../models/TimeEntry.js';
const router = express.Router();
// POST /api/track/start - Start tracking a category
router.post('/start', async (req, res) => {
    try {
        const { category, userId, description } = req.body;
        if (!category || !userId) {
            return res.status(400).json({ error: 'Category and userId are required' });
        }
        const validCategories = ['Python', 'SQL', 'Midas', 'Datasetu', 'Break', 'TT'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        // Stop any running entry for this user
        const runningEntry = await TimeEntry.findOne({ userId, endTime: null });
        if (runningEntry) {
            const duration = Math.floor((now.getTime() - runningEntry.startTime.getTime()) / 1000);
            runningEntry.endTime = now;
            runningEntry.durationSeconds = duration;
            await runningEntry.save();
        }
        // Start new entry
        const newEntry = await TimeEntry.create({
            category,
            startTime: now,
            endTime: null,
            date: today,
            durationSeconds: 0,
            userId,
            description: description || '',
        });
        res.json({ success: true, entry: newEntry });
    }
    catch (error) {
        console.error('Start tracking error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/track/stop - Stop current tracking
router.post('/stop', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const runningEntry = await TimeEntry.findOne({ userId, endTime: null });
        if (!runningEntry) {
            return res.status(404).json({ error: 'No running entry found' });
        }
        const now = new Date();
        const duration = Math.floor((now.getTime() - runningEntry.startTime.getTime()) / 1000);
        runningEntry.endTime = now;
        runningEntry.durationSeconds = duration;
        await runningEntry.save();
        res.json({ success: true, entry: runningEntry });
    }
    catch (error) {
        console.error('Stop tracking error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/track/today - Get today's totals and current running entry
router.get('/today', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const today = new Date().toISOString().split('T')[0];
        // Get all today's entries for this user
        const entries = await TimeEntry.find({ userId, date: today });
        // Find running entry for this user
        const runningEntry = await TimeEntry.findOne({ userId, endTime: null });
        // Calculate totals per category
        const totals = {
            Python: 0,
            SQL: 0,
            Midas: 0,
            Datasetu: 0,
            Break: 0,
            TT: 0,
        };
        const now = new Date();
        entries.forEach((entry) => {
            let duration = entry.durationSeconds;
            // If entry is still running, calculate current duration
            if (!entry.endTime && runningEntry && entry._id.equals(runningEntry._id)) {
                duration = Math.floor((now.getTime() - entry.startTime.getTime()) / 1000);
            }
            totals[entry.category] += duration;
        });
        res.json({
            success: true,
            totals,
            runningEntry: runningEntry ? {
                _id: runningEntry._id,
                category: runningEntry.category,
                startTime: runningEntry.startTime,
            } : null,
        });
    }
    catch (error) {
        console.error('Get today error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/track/history - Get historical entries grouped by date
router.get('/history', async (req, res) => {
    try {
        const { userId, days = 30 } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));
        const startDateString = startDate.toISOString().split('T')[0];
        const endDateString = endDate.toISOString().split('T')[0];
        // Get all entries for this user within date range
        const entries = await TimeEntry.find({
            userId,
            date: { $gte: startDateString, $lte: endDateString },
            endTime: { $ne: null } // Only completed entries
        }).sort({ date: -1, startTime: -1 });
        // Group by date
        const groupedByDate = {};
        entries.forEach((entry) => {
            if (!groupedByDate[entry.date]) {
                groupedByDate[entry.date] = [];
            }
            groupedByDate[entry.date].push({
                _id: entry._id,
                category: entry.category,
                startTime: entry.startTime,
                endTime: entry.endTime,
                durationSeconds: entry.durationSeconds,
                description: entry.description || '',
            });
        });
        // Calculate daily totals
        const dailyData = Object.keys(groupedByDate).map((date) => {
            const dayEntries = groupedByDate[date];
            const totals = {
                Python: 0,
                SQL: 0,
                Datasetu: 0,
                Break: 0,
                TT: 0,
            };
            dayEntries.forEach((entry) => {
                totals[entry.category] += entry.durationSeconds;
            });
            const totalSeconds = Object.values(totals).reduce((a, b) => a + b, 0);
            return {
                date,
                entries: dayEntries,
                totals,
                totalSeconds,
            };
        });
        res.json({
            success: true,
            history: dailyData,
        });
    }
    catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
