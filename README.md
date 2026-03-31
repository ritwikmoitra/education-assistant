# 📚 Education Assistant

> Deep-research learning companion that builds structured study guides for any technical topic.

[![Claude Skill](https://img.shields.io/badge/Claude-Skill-violet)](https://github.com/ritwikmoitra/education-assistant)

## The problem

Self-directed learners waste hours piecing together fragmented tutorials, blog posts, and courses — without knowing the right sequence or which resources are actually worth their time. For DS, ML, and GenAI topics especially, there is no single structured path from 'what is this?' to 'I understand this deeply'. This tool eliminates that friction by producing a ready-to-use 6-part study summary plus a curated, relevance-scored resource list in one shot.

## How it works

The user provides a topic or list of topics; the assistant extracts atomic concepts, assesses the user's comfort level, then calls Claude Opus to synthesise a 6-section structured summary (definition, learning agenda, prerequisites, analogy, applications, pitfalls) and curates a Top 5 free resource list with relevance scores. Results are calibrated to Beginner, Intermediate, or Advanced level, and a session registry prevents duplicate resources across runs.

## System diagram

```
Input Topics → Topic Extraction & Confirmation → Comfort Level Assessment
      → Web Search (source material) → Opus API (structured summary)
      → Resource Search & Scoring → Output + Registry Update
```

## Tech stack

![Claude Opus API](https://img.shields.io/badge/Claude_Opus_API-violet)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![Gradio](https://img.shields.io/badge/Gradio-orange)
![Web Search](https://img.shields.io/badge/Web_Search-blue)
![Google Docs API](https://img.shields.io/badge/Google_Docs_API-green)

## Try it

Run locally with your own Anthropic API key:

```bash
git clone https://github.com/ritwikmoitra/education-assistant
cd education-assistant
pip install -r app/requirements.txt
ANTHROPIC_API_KEY=sk-ant-... python app/app.py
```

## Project structure

```
education-assistant/
├── app/
│   ├── app.py              # Gradio UI + Claude API integration
│   └── requirements.txt    # Python dependencies
├── .claude/
│   └── skill-config.md     # Original Claude Desktop skill definition
├── CLAUDE.md               # Instructions for AI agents
└── README.md
```

---
Built with [Claude AI Portfolio Builder](https://github.com/ritwikmoitra/portfolio) · Part of my [AI Engineering Portfolio](https://ritwikmoitra.github.io/portfolio)
