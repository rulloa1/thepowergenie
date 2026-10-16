import http from 'node:http';

/**
 * Sends a chat request to Ollama Cloud API.
 * Uses model gemma4:31b and Authorization: Bearer header.
 */
export async function callOllamaChat(prompt = "Why is the sky blue?") {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    const err = new Error("OLLAMA_API_KEY environment variable is not set or empty.");
    err.status = 401;
    throw err;
  }

  const response = await fetch("https://ollama.com/api/chat", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gemma4:31b",
      messages: [
        { role: "user", content: prompt }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Ollama API returned status ${response.status}: ${errorText}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data.message?.content || data;
}

// Server route and CLI test entry point
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server.js');

if (isMain) {
  if (process.argv.includes('--test')) {
    callOllamaChat("What is the capital of France?")
      .then((reply) => {
        console.log("=== OLLAMA_RESPONSE_START ===");
        console.log(reply);
        console.log("=== OLLAMA_RESPONSE_END ===");
      })
      .catch((err) => {
        console.error(`Ollama Test Error (${err.status || 'UNKNOWN'}):`, err.message);
        process.exit(1);
      });
  } else {
    const PORT = process.env.PORT || 3001;
    const server = http.createServer(async (req, res) => {
      // CORS headers for client-side frontend calls
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/api/chat') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const prompt = parsed.prompt || "Hello!";
            const reply = await callOllamaChat(prompt);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ reply }));
          } catch (err) {
            res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(PORT, () => {
      console.log(`Ollama backend server route listening on http://localhost:${PORT}`);
    });
  }
}
