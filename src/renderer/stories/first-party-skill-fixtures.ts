import type { MarketplaceSkillDetail, MarketplaceSkillSummary, SkillCategory } from "@openbot/contracts/ipc";

/*
 * The first-party skills of the production catalog, as the online catalog lists them: the id has the
 * `openbot-curated-skill-` prefix, the name is the bare slug, and `iconUrl` is the category artwork
 * (a solid tile with a white mark). The desktop draws its own icon for each of these, so the story
 * shows that icon and not the image. The marks and colours below are the ones of the catalog build.
 */
const CATEGORY_ARTWORK: Record<SkillCategory, { background: string; mark: string }> = {
  coding: { background: "#2463a6", mark: '<path d="M9 18 3 12 9 6"/><path d="m15 6 6 6-6 6"/>' },
  design: {
    background: "#be4d86",
    mark: '<circle cx="9" cy="9" r="5.5"/><rect x="10.5" y="10.5" width="9" height="9" rx="1.5"/>',
  },
  "data-analytics": { background: "#268477", mark: '<path d="M5 20V11"/><path d="M12 20V4"/><path d="M19 20v-6"/>' },
  documents: {
    background: "#7255ce",
    mark: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h4"/><path d="M10 13h6"/><path d="M10 17h6"/>',
  },
  productivity: { background: "#e88124", mark: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12 3 3 5-6"/>' },
  research: { background: "#3b7dd8", mark: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>' },
  automation: { background: "#c0563f", mark: '<path d="M13 3 5 14h5l-1 7 8-11h-5z" stroke-linejoin="round"/>' },
  other: { background: "#526178", mark: '<path d="m12 4 2 5.5L19.5 12 14 14.5 12 20l-2-5.5L4.5 12 10 9.5z"/>' },
};

function categoryIcon(category: SkillCategory): string {
  const artwork = CATEGORY_ARTWORK[category];
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="18" fill="${artwork.background}"/><g transform="translate(16 16) scale(2)" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${artwork.mark}</g></svg>`,
  )}`;
}

const FIRST_PARTY: readonly [slug: string, category: SkillCategory, description: string][] = [
  ["secure-code-guidance", "coding", "Review or write code with secure defaults, for explicit security requests."],
  ["repository-threat-model", "coding", "A threat model of a repository: assets, boundaries, abuse paths and fixes."],
  ["change-review", "coding", "Review a proposed code change for bugs, regressions and missing checks."],
  ["bug-triage", "coding", "Turn a bug report, logs and repro steps into a testable diagnosis."],
  ["distinctive-frontend-design", "design", "Give a new interface a deliberate visual direction, not a template."],
  ["interface-critique", "design", "Review a screen or flow for clarity, hierarchy and accessibility."],
  ["evidence-brief", "research", "A cited brief that separates facts, interpretation and open questions."],
  ["competitor-comparison", "research", "Compare products against a buyer need, with unknowns made explicit."],
  ["account-brief", "research", "A focused sales-account research brief from the facts supplied."],
  ["campaign-analysis", "data-analytics", "Analyze campaign metrics for performance, gaps and next experiments."],
  ["data-quality-review", "data-analytics", "Inspect a dataset for missing values, duplicates and unit problems."],
  ["internal-communications", "documents", "Draft status reports, updates, FAQs and incident notes for your team."],
  ["launch-notes", "documents", "Turn completed changes into release notes with verified scope."],
  ["support-reply", "documents", "Draft accurate support replies from the issue, docs and account facts."],
  ["outreach-draft", "documents", "Concise outreach with a real reason to write and a clear next step."],
  ["decision-quality-check", "productivity", "A short self-check on consequential plans and recommendations."],
  ["meeting-actions", "productivity", "Pull decisions, owners and open questions out of meeting notes."],
  ["project-plan", "productivity", "Turn a goal into deliverables, dependencies, milestones and checks."],
  ["workflow-playbook", "automation", "Turn a repeatable process into a playbook and an automation spec."],
  ["hiring-scorecard", "other", "A role-based interview scorecard with consistent questions."],
];

/** `idPrefix` is the catalog's prefix; another prefix makes the same rows read as third-party listings. */
export function firstPartySkillFixtures(idPrefix = "openbot-curated-skill-"): MarketplaceSkillSummary[] {
  return FIRST_PARTY.map(([slug, category, description], index) => ({
    id: `${idPrefix}${slug}`,
    slug,
    name: slug,
    description,
    category,
    creatorName: "OpenBot",
    version: 1,
    installs: 900 - index * 37,
    featured: false,
    iconUrl: categoryIcon(category),
    updatedAt: "2026-10-01T09:00:00.000Z",
  }));
}

export function firstPartySkillDetails(
  skills: readonly MarketplaceSkillSummary[],
): Record<string, MarketplaceSkillDetail> {
  return Object.fromEntries(
    skills.map((skill) => [
      skill.id,
      {
        ...skill,
        versionId: `${skill.id}-v1`,
        bundleSha256: "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
        files: ["SKILL.md"],
        instructions: `# ${skill.name}\n\n${skill.description}\n\nUse it when the user asks for this work, and say what you could not check.`,
      },
    ]),
  );
}
