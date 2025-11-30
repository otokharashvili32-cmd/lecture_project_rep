# Project Architecture

This document describes the technical architecture and solutions from a big picture perspective.

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Data Storage**: Hardcoded in-memory data (no database initially)
- **Port**: 5000

### Frontend
- **Framework**: React
- **Build Tool**: Vite
- **Port**: 5173 (default Vite port)
- **Styling**: Custom CSS with dark, cryptic theme
- **Typography**: Oswald (Google Fonts) - tall, condensed font
- **State Management**: React useState hooks

## Project Structure

```
lecture_project/
├── backend/
│   ├── index.js          # Main server file
│   ├── package.json
│   └── .env              # Environment variables
├── frontend/
│   ├── src/              # React source files
│   ├── package.json
│   └── vite.config.js
└── doc/                  # Documentation folder
    ├── FEATURES.md       # Feature list
    ├── ARCHITECTURE.md   # This file
    └── [DATE]_UPDATE.md  # Daily update logs
```

## Communication
- Backend API runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173`
- CORS is enabled to allow frontend-backend communication

## Data Management
- Currently: All data is hardcoded in the frontend (concert dates generated randomly, static content)
- Backend: Basic API structure ready but not actively used yet
- Future: Will migrate to a database when needed

## Design Philosophy
- Dark, cryptic, moody aesthetic
- Tall, condensed typography throughout
- Glassmorphism effects with backdrop blur
- Subtle glowing effects and animations
- Minimal color palette: black (#0a0a0a) and dark teal (#3F829D)
- Atmospheric, mysterious feel

## Current Features Architecture
- **Navigation**: Section-based routing using React state
- **Content Sections**: Modular components for shows, discography, merch, about
- **Responsive Design**: Flexbox and Grid layouts
- **Image Handling**: Static assets in public folder

