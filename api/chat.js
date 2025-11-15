// Simple Vercel serverless function (Node 18+)
// Required env vars:
//   GROQ_API_KEY
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const GROQ_API_KEY = process.env.GROQ_API_KEY

async function incrCounter(key, ttlSeconds) {
  // increment and set TTL on first increment (Upstash REST endpoints)
  const r1 = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' }
  })
  const json = await r1.json()
  if (json.result === 1) {
    await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${ttlSeconds}`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
    })
  }
  return json.result
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'
  const key = `rate:${ip}`
  try {
    const count = await incrCounter(key, 3600) // 1 hour
    const LIMIT = 10
    if (count > LIMIT) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' })
    }

    const { prompt } = req.body || {}
    if (!prompt || String(prompt).trim().length === 0) return res.status(400).json({ error: 'Empty prompt' })

    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'groq-1',
        messages: [{ role: 'user', content: prompt }],
        max_output_tokens: 256
      })
    })

    if (!groqResp.ok) {
      const txt = await groqResp.text()
      console.error('Groq error', groqResp.status, txt)
      return res.status(502).json({ error: 'LLM provider error' })
    }
    const groqJson = await groqResp.json()
    const content = groqJson.choices?.[0]?.message?.content || groqJson.choices?.[0]?.text || JSON.stringify(groqJson)

    return res.status(200).json({ text: String(content) })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}