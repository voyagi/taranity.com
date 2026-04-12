export interface Project {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  image?: string;
}

export const projects: Project[] = [
  {
    slug: 'cortex',
    title: 'Cortex',
    description: 'Unified AI development monitoring dashboard.',
    tags: ['AI', 'Dashboard', 'Monitoring'],
  },
  {
    slug: 'callcatch',
    title: 'CallCatch',
    description: 'Smart business call verification SaaS.',
    tags: ['SaaS', 'AI', 'Telephony'],
  },
  {
    slug: 'mcp-server',
    title: 'MCP Server',
    description: 'Custom Model Context Protocol server.',
    tags: ['AI', 'Protocol', 'Infrastructure'],
  },
  {
    slug: 'n8n-automation',
    title: 'N8N Automation',
    description: 'Workflow automation platform.',
    tags: ['Automation', 'Workflows'],
  },
  {
    slug: 'ai-chatbot',
    title: 'AI Chatbot',
    description: 'Intelligent conversational AI.',
    tags: ['AI', 'NLP', 'Chat'],
  },
  {
    slug: 'fontys-schedule',
    title: 'Fontys Schedule',
    description: 'University schedule management app.',
    tags: ['Education', 'Mobile', 'Scheduling'],
  },
  {
    slug: 'claude-code-ecosystem',
    title: 'Claude Code Ecosystem',
    description: '50+ hooks, 30+ skills, overnight automation.',
    tags: ['AI', 'Developer Tools', 'Automation'],
  },
  {
    slug: 'dev-browser',
    title: 'Dev Browser',
    description: 'Automated browser testing framework.',
    tags: ['Testing', 'Automation', 'Browser'],
  },
];
