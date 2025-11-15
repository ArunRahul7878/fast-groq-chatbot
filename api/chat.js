// api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  try {
    const { message, provider = "demo", model = "", image_b64 = null } = req.body || {};
    if (!message && !image_b64) {
      res.status(400).json({ error: "message or image_b64 is required" });
      return;
    }

    // Helper to call fetch with timeout
    const fetchWithTimeout = async (url, opts = {}, ms = 20000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);
      try {
        const r = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(id);
        return r;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    // ROUTE: demo (no provider)
    if (provider === "demo") {
      const reply = (message || "").split("").reverse().join("");
      res.status(200).json({ reply, source: "demo-backend" });
      return;
    }

    // For each provider, we expect two env vars:
    // <PROVIDER>_API_KEY and <PROVIDER>_API_URL
    // Examples: OPENAI_API_KEY, OPENAI_API_URL
    const prov = provider.toLowerCase();

    const ENV_KEY = {
      openai: "OPENAI_API_KEY",
      gemini: "GEMINI_API_KEY",
      deepseek: "DEEPSEEK_API_KEY",
      groq: "GROQ_API_KEY"
    }[prov];

    const ENV_URL = {
      openai: "OPENAI_API_URL",
      gemini: "GEMINI_API_URL",
      deepseek: "DEEPSEEK_API_URL",
      groq: "GROQ_API_URL"
    }[prov];

    const key = process.env[ENV_KEY];
    const apiUrl = process.env[ENV_URL];

    if (!key || !apiUrl) {
      // fallback to demo
      const reply = (message || "").split("").reverse().join("");
      res.status(200).json({ reply, source: "demo-backend-missing-env", missing: { ENV_KEY, ENV_URL } });
      return;
    }

    // Build provider-specific payloads.
    let fetchResp, bodyToSend;

    if (prov === "openai") {
      // *** EDIT HERE if your OpenAI endpoint requires a specific body ***
      // Example (OpenAI-compatible chat completions):
      bodyToSend = {
        model: model || "gpt-4o-mini", // change default to your cost-optimized choice
        messages: [{ role: "user", content: message }]
      };
      // If you have an image, many providers want base64 as part of input; modify as provider needs
      if (image_b64) bodyToSend.messages.push({ role: "user", content: `[image_base64:${image_b64}]` });

      fetchResp = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify(bodyToSend)
      });
      if (!fetchResp.ok) {
        const txt = await fetchResp.text();
        return res.status(502).json({ error: "openai_provider_error", details: txt });
      }
      const json = await fetchResp.json();
      // Try common response shapes:
      const reply = json?.choices?.[0]?.message?.content ?? json?.output?.[0]?.content ?? json?.text ?? JSON.stringify(json).slice(0,1000);
      return res.status(200).json({ reply, source: "openai", raw: json });
    }

    if (prov === "gemini") {
      // *** EDIT: set model default to a cost-optimized Gemini model if you know it ***
      bodyToSend = {
        model: model || "gemini-medium", // change to the model you prefer
        input: message
      };
      if (image_b64) bodyToSend.image = image_b64;

      fetchResp = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify(bodyToSend)
      });
      if (!fetchResp.ok) {
        const txt = await fetchResp.text();
        return res.status(502).json({ error: "gemini_provider_error", details: txt });
      }
      const json = await fetchResp.json();
      const reply = json?.output ?? json?.reply ?? JSON.stringify(json).slice(0,1000);
      return res.status(200).json({ reply, source: "gemini", raw: json });
    }

    if (prov === "deepseek") {
      // *** EDIT: DeepSeek / other providers may require different structures ***
      bodyToSend = {
        model: model || "deepseek-default",
        input: message
      };
      if (image_b64) bodyToSend.image = image_b64;

      fetchResp = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify(bodyToSend)
      });
      if (!fetchResp.ok) {
        const txt = await fetchResp.text();
        return res.status(502).json({ error: "deepseek_provider_error", details: txt });
      }
      const json = await fetchResp.json();
      const reply = json?.result ?? json?.output ?? JSON.stringify(json).slice(0,1000);
      return res.status(200).json({ reply, source: "deepseek", raw: json });
    }

    if (prov === "groq") {
      // *** EDIT: Use the exact Groq request shape. Replace model default below ***
      bodyToSend = {
        model: model || "groq-model-default",
        input: message
      };
      if (image_b64) bodyToSend.image = image_b64;

      fetchResp = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify(bodyToSend)
      });
      if (!fetchResp.ok) {
        const txt = await fetchResp.text();
        return res.status(502).json({ error: "groq_provider_error", details: txt });
      }
      const json = await fetchResp.json();
      const reply = json?.reply ?? json?.result ?? JSON.stringify(json).slice(0,1000);
      return res.status(200).json({ reply, source: "groq", raw: json });
    }

    // fallback safe reply:
    res.status(500).json({ error: "unknown_provider" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error", details: String(err) });
  }
}
