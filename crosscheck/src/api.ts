// In dev, VITE_API_BASE is unset → calls go to /api/... → Vite proxy strips /api and forwards to localhost:5050
// In production, set VITE_API_BASE=https://your-railway-app.railway.app in Vercel env vars
export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
