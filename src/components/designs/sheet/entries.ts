/**
 * The build sheet's content: things people have described to us, and how we would
 * actually build them. This is the whole design - the structure is a document, so
 * the writing IS the craft on show. Rules for anyone editing this file:
 *  - Every entry is a real, specific, falsifiable claim, never marketing. If a line
 *    could sit on any studio's site, cut it.
 *  - Fields are deliberately UNEQUAL (ragged). Not every entry carries every field;
 *    that irregularity is the point (a tidy grid reads as a price list).
 *  - `honor` (the constraint we hold ourselves to) is the one field every entry has.
 *  - No em dashes anywhere (site-wide copy rule).
 *  - `reasoning` shows a real decision and the failure it avoids. It is the proof
 *    that replaces a portfolio, so it has to earn the reader's trust on its own.
 */

/** Domains, used by the domain filter chips. */
export type Domain = 'web' | 'commerce' | 'apps' | 'automation' | 'systems';
/** Buyer intents, phrased as verbs, used by the primary filter chips. */
export type Intent = 'sell' | 'run-itself' | 'team-tool' | 'rebuild';

export interface Entry {
  /** Stable slug, used for the anchor id and the no-JS filter links. */
  id: string;
  /** Outcome-led, noun front-loaded (for left-margin scanning). */
  headline: string;
  domains: Domain[];
  intents: Intent[];
  /** A real thing a client said, in their words. */
  describe: string;
  /** What we hand over. Optional on purpose. */
  ships?: string;
  /** The constraint we hold to. Always present; it is the spine of the sheet. */
  honor: string;
  /** How we know it is finished. Optional on purpose. */
  done?: string;
  /** The reveal: a real decision and the failure mode it protects against. */
  reasoning: string;
  /** Written for a non-technical reader (front desk, owner), not a builder. */
  plain?: boolean;
}

export const INTENTS: { id: Intent; label: string }[] = [
  { id: 'sell', label: 'make it sell' },
  { id: 'run-itself', label: 'make it run itself' },
  { id: 'team-tool', label: 'give the team a tool' },
  { id: 'rebuild', label: 'rebuild it right' },
];

