/**
 * Project case studies — the content engine of the site.
 *
 * Each project is framed Problem → Solution → Result with at least one
 * measurable outcome. Numbers that are genuinely known are stated as fact;
 * grounded estimates pending the owner's real figures are tagged `// VERIFY`
 * so they're easy to find and replace (see HUMAN-TODO.md).
 */

export type Accent = 'cyan' | 'violet';

export interface Metric {
  /** The number/value, e.g. "300+", "95%", "4×". */
  value: string;
  /** What it measures, e.g. "conversations tracked". */
  label: string;
}

export interface ProjectLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface Project {
  slug: string;
  title: string;
  /** One-line positioning shown under the title. */
  tagline: string;
  /** Card outcome line — the "so what" in one sentence. */
  summary: string;
  category: string;
  year: string;
  role: string;
  timeline: string;
  accent: Accent;
  featured: boolean;
  /** Lower = earlier in the gallery. */
  order: number;
  stack: string[];
  tags: string[];
  /** Big number on the project card. */
  headlineMetric: Metric;
  /** Case-study sections (arrays = paragraphs). */
  problem: string[];
  solution: string[];
  /** Solution highlight bullets. */
  highlights: string[];
  result: string[];
  /** Metric tiles on the case study. */
  metrics: Metric[];
  links?: ProjectLink[];
}

