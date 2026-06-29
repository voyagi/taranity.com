---
title: How to Add AI to Your Product Without the Hype
description: "How to implement AI in your business without the hype or the lawsuits: picking real use cases, setting guardrails, and the GDPR questions to answer first."
lead: "Treat AI as a capable, confident, sometimes-wrong intern. You would give it real work. You would not give it the company credit card unsupervised on day one."
kicker: Intelligent systems
pubDate: 2026-06-29
keywords:
  - how to implement AI in your business
  - AI guardrails
  - AI use cases for business
  - responsible AI
  - GDPR AI
order: 4
draft: true
faqs:
  - q: How do I start implementing AI in my business?
    a: "Start from a real, repetitive problem, not from a wish to use AI. Pick one low-stakes task involving messy language or lots of unstructured input, ground the model in your own data, keep a human approving the output, and run it as a one-month pilot before expanding."
  - q: What are AI guardrails?
    a: "Guardrails are the controls that keep an AI feature safe and accurate: grounding it in real data so it does not invent answers, keeping a human in the loop for high-stakes actions, limiting what it can do in code rather than just in the prompt, and logging and monitoring its behaviour."
  - q: What are good first AI use cases for a business?
    a: "Drafting (replies, summaries, descriptions) that a human approves, triage and routing of incoming messages, and plain-language search over your own documents or catalogue. These are high-value and recoverable when occasionally wrong."
  - q: Is using AI with customer data GDPR-compliant?
    a: "It can be, but you must address it deliberately: know where data is processed and by whom, confirm the provider does not train on your inputs, support human review of automated decisions, and collect only the data you need. For EU customers, prefer providers that keep data in the EU."
  - q: Why do AI chatbots give wrong answers?
    a: "Because a model answering from its own memory will generate plausible-sounding but invented information. Grounding it in your actual documents and instructing it to say it does not know when unsure sharply reduces this."
---

Every founder we talk to right now is being pushed in two directions at once. One voice
says "add AI or you will be obsolete". The other has watched a chatbot confidently invent a
refund policy that did not exist and earn a company a small news cycle. Both pressures are
real, and the gap between them is where most "AI strategy" actually lives, which is to say
nowhere useful.

So here is how we think about implementing AI in a business once you strip out the keynote
energy. The intern framing carries further than it looks: you would let an intern draft,
summarise, and triage all day, but you would not hand them the company credit card and your
customers' inbox unsupervised on day one. That single mental model answers most of the
questions people overcomplicate.

## Start from a problem, not from "AI"

The fastest way to waste a quarter is to decide you need AI and then go hunting for
somewhere to put it. Flip it. Find a real, expensive, repetitive problem first, then ask
whether AI is the right tool for that. Sometimes it is. Sometimes a database query and a
form would have solved it better, cheaper, and without the failure modes.

Good early candidates share a shape: the task involves messy human language or unstructured
input, there is a lot of it, and a wrong answer is recoverable rather than catastrophic. A
few that tend to pay off:

- **Drafting, not deciding.** First-pass replies, summaries, product descriptions, or
  internal docs that a human then approves. The human stays in the loop and the AI removes
  the blank page.
- **Triage and routing.** Reading incoming messages and sorting, tagging, or routing them.
  Low stakes if it is occasionally wrong, high value when it is usually right.
- **Search and retrieval over your own content.** Letting people ask questions against your
  docs, policies, or catalogue in plain language. This is where AI genuinely shines, if you
  ground it in your real data instead of letting it freelance.

## The guardrails, in plain terms

This is the part the hype skips, and it is the part that decides whether your AI feature is
an asset or a liability. None of it is exotic:

**Ground it in real data.** A model left to answer from its own memory will invent things,
fluently and convincingly. The fix (retrieval-augmented generation, in the jargon) is to
feed it your actual documents at question time and instruct it to answer only from those,
and to say it does not know otherwise. An AI that can admit ignorance is worth ten that
cannot.

**Keep a human in the loop where the stakes are real.** Drafting an email? Let it draft, a
person sends. Touching money, legal commitments, or anything you cannot unsend? A human
approves before it goes out. Full autonomy is for the reversible, low-stakes work, and you
earn your way up to it rather than starting there.

**Constrain what it can do, not just what it can say.** If the AI can take actions (issue a
refund, change a record, send a message) those actions need hard limits in the code around
the model, not polite instructions inside the prompt. Prompts are suggestions. The
guardrail that counts is the one a clever input cannot talk its way past.

**Log everything and watch it.** You want to be able to answer "why did it say that" after
the fact, and you want an alert when it starts behaving oddly. An AI feature you have
stopped watching is a feature that is quietly drifting.

## The part you cannot skip in Europe: data and the law

We build for companies across Europe, so this is not optional for us, and it should not be
for you either. Before a single customer's data goes near a model, get clear answers to:

- **Where is the data processed, and by whom?** If you are sending customer information to
  a third-party AI provider, that is a data transfer you have to disclose and, often, base
  on a proper legal footing. Under GDPR this is a real obligation, not a footnote. Prefer
  providers and regions that keep EU data in the EU where you can.
- **Are you feeding personal data into a model that might train on it?** Many enterprise
  APIs do not train on your inputs by default, but you have to actually check, not assume.
- **Can a person get a human review of an automated decision that affects them?** If your
  AI meaningfully decides something about a customer, GDPR gives them rights around that.
  Design for it instead of getting surprised by it.
- **Did you collect only what you need?** The cheapest way to reduce AI data risk is to not
  hold data you do not require. Minimise first.

This is not legal advice, and your situation may need a lawyer's eye. But these are the
questions that separate a feature you can stand behind from one that becomes a problem the
moment someone asks how it works.

## Where we would actually start

If you are at zero, pick one internal, low-stakes, drafting-or-triage task. Ground the
model in your own content. Keep a human approving the output. Run it for a month and measure
whether it actually saved time and stayed accurate. That pilot teaches you more about
whether AI fits your business than any amount of strategy decks, and if it goes sideways it
goes sideways internally, where it is a lesson and not a headline.

The companies getting real value from AI right now are not the ones who added the most of
it. They are the ones who picked one genuine problem, wired it up carefully, and earned the
right to do the next thing. Boring, supervised, and useful beats bold and unaccountable
every time. It usually sits right next to the
[automation work](/journal/what-to-automate-first) you have already done, and it is how we
approach [intelligent systems](/#crafts) in general. If you want AI in your product without
the liability, [let us scope it properly](/#contact).
