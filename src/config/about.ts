/**
 * About-page content: origin story, skills, timeline, values, languages.
 * Real, specific copy. Persona facts inferred from context — confirm in HUMAN-TODO.
 */

/** Lead paragraphs for the about page. */
export const story: string[] = [
  'I got into automation the way most people do: by getting tired of doing the same thing twice. The first thing I ever automated was my own university timetable — the official portal was slow and ugly, so I built something that checked it for me. The moment a script did a chore I used to dread, I was hooked.',
  'That instinct never left. I moved to the Netherlands, studied software at Fontys, and kept pulling the same thread: find the manual, repetitive, error-prone part of a workflow and replace it with a system that runs itself. Schedules became dashboards. Dashboards became agents. Agents became an entire personal automation layer that now ships code while I sleep.',
  'Today I build full-stack products and the AI tooling underneath them — the kind of plumbing that turns "we should automate this" into something that actually runs in production. I care less about clever code and more about the outcome: fewer late nights, fewer dropped balls, a measurable number that got better.',
];

/** Short, quotable principles. */
export const principles: { title: string; body: string }[] = [
  {
    title: 'Outcomes over output',
    body: 'A feature nobody measures is a guess. Every project here has a number attached because that is the only honest way to know it worked.',
  },
  {
    title: 'Deterministic where it matters',
    body: 'AI is powerful and forgetful. I wrap it in guardrails — hooks, schemas, review gates — so the smart part can move fast without breaking things.',
  },
  {
    title: 'Local-first, privacy-first',
    body: 'If data does not need to leave the machine, it does not. Sensible defaults, EU-friendly, no surprise third parties.',
  },
  {
    title: 'Build the boring scaffolding',
    body: 'The unglamorous tooling — memory, recovery, observability — is what lets the interesting work actually ship and keep shipping.',
  },
];

export interface SkillGroup {
  label: string;
  /** 0–100 proficiency for the bar; honest, not everyone-is-100. */
  skills: { name: string; level: number }[];
}

export const skillGroups: SkillGroup[] = [
  {
    label: 'Languages & frameworks',
    skills: [
      { name: 'TypeScript / JavaScript', level: 95 },
      { name: 'Node.js', level: 92 },
      { name: 'Svelte / Astro', level: 88 },
      { name: 'React', level: 82 },
      { name: 'Rust', level: 68 },
    ],
  },
  {
    label: 'AI & automation',
    skills: [
      { name: 'LLM tooling & agents', level: 93 },
      { name: 'RAG & vector search', level: 85 },
      { name: 'Model Context Protocol', level: 88 },
      { name: 'n8n / workflow automation', level: 90 },
      { name: 'Prompt & eval engineering', level: 84 },
    ],
  },
  {
    label: 'Infrastructure & tooling',
    skills: [
      { name: 'SQLite / Postgres / Supabase', level: 87 },
      { name: 'Cloudflare / serverless edge', level: 83 },
      { name: 'Twilio / telephony APIs', level: 80 },
      { name: 'CI/CD & Git workflows', level: 90 },
      { name: 'Observability & monitoring', level: 82 },
    ],
  },
];

export interface TimelineEntry {
  when: string;
  title: string;
  body: string;
}

export const timeline: TimelineEntry[] = [
  {
    when: 'The spark',
    title: 'Automated my own timetable',
    body: 'Built a better front-end for the university schedule because the official one drove me up the wall. First taste of letting code do the chore.',
  },
  {
    when: 'Fontys',
    title: 'Studied software in the Netherlands',
    body: 'Formal grounding in software engineering — and a steady supply of real problems worth automating.',
  },
  {
    when: 'Going full-stack',
    title: 'Shipped products end to end',
    body: 'CallCatch, Cortex, and a string of client builds — owning the whole stack from telephony and data to UI.',
  },
  {
    when: 'Now',
    title: 'Automation architect',
    body: 'Building the AI tooling layer — agents, MCP servers, an overnight build system — and consulting for teams who want the same.',
  },
];

export const languages: { name: string; level: string }[] = [
  { name: 'Farsi', level: 'Native' },
  { name: 'Dutch', level: 'Advanced' },
  { name: 'English', level: 'Fluent' },
];
