# Time Tracker - Backend

A RESTful API backend for the Time Tracker application built with Express.js, TypeScript, and MongoDB.

## 🚀 Live Deployment

**Backend URL:** [https://time-tracker-backend-xi.vercel.app/](https://time-tracker-backend-xi.vercel.app/)

## 📋 Overview

This backend service provides APIs for time tracking and user authentication. It handles all data persistence using MongoDB and serves as the data layer for the Time Tracker application.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose ODM
- **CORS:** Enabled for cross-origin requests
- **Environment Variables:** dotenv

## 📁 Project Structure

```
backend/
├── src/
│   ├── server.ts           # Main application entry point
│   ├── config/
│   │   └── mongodb.ts      # MongoDB connection configuration
│   ├── models/
│   │   ├── TimeEntry.ts    # Time entry data model
│   │   └── User.ts         # User data model
│   └── routes/
│       ├── auth.ts         # Authentication routes
│       └── track.ts        # Time tracking routes
├── lib/
│   └── mongodb.ts          # MongoDB utility functions
├── models/
│   └── TimeEntry.ts        # Legacy model (migration)
├── .env                    # Environment variables (not in git)
├── .env.example            # Example environment variables
├── package.json            # Project dependencies
└── tsconfig.json           # TypeScript configuration
```

## 🔧 Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/timetracker

# Server Configuration
PORT=5000

# CORS Configuration
FRONTEND_URL=https://time-tracker-frontend-five.vercel.app
```

See `.env.example` for a complete list of required environment variables.

## 📦 Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example` and configure your environment variables.

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
This will start the server with hot-reload enabled using tsx.

### Production Build
```bash
npm run build
npm start
```

## 🔌 API Endpoints

### Authentication Routes (`/api/auth`)
- User registration
- User login
- User authentication

### Time Tracking Routes (`/api/track`)
- Create time entries
- Retrieve time entries
- Update time entries
- Delete time entries

## 🗄️ Database Models

### User Model
- User authentication and profile information

### TimeEntry Model
- Time tracking data
- Task descriptions
- Duration tracking
- User associations

## 🌐 Deployment

This backend is deployed on Vercel. The live API is available at:
**https://time-tracker-backend-xi.vercel.app/**

## 📝 Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

## 🔒 Security

- CORS configured to allow requests only from authorized frontend URLs
- Environment variables for sensitive configuration
- MongoDB connection string security

## 📄 License

This project is part of the EOD Maker time tracking application.

## 🤝 Related Projects

- **Frontend:** [https://time-tracker-frontend-five.vercel.app/](https://time-tracker-frontend-five.vercel.app/)
