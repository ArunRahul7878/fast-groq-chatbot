// api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  try {
    const { message, provider = "groq", model = "", image_b64 = null } = req.body || {};
    if (!message && !image_b64) {
      res.status(400).json({ error: "message or image_b64 required" });
      return;
    }

    // Only support Groq for now (provider fixed to 'groq')
    if (provider !== "groq") {
      res.status(400).json({ error: "only provider 'groq' supported in this deployment" });
      return;
    }

    const key = process.env.GROQ_API_KEY;
    const apiUrl = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";

    if (!key) {
      // safe demo fallback (reverse text)
      const reply = (message || "").split("").reverse().join("");
      res.status(200).json({ reply, source: "demo-backend-missing-key" });
      return;
    }

    // Build messages array: include a light system prompt for helpful assistant
    const messages = [
      { role: "system", content: "You are a helpful, concise assistant." },
      { role: "user", content: message }
    ];

    // If image is present, append as a user message with a marker (Groq may require different field)
    if (image_b64) {
      // Many Groq models accept vision via the usual chat pipeline, but if your account expects
      // a different payload (files/multipart), we'll adapt later. For now include inline tag.
      messages.push({ role: "user", content: `[image_base64:${image_b64}]` });
    }

    const body = {
      model: model || "llama-3.1-8b-instant", // default
      messages,
      max_tokens: 1024,
      temperature: 0.3,
      stream: false
    };

    // call Groq chat completions (OpenAI-compatible path)
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Groq error", resp.status, txt);
      return res.status(502).json({ error: "groq_provider_error", status: resp.status, details: txt });
    }

    const json = await resp.json();

    // Groq uses OpenAI-compatible shape: choices[0].message.content
    const reply = json?.choices?.[0]?.message?.content ?? json?.output?.[0]?.content ?? json?.text ?? JSON.stringify(json).slice(0,1000);

    return res.status(200).json({ reply, source: "groq", raw: json });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error", details: String(err) });
  }
}
