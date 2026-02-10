import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { SYSTEM_PROMPT } from "./prompts";
import { getCognitoIdentityPoolCredentials } from "./cognitoCreds";

function getNumberEnv(name: string, fallback: number) {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function callBedrock(params: { inputJson: unknown }) {
  const region = process.env.AWS_REGION || process.env.COGNITO_REGION || "us-east-1";
  const modelId = process.env.BEDROCK_MODEL_ID!;
  const maxTokens = getNumberEnv("BEDROCK_MAX_TOKENS", 800);
  const temperature = getNumberEnv("BEDROCK_TEMPERATURE", 0.1);

  const credentials = await getCognitoIdentityPoolCredentials();

  const userPrompt =
    `Review the following agentic test definition and recommend a better DEFINING OBJECTIVE.\n\n` +
    `INPUT_JSON:\n${JSON.stringify(params.inputJson, null, 2)}`;

  const bedrock = new BedrockRuntimeClient({ region, credentials });

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: [{ type: "text", text: userPrompt }] }],
    max_tokens: maxTokens,
    temperature
  };

  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: new TextEncoder().encode(JSON.stringify(body))
    })
  );

  const raw = new TextDecoder().decode(res.body);
  const parsed = JSON.parse(raw);
  const text = parsed?.content?.[0]?.text;

  if (typeof text !== "string") {
    throw new Error("Unexpected Bedrock response format: missing content[0].text");
  }

  return JSON.parse(text);
}
