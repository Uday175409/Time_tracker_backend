import express, { Request, Response } from 'express';
import User from '../models/User.js';

const router = express.Router();

// Register/Login (simple auth - just check if user exists, create if not)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, message: 'Name and password required' });
    }

    // Find user by name (case insensitive)
    let user = await User.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

    if (user) {
      // Simple password check (in production, use bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
    } else {
      // Create new user with original case
      user = await User.create({ name, password });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
