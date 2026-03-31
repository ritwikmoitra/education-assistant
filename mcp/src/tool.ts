import Anthropic from "@anthropic-ai/sdk";

export const TOOL_NAME        = "education_assistant";
export const TOOL_DESCRIPTION = "Research any DS, ML, GenAI or Statistics topic. Returns a structured 6-section study guide (definition, learning agenda, prerequisites, analogy, applications, pitfalls) plus a curated Top 5 free resource list, calibrated to the learner\'s comfort level.";

export const TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    topics: {
      type: "string",
      description: "One or more technical topics, comma-separated (e.g. \'Bayesian Structural Time Series, t-SNE\')"
    },
    comfort_level: {
      type: "string",
      enum: ["Beginner", "Intermediate", "Advanced"],
      description: "Current expertise level for these topics"
    }
  },
  required: ["topics", "comfort_level"]
};

const SYSTEM_PROMPT = `You are an expert educator specialising in Data Science, Machine Learning, Generative AI, and Statistics.

For EACH topic the user provides, produce a structured research summary calibrated to the stated comfort level (Beginner/Intermediate/Advanced) with exactly these 6 sections:

1. **Definition** — Clear, precise definition (2-4 sentences)
2. **Learning Agenda** — 5-8 sequenced sub-concepts forming a mini-syllabus (numbered list)
3. **Prerequisites** — Specific background knowledge needed (be precise: not just "statistics" but "hypothesis testing, probability distributions")
4. **Real-Life Analogy** — A vivid everyday analogy that maps to the core mechanism (4-6 sentences)
5. **Application Examples** — 3-5 concrete real-world examples naming company/product/paper
6. **Common Pitfalls** — 2-3 specific mistakes learners at this level commonly make

After each topic summary, add a "Top 5 Resources" table:
| # | Title | Type | Source | Relevance | Access |
Only include free resources. Relevance 5=directly teaches this exact topic at the right level.

Calibrate everything to the comfort level: Beginner=simpler analogies + visual resources; Intermediate=balance theory/practice; Advanced=papers + implementation.`;

export async function runTool(input: Record<string, string>, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Research the following for a ${input.comfort_level}-level learner:\n\n${input.topics}\n\nProvide the full 6-section summary and Top 5 Resources for each topic.`
    }]
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "No text response";
}