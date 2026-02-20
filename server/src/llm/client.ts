export function getApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env in the project root.");
  }
  return apiKey;
}

export function getModel(): string {
  return process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
}

export async function callClaude(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  const model = getModel();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = JSON.parse(body);
  const text = json.content?.[0]?.type === "text" ? json.content[0].text : "";
  if (!text) {
    throw new Error(`Empty response from Claude: ${body.slice(0, 200)}`);
  }
  return text;
}
