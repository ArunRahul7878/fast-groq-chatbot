export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  try {
    const body = req.body || {};
    const message = body.message || "";

    if (!message) {
      res.status(400).json({ error: "message is required in JSON body" });
      return;
    }

    // If you haven't set GROQ_API_KEY in Vercel env vars, return a deterministic demo reply.
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      // simple demo reply (reverse text)
      const reply = message.split("").reverse().join("");
      res.status(200).json({ reply, source: "demo-backend" });
      return;
    }

    // ===== PLACEHOLDER for real GROQ call =====
    // Replace the following block with the actual GROQ API call using fetch,
    // using `apiKey` as authentication. Keep the same response shape: { reply: "..."}
    //
    // Example placeholder response while you implement GROQ:
    res.status(200).json({ reply: "(GROQ API not implemented yet) " + message, source: "groq-placeholder" });
    // ==========================================

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  }
}
