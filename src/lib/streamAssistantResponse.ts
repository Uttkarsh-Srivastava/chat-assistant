// Do not modify
export async function* streamAssistantResponse(
  userMessage: string
): AsyncGenerator<string> {
  const tokens =
    `Analyzing your query about "${userMessage.slice(0, 30)}..." , here is my analysis: [streamed token by token every 30ms] `.split(' ')
    ;
  for (const token of tokens) {
    await new Promise((r) => setTimeout(r, 30));
    yield token + ' ';
  }
}