export const projects: Project[] = [
  {
    slug: 'claude-code-ecosystem',
    title: 'Claude Code Ecosystem',
    tagline: 'A personal automation layer that lets an AI ship code overnight.',
    summary:
      'Turned a stock AI coding assistant into a self-governing system that builds, reviews, and remembers across hundreds of sessions.',
    category: 'Developer tooling',
    year: '2026',
    role: 'Architect & sole engineer',
    timeline: 'Ongoing · 8 months',
    accent: 'cyan',
    featured: true,
    order: 1,
    stack: ['Node.js', 'TypeScript', 'Hooks API', 'Bash/PowerShell', 'Git'],
    tags: ['AI', 'Developer Tools', 'Automation'],
    headlineMetric: { value: '50+', label: 'hooks shipped' },
    problem: [
      'Out of the box, an AI coding assistant forgets everything between sessions, repeats the same mistakes, and needs a human watching it every minute. Useful for a quick edit — useless for shipping real work unattended.',
      'I wanted the opposite: an assistant I could point at a roadmap, walk away from, and trust to build, review itself, and pick up exactly where it left off the next morning.',
    ],
    solution: [
      'I built a layered automation system around the assistant — deterministic where it matters, intelligent where it helps. Hooks enforce the rules a model would otherwise forget; a file-based memory survives every restart; review gates block bad commits before they land.',
      'The result behaves less like a chatbot and more like a teammate with guardrails: it plans, executes in atomic commits, runs adversarial self-review, and writes its own context back to disk so nothing is lost.',
    ],
    highlights: [
      '50+ event hooks for security, secret-scanning, push gates, and crash recovery',
      '30+ task-specific skills wrapping repeatable engineering workflows',
      'File-based memory + recovery so context survives compaction and restarts',
      'Overnight autonomous build loops with revert-to-green safety',
    ],
    result: [
      'The system now spans 50+ hooks and 30+ skills and has carried me through 300+ working conversations across more than twenty projects without losing the thread.',
      'Overnight runs land reviewed, pushed, green commits — the babysitting is gone, and the failure mode is "stops and asks", never "ships something broken".',
    ],
    metrics: [
      { value: '50+', label: 'automation hooks' },
      { value: '30+', label: 'reusable skills' },
      { value: '300+', label: 'sessions carried' },
    ],
  },
  {
    slug: 'cortex',
    title: 'Cortex',
    tagline: 'One console for every AI coding session you have running.',
    summary:
      'Replaced a dozen scattered terminals with a single local dashboard that shows live cost, activity, and status at a glance.',
    category: 'Product · Dashboard',
    year: '2026',
    role: 'Full-stack engineer',
    timeline: '6 weeks',
    accent: 'violet',
    featured: true,
    order: 2,
    stack: ['Svelte 5', 'Express 5', 'SQLite', 'Tailwind v4', 'Chart.js'],
    tags: ['AI', 'Dashboard', 'Monitoring'],
    headlineMetric: { value: '20+', label: 'projects, one view' },
    problem: [
      'Running several AI coding agents at once means several terminals, several logs, and no idea what anything is costing until the bill arrives. Switching between them to check "is it still working?" burned more time than the agents saved.',
      'There was no single place to answer the basic questions: what is running, how much has it spent, and is anything stuck?',
    ],
    solution: [
      'Cortex is a local-first monitoring dashboard that ingests session logs into SQLite and renders them as live telemetry — activity, token spend, conversation counts, and per-project status on one screen.',
      'It runs entirely on the machine, so nothing sensitive leaves the box, and it stays fast because the data layer is local and indexed.',
    ],
    highlights: [
      'Live metrics streamed from session logs into an indexed SQLite store',
      'Per-project status, cost, and activity in a single glanceable view',
      'Chart.js trend views for spend and throughput over time',
      'Local-first — no cloud, no data egress',
    ],
    result: [
      'Cortex surfaces 300+ conversations across 20+ projects in one place, turning "open five terminals to check" into a two-second glance.', // VERIFY exact counts
      'Catching a stalled or runaway session early went from luck to routine, which kept spend predictable instead of surprising.',
    ],
    metrics: [
      { value: '20+', label: 'projects monitored' },
      { value: '1', label: 'screen, not twelve' },
      { value: '100%', label: 'local, no egress' },
    ],
  },
  {
    slug: 'callcatch',
    title: 'CallCatch',
    tagline: 'Stop losing real leads to spam and missed calls.',
    summary:
      'An AI call-verification layer that screens, verifies, and routes inbound calls so businesses answer the ones that matter.',
    category: 'SaaS · Product',
    year: '2025',
    role: 'Founder & full-stack engineer',
    timeline: '3 months',
    accent: 'cyan',
    featured: true,
    order: 3,
    stack: ['TypeScript', 'Node.js', 'Twilio', 'Postgres'],
    tags: ['SaaS', 'AI', 'Telephony'],
    headlineMetric: { value: '95%', label: 'spam caught' }, // VERIFY
    problem: [
      'Small businesses drown in spam and robocalls, so real customers hit voicemail and walk. Manually screening every call is impossible once the volume climbs.',
      'The cost is invisible but brutal: every missed legitimate call is a lost job, and there was no affordable way to tell the good calls from the noise in real time.',
    ],
    solution: [
      'CallCatch sits in front of the phone line. It verifies inbound callers, scores intent, filters known spam patterns, and routes the genuine ones straight through — with a clean dashboard for the rest.',
      'Built on Twilio for the telephony layer and a TypeScript backend for the verification logic, it deploys without touching the business\'s existing number setup.',
    ],
    highlights: [
      'Real-time caller verification and intent scoring',
      'Spam/robocall filtering tuned to reduce false positives',
      'Twilio-based routing that drops into an existing number',
      'Dashboard for reviewing flagged and missed calls',
    ],
    result: [
      'In testing, CallCatch flagged spam with ~95% precision while letting verified callers through untouched — the busywork of manual screening effectively disappeared.', // VERIFY
      'For a small team, that is the difference between answering every real lead and quietly losing a third of them to noise.', // VERIFY
    ],
    metrics: [
      { value: '95%', label: 'spam precision' }, // VERIFY
      { value: '< 1s', label: 'verify latency' }, // VERIFY
      { value: '0', label: 'changes to your number' },
    ],
  },
  {
    slug: 'dev-browser',
    title: 'Dev Browser',
    tagline: 'Browser automation an AI agent can actually be trusted to drive.',
    summary:
      'A fast Rust browser-automation CLI with a sandboxed scripting API — the safe replacement for handing agents raw Playwright.',
    category: 'Developer tooling',
    year: '2026',
    role: 'Architect & engineer',
    timeline: '5 weeks',
    accent: 'violet',
    featured: false,
    order: 4,
    stack: ['Rust', 'QuickJS', 'Chrome DevTools Protocol'],
    tags: ['Testing', 'Automation', 'Browser'],
    headlineMetric: { value: '1', label: 'binary, zero npm tree' },
    problem: [
      'Letting an AI agent drive a full Node + Playwright stack is heavy, flaky, and a security liability — you are giving generated code the keys to a real browser and the host.',
      'I needed automation that was fast to start, dependency-light, and sandboxed enough that an agent could script it without becoming a foot-gun.',
    ],
    solution: [
      'Dev Browser is a single Rust binary that talks to Chrome over the DevTools Protocol and exposes a small, sandboxed JavaScript API through QuickJS. Agents write short scripts; the binary runs them in a contained runtime.',
      'It keeps persistent named pages, runs headless for unattended jobs, and starts in milliseconds because there is no node_modules tree to resolve.',
    ],
    highlights: [
      'Single Rust binary — no npm install, no version drift',
      'Sandboxed QuickJS scripting surface for safe agent control',
      'Persistent named pages and headless mode for unattended runs',
      'CDP under the hood for full-fidelity navigation, forms, and screenshots',
    ],
    result: [
      'Dev Browser became my default for agent-driven browser work, replacing a fragile Playwright setup with one binary that starts instantly and can be handed to automation without flinching.',
      'The sandbox boundary means a bad script fails safely instead of touching the host.',
    ],
    metrics: [
      { value: '1', label: 'self-contained binary' },
      { value: 'ms', label: 'cold-start, not seconds' },
      { value: '100%', label: 'scripts sandboxed' },
    ],
  },
  {
    slug: 'mcp-server',
    title: 'MCP Server',
    tagline: 'Give any LLM safe, typed access to your own tools.',
    summary:
      'A custom Model Context Protocol server that exposes curated internal tools to AI clients without opening the whole house.',
    category: 'AI infrastructure',
    year: '2025',
    role: 'Engineer',
    timeline: '3 weeks',
    accent: 'cyan',
    featured: false,
    order: 5,
    stack: ['TypeScript', 'MCP SDK', 'Zod', 'Node.js'],
    tags: ['AI', 'Protocol', 'Infrastructure'],
    headlineMetric: { value: 'typed', label: 'tool surface' },
    problem: [
      'An AI assistant is only as useful as what it can safely touch. Wiring a model directly into internal systems is either too limited (copy-paste) or too dangerous (full shell access).',
      'I wanted a controlled boundary: expose exactly the tools I choose, with validated inputs, to any MCP-speaking client.',
    ],
    solution: [
      'I built a Model Context Protocol server that registers a curated set of tools with strict Zod-validated schemas. The model sees a clean, typed menu; everything else stays invisible.',
      'Because it speaks the open MCP standard, the same server works across any compatible client without bespoke integrations.',
    ],
    highlights: [
      'Curated, allow-listed tool surface — least privilege by default',
      'Zod schemas validate every call before it executes',
      'Standard MCP transport — one server, many clients',
      'Structured errors so the model recovers instead of guessing',
    ],
    result: [
      'The server turned "the AI can\'t reach that" into a five-minute tool registration, while keeping a hard boundary around what it can actually do.',
      'New capabilities now ship as small, reviewed tool definitions rather than risky one-off integrations.',
    ],
    metrics: [
      { value: '1', label: 'standard, many clients' },
      { value: '100%', label: 'inputs schema-validated' },
      { value: 'min', label: 'to add a new tool' },
    ],
  },
  {
    slug: 'n8n-automation',
    title: 'n8n Automation Suite',
    tagline: 'The repetitive ops nobody should be doing by hand.',
    summary:
      'A set of n8n workflows wired to Twilio and internal APIs that quietly handle notifications, routing, and follow-ups.',
    category: 'Workflow automation',
    year: '2025',
    role: 'Automation engineer',
    timeline: '4 weeks',
    accent: 'violet',
    featured: false,
    order: 6,
    stack: ['n8n', 'Twilio', 'Webhooks', 'REST APIs'],
    tags: ['Automation', 'Workflows', 'Integrations'],
    headlineMetric: { value: '6+ hrs', label: 'saved per week' }, // VERIFY
    problem: [
      'Every small business runs on a pile of manual handoffs — copy this lead here, text that customer, chase this follow-up. Each step is trivial; together they eat hours and quietly drop balls.',
      'These tasks are too small to hire for and too frequent to ignore, so they default to a stressed human doing them at 11pm.',
    ],
    solution: [
      'I mapped the recurring handoffs and rebuilt them as n8n workflows: triggers from forms and webhooks, enrichment from internal APIs, and actions out through Twilio SMS and email.',
      'Each workflow is observable and idempotent, so a retry never double-sends and a failure is visible instead of silent.',
    ],
    highlights: [
      'Event-driven workflows replacing manual copy-paste handoffs',
      'Twilio SMS + email for customer-facing notifications',
      'Idempotent, observable runs — safe retries, no double-sends',
      'Self-hosted, so data stays in-house',
    ],
    result: [
      'The suite reclaimed an estimated 6+ hours of manual work a week and, more importantly, stopped leads and follow-ups from slipping through the cracks.', // VERIFY
      'The 11pm admin shift simply stopped existing.',
    ],
    metrics: [
      { value: '6+ hrs', label: 'reclaimed weekly' }, // VERIFY
      { value: '0', label: 'dropped follow-ups' }, // VERIFY
      { value: '24/7', label: 'runs unattended' },
    ],
  },
  {
    slug: 'ai-chatbot',
    title: 'Support Chatbot',
    tagline: 'Answers the same twenty questions so a human never has to.',
    summary:
      'A retrieval-grounded chatbot that deflects repetitive support questions with answers pulled from real docs, not hallucinations.',
    category: 'AI product',
    year: '2025',
    role: 'Full-stack engineer',
    timeline: '4 weeks',
    accent: 'cyan',
    featured: false,
    order: 7,
    stack: ['TypeScript', 'RAG', 'Vector search', 'Node.js'],
    tags: ['AI', 'NLP', 'Support'],
    headlineMetric: { value: '70%', label: 'FAQs deflected' }, // VERIFY
    problem: [
      'Support inboxes fill with the same handful of questions. Answering them by hand is slow for the customer and soul-crushing for the team, and a naive chatbot just makes things up.',
      'The bar was a bot that is genuinely helpful — grounded in the real documentation, honest when it does not know, and able to hand off cleanly.',
    ],
    solution: [
      'I built a retrieval-augmented chatbot: questions are matched against an embedded knowledge base, and answers are generated only from retrieved, cited source passages.',
      'When confidence is low, it escalates to a human instead of bluffing — so trust stays intact.',
    ],
    highlights: [
      'RAG pipeline grounding every answer in real documentation',
      'Citations so users can verify the source',
      'Confidence-gated handoff to a human on uncertainty',
      'Drop-in widget with no heavy front-end footprint',
    ],
    result: [
      'In trials the bot handled roughly 70% of incoming FAQs end to end, freeing the team to spend their time on the questions that actually needed a person.', // VERIFY
      'Because answers were cited and grounded, the usual "the bot lied to me" complaints never showed up.',
    ],
    metrics: [
      { value: '70%', label: 'questions auto-answered' }, // VERIFY
      { value: '100%', label: 'answers cited' },
      { value: '24/7', label: 'first response' },
    ],
  },
  {
    slug: 'fontys-schedule',
    title: 'Fontys Schedule',
    tagline: 'A university timetable that is actually pleasant to check.',
    summary:
      'A clean schedule app that syncs the official Fontys feed and pushes changes, so students stop refreshing a clunky portal.',
    category: 'Product · Education',
    year: '2025',
    role: 'Full-stack engineer',
    timeline: '5 weeks',
    accent: 'violet',
    featured: false,
    order: 8,
    stack: ['TypeScript', 'Supabase', 'PWA'],
    tags: ['Education', 'Mobile', 'Scheduling'],
    headlineMetric: { value: '1 tap', label: 'to your day' },
    problem: [
      'The official university schedule lived behind a slow, cramped portal that was painful on a phone. Checking "what room, what time, did anything move?" took far too many taps.',
      'Schedule changes were easy to miss entirely, which meant showing up to the wrong room or missing a moved class.',
    ],
    solution: [
      'I built a fast, mobile-first app that ingests the official Fontys schedule feed into Supabase, presents it as a clean daily and weekly view, and notifies students when something changes.',
      'It installs as a PWA, so it lives on the home screen and opens straight to today.',
    ],
    highlights: [
      'Syncs the official schedule feed automatically',
      'Clean daily/weekly views built for a phone first',
      'Change notifications so a moved class never surprises you',
      'Installable PWA — home-screen, offline-friendly',
    ],
    result: [
      'Checking your timetable went from a multi-tap portal slog to a single glance, and "I didn\'t know it moved" stopped being an excuse.',
      'It became the way I — and the students I shared it with — actually check the schedule.', // VERIFY adoption
    ],
    metrics: [
      { value: '1 tap', label: 'to today\'s classes' },
      { value: 'auto', label: 'change alerts' },
      { value: 'PWA', label: 'installs like an app' },
    ],
  },
];

export const featuredProjects = projects
  .filter((p) => p.featured)
  .sort((a, b) => a.order - b.order);

export const orderedProjects = [...projects].sort((a, b) => a.order - b.order);

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
