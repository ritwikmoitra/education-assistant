import Anthropic from "@anthropic-ai/sdk";

export const TOOL_NAME        = "education_assistant";
export const TOOL_DESCRIPTION = "Research any DS, ML, GenAI or Statistics topic and receive a structured 6-section study guide plus a curated Top 5 free resource list.";

export const TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    topics: {
      type: "string",
      description: "One or more technical topics to research, comma-separated (e.g. 'Bayesian Structural Time Series, t-SNE')"
    },
    comfort_level: {
      type: "string",
      enum: ["Beginner", "Intermediate", "Advanced"],
      description: "Your current expertise level for these topics"
    }
  },
  required: ["topics", "comfort_level"]
};

const SYSTEM_PROMPT = `You are an expert educator and researcher specialising in Data Science, Machine Learning, Generative AI, and Statistics.

The user will provide one or more technical topics and their comfort level (Beginner, Intermediate, or Advanced).

For EACH topic, produce a structured research summary with exactly these 6 sections, calibrated to the stated comfort level:

1. **Definition** — Clear, precise definition (2-4 sentences)
2. **Learning Agenda** — 5-8 sequenced sub-concepts forming a mini-syllabus (numbered list)
3. **Prerequisites** — Specific background knowledge needed (bulleted list — be precise, e.g. not just "statistics" but "hypothesis testing, probability distributions")
4. **Real-Life Analogy** — A vivid everyday analogy that maps cleanly to the technical concept (4-6 sentences, covers the core mechanism not just the surface)
5. **Application Examples** — 3-5 concrete real-world examples naming the company, product, or paper
6. **Common Pitfalls** — 2-3 specific mistakes learners at this level commonly make

After the summary for each topic, provide a "Top 5 Resources" table:
| # | Title | Type | Source | Relevance | Access |
Only include resources that are free and genuinely teach the topic. Relevance: 5=directly teaches this exact topic at the right level, 3=related but not focused.

Calibrate depth and vocabulary to the stated comfort level:
- Beginner: simpler analogies, more prerequisite detail, prefer visual/video resources
- Intermediate: balance theory and practice, include technical blogs and docs
- Advanced: concise, focus on edge cases and papers, include implementation guides

Be concrete throughout — never vague. Name real companies, papers, and tools.`;

export async function runTool(
  input: Record<string, string>,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const userMessage = `Please research the following topic(s) for a ${input.comfort_level}-level learner:\n\n${input.topics}\n\nProvide the full 6-section structured research summary for each topic, followed by the Top 5 Resources table.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "No text response";
}