export const entries: Entry[] = [
  {
    id: 'checkout-launch',
    headline: 'Checkout that survives launch day',
    domains: ['commerce', 'web'],
    intents: ['sell'],
    describe: 'our store falls over the minute we run an ad',
    ships: 'a storefront, and a checkout that queues instead of dying',
    honor: 'under 200ms for the 95th customer at ten times normal traffic',
    done: 'it passes a load test at that traffic, against the real payment provider, not a staging mock',
    reasoning:
      'The thing that fails on launch day is almost never the page. It is the checkout write path hitting a database that was fine at 20 orders an hour and is not at 2,000. So we do not tune the page first. We put the order between the customer and the database: the customer gets an instant confirmation, the order goes on a queue, and the slow work (payment capture, stock, email) drains behind it at the rate the database can actually take. If the payment provider rate-limits us, orders wait in line instead of erroring. The failure we are protecting against is the expensive one, a customer who taps pay, sees a spinner, and buys from someone else. We do not call it done until we have replayed ten times your best day against the provider live sandbox and the graph is flat.',
  },
  {
    id: 'booking-front-desk',
    headline: 'A booking flow your front desk actually uses',
    domains: ['apps', 'web'],
    intents: ['sell', 'team-tool'],
    plain: true,
    describe: 'patients start booking, give up, and phone instead',
    honor: 'three taps from book to booked, on a five-year-old phone, no app to install',
    done: 'your front desk stops re-typing what patients already entered',
    reasoning:
      'Most booking abandonment is not a design problem, it is an asking-too-early problem. The form wants an account, an address, and an insurance number before it will show a single free slot. We flip the order: show real availability first, take the smallest thing that holds the appointment (a name and a time), collect the rest afterwards or at the desk. It talks to whatever calendar you already run, so the booking the patient made turns up at the desk in the same words and nobody re-keys anything. If your patients skew older, that is a design input, not an edge case: bigger targets, fewer screens, works one-handed on a bus.',
  },
  {
    id: 'inbox-router',
    headline: 'A system that sorts the inbox before anyone opens it',
    domains: ['automation', 'systems'],
    intents: ['run-itself'],
    describe: 'everything lands in one inbox and the urgent things drown',
    ships: 'a router that reads what comes in and sends it where it goes',
    honor: 'the urgent message reaches a person in minutes, with a record of why',
    done: 'the shared inbox stops being where things go to get lost',
    reasoning:
      'A shared inbox is a queue pretending to be a conversation. We keep the inbox people already use and put a router in front of it. Each message gets read (plain rules first, a model only where rules genuinely cannot decide), tagged, and routed to a person, a channel, or an automatic reply, with the reason written down. The part we are careful about is confident-and-wrong: a classifier that is sure and mistaken is worse than none, so anything under a confidence line goes to a human, not a guess, and every routing decision can be checked afterwards. You get the time back without losing the ability to see what happened.',
  },
  {
    id: 'retire-spreadsheet',
    headline: 'An internal tool that retires a spreadsheet',
    domains: ['apps'],
    intents: ['team-tool'],
    describe: 'the whole company runs on one spreadsheet and one person who understands it',
    honor: 'the same numbers as the spreadsheet on day one, or we have not earned the switch',
    reasoning:
      'The spreadsheet is not the enemy. It is a working spec that someone maintained for years, and the fastest way to fail is to replace it with something that does less. So we start by making the new tool agree with the old sheet exactly, formula for formula, before we add a single feature. Then we take away the parts that hurt: the copy-paste, the version called final-v3, the row someone deletes by accident on a Friday. What we do not do is turn a five-minute task into a fourteen-field form because a database wanted it normalised.',
  },
  {
    id: 'site-loads-fast',
    headline: 'A marketing site that loads before they lose interest',
    domains: ['web'],
    intents: ['sell', 'rebuild'],
    describe: 'the site looks fine but people leave before it finishes loading',
    ships: 'a rebuild that ships as HTML first and adds the rest only where it earns its place',
    honor: 'usable in about a second on a mid-range phone on a normal connection',
    reasoning:
      'Most slow sites are slow because everything waits for JavaScript, including the words. We build the other way round: the page is complete, readable HTML the moment it arrives, and the clever parts enhance it rather than block it. That is not a fallback, it is the plan. The number we watch is not a lab score on a fast laptop, it is what a real phone does on a train, because that is where the visitor you are paying for actually is. (This very page is the argument: it works with JavaScript turned off.)',
  },
  {
    id: 'rebuild-scary',
    headline: 'A rebuild of the thing everyone is scared to touch',
    domains: ['web', 'apps', 'systems'],
    intents: ['rebuild'],
    describe: 'it works, sort of, but no one dares change it and the person who wrote it left',
    honor: 'we can switch it off and back on again without a held breath',
    done: 'a new person can make a change on their first week without a senior watching',
    reasoning:
      'Scary code is code with no way to know if a change broke something. So the first thing we build is not the new version, it is the safety net: tests around the behaviour that matters, so the system can tell us when we have gone wrong instead of a customer telling you. Then we replace it in pieces behind that net, with the old and new running side by side until the new one has earned the traffic. Big-bang rewrites are how studios turn one scary system into two. We do not do them.',
  },
  {
    id: 'onboarding-runs-itself',
    headline: 'Onboarding that runs itself while you sleep',
    domains: ['automation'],
    intents: ['run-itself'],
    describe: 'every new customer needs the same six things done by hand and we forget one',
    honor: 'if a step fails, a human is told which one and why, not left to find out later',
    reasoning:
      'Automation that only handles the happy path is worse than no automation, because it fails silently and you find out from an angry customer. So we build for the unhappy path first: every step can fail, and when it does the system says exactly which step, for which customer, and what it was trying to do, then holds the rest instead of ploughing on. The boring six things happen on their own. The one that goes wrong lands on a person, with the context to fix it in a minute rather than an afternoon of detective work.',
  },
  {
    id: 'dashboard-answers',
    headline: 'A dashboard that answers the question you actually ask',
    domains: ['apps', 'systems'],
    intents: ['team-tool'],
    describe: 'we have ten dashboards and still open a spreadsheet to get the real number',
    honor: 'one screen answers the question you open it to ask, without a second click',
    reasoning:
      'Ten dashboards means nobody decided what the question was. We start from the decision, not the data: what will you do differently depending on this number? Then we show that, and cut the forty charts nobody looks at. A number with no decision attached is decoration, and decoration is what makes people open the spreadsheet instead. We would rather ship one screen you trust than ten you tolerate.',
  },
  {
    id: 'editable-site',
    headline: 'A site your team can edit without calling us',
    domains: ['web'],
    intents: ['team-tool', 'sell'],
    plain: true,
    describe: 'we pay someone every time we need to change a price or a photo',
    honor: 'the people who know the content can change it, the people who do not cannot break the layout',
    reasoning:
      'The reason editing is scary is usually that the tools let you break the page. So we give your team the parts they should change (words, images, prices, the order of things) and none of the parts they should not (the layout, the code, the way it looks on a phone). Editing happens in plain language, saves like a document, and if two people edit at once the site does not lose anyone work. You stop paying us to change a comma, which is the point. We would rather be hired for the hard things.',
  },
  {
    id: 'search-that-finds',
    headline: 'Search that finds the thing, not forty things',
    domains: ['apps', 'systems'],
    intents: ['sell', 'team-tool'],
    describe: 'our search returns everything and customers give up and email us',
    honor: 'the thing you meant is in the first few results, including when you spell it wrong',
    reasoning:
      'Bad search is usually search that matches letters instead of meaning: type "trainers" and get nothing because the catalogue says "sneakers". We fix the meaning layer, handle the typo and the synonym and the plural, and rank by what people actually click, not by how many times a word appears. And we make it fast enough to show results as you type, because a search that makes you wait is a search you stop trusting. The test is simple and cruel: your own team tries to break it with the weird queries real customers use, and it holds.',
  },
  {
    id: 'systems-that-talk',
    headline: 'Two systems that finally talk to each other',
    domains: ['systems', 'automation'],
    intents: ['run-itself'],
    describe: 'the shop and the accounts system both hold the truth and they disagree',
    honor: 'one of them is the source of truth for each fact, and we can prove which',
    reasoning:
      'Two systems disagreeing is not an integration problem, it is an ownership problem: nobody decided which one is right about what. So before we connect anything, we decide, per fact, who owns it, and the other side follows. Then the connection is built to survive the real world: it retries when the other end is down, it never applies the same change twice, and it keeps a log so when a number looks wrong you can see exactly what flowed and when. The version that just copies data both ways on a timer is the version that quietly corrupts both.',
  },
  {
    id: 'ai-that-earns-it',
    headline: 'AI put only where it earns its place',
    domains: ['systems', 'apps'],
    intents: ['run-itself', 'team-tool'],
    describe: 'everyone says we should use AI and we do not know where it would actually help',
    honor: 'we can measure whether it helped, and turn it off if it did not',
    reasoning:
      'Most AI features are a solution looking for a problem, bolted where it demos well rather than where it works. We start from the task, not the technology: where is a person doing something repetitive, judgement-light, and easy to check? That is where a model earns its keep, with a person on the decisions that matter and a guardrail on the ones it should not make alone. We build the measurement before the feature, so "did it help" has an answer, and we are as happy to tell you the answer is no. The failure we refuse to ship is confident nonsense presented as fact.',
  },
];
