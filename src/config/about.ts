/**
 * About-page content: studio origin story, principles, capabilities, timeline,
 * languages. Real, specific copy in the studio's "we" voice (Taranity is a small
 * studio — "we" means the studio, not a fabricated team). Confirm facts in HUMAN-TODO.
 */

/** Lead paragraphs for the about page. */
export const story: string[] = [
  'Taranity started the way most good tools do: someone got tired of doing the same thing twice. The first thing we ever automated was a university timetable — the official portal was slow and ugly, so we built something that checked it for us. The moment a script did a chore we used to dread, the studio had its reason to exist.',
  'That instinct never left. We put down roots in the Netherlands, learned to build software properly at Fontys, and kept pulling the same thread: find the manual, repetitive, fragile part of a problem and replace it with something that runs itself. Schedules became dashboards. Dashboards became agents. Agents became an entire automation layer that now ships code overnight.',
  'Today Taranity builds across the whole digital stack — AI systems, web apps, websites, and the automation underneath them. The kind of work that turns "someone should build this" into something running in production. We care less about clever code and more about the outcome: fewer late nights, fewer dropped balls, a number that moved in the right direction.',
];

/** Short, quotable principles. */
export const principles: { title: string; body: string }[] = [
  {
    title: 'Outcomes over output',
    body: 'A feature nobody measures is a guess. Every engagement carries a number, because that is the only honest way to know it worked.',
  },
  {
    title: 'Deterministic where it matters',
    body: 'AI is powerful and forgetful. We wrap it in guardrails — hooks, schemas, review gates — so the smart part can move fast without breaking things.',
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
  /** 0–100 capability level for the bar; honest, not everything-is-100. */
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
    title: 'Automated a broken timetable',
    body: 'Built a better front-end for a university schedule because the official one drove us up the wall. First taste of letting code do the chore.',
  },
  {
    when: 'Foundations',
    title: 'Learned to build, in the Netherlands',
    body: 'Formal software engineering at Fontys — and a steady supply of real problems worth solving properly.',
  },
  {
    when: 'Full-stack',
    title: 'Shipped products end to end',
    body: 'CallCatch, Cortex, and a run of client builds — owning the whole stack from telephony and data to UI.',
  },
  {
    when: 'Now',
    title: 'Taranity, the studio',
    body: 'Building across the digital stack — AI systems, apps, websites, and the automation layer underneath — for teams who want it done right.',
  },
];

export const languages: { name: string; level: string }[] = [
  { name: 'Farsi', level: 'Native' },
  { name: 'Dutch', level: 'Advanced' },
  { name: 'English', level: 'Fluent' },
];
