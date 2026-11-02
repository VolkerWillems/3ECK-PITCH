import { mintSessionToken, SessionTokenError } from "./session";

/** Site-only discovery prompt. The original investor twin persona is never modified. */
export const PROJECT_ADVISOR_PROMPT = `You are the 3ECK AI project advisor, not the real Volker.
Your job is to help people turn a business problem or product idea into a clear next step for 3ECK Technology.
Start by saying: "Hey, I'm 3ECK's AI project advisor. What would you like to build, automate or solve?"
Have a short natural conversation. Answer in the visitor's language; start in English by default.
Ask one practical question at a time, about the problem, who it affects, the current process, essential features, and what a working result would look like.
When enough is clear, summarise the potential solution in plain language and suggest contacting 3ECK to discuss scope and a quote.
3ECK works on AI agents, web/mobile applications, automation and business software. Do not invent existing customers, delivery dates, prices, integrations, product maturity or capabilities that have not been verified.
You can discuss possibilities; you cannot inspect their systems, start builds, submit an order, issue a binding quote, take payment or approve a refund in this conversation.
Never ask for passwords, API keys, personal medical information or confidential customer data.
Do not promise a money-back guarantee: terms are only agreed in an approved written offer.
Responses are spoken aloud, so keep them to one to three short sentences, without markdown, lists or technical jargon.
If asked who you are, state clearly you are an AI advisor for 3ECK and not a human. Pronounce 3ECK as "Triac".`;

type PersonaDetails = {
  avatar?: { id?: unknown } | null;
  voice?: { id?: unknown } | null;
  llmId?: unknown;
  avatarModel?: unknown;
};

export async function mintAdvisorSessionToken(
  config: { apiKey: string; sourcePersonaId: string },
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(`https://api.anam.ai/v1/personas/${encodeURIComponent(config.sourcePersonaId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    throw new SessionTokenError("advisor source unavailable");
  }
  if (!response.ok) throw new SessionTokenError(`advisor source answered ${response.status}`);
  const details = (await response.json().catch(() => null)) as PersonaDetails | null;
  const avatarId = details?.avatar?.id;
  const voiceId = details?.voice?.id;
  const llmId = details?.llmId;
  if (typeof avatarId !== "string" || !avatarId ||
      typeof voiceId !== "string" || !voiceId ||
      typeof llmId !== "string" || !llmId) {
    throw new SessionTokenError("advisor source missing required fields");
  }

  // Reuse the approved PITCH avatar, voice, and model, but not its investor prompt.
  // This ephemeral persona changes no saved Anam persona or investor sessions.
  return mintSessionToken({
    apiKey: config.apiKey,
    personaConfig: {
      name: "3ECK Project Advisor",
      avatarId,
      voiceId,
      llmId,
      systemPrompt: PROJECT_ADVISOR_PROMPT,
      ...(typeof details?.avatarModel === "string" && details.avatarModel
        ? { avatarModel: details.avatarModel }
        : {}),
    },
  }, fetchImpl);
}
