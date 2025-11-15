Structure:
- frontend/  (Vite + React app)
- api/       (Vercel serverless function)

Run locally:
cd frontend
npm install
npm run dev

Deploy: push repo to GitHub, import to Vercel.
Set env vars on Vercel:
- GROQ_API_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN