import type { SkillCategory } from "@openbot/contracts/ipc";
import {
  Briefcase,
  Bug,
  CalendarCheck,
  ClipboardList,
  DatabaseZap,
  FileSearch,
  GitPullRequest,
  Layers,
  LifeBuoy,
  ListChecks,
  Megaphone,
  Newspaper,
  Palette,
  Rocket,
  Scale,
  ScanEye,
  Send,
  ShieldAlert,
  ShieldCheck,
  Target,
  Workflow,
} from "@openbot/ui";

/** The catalog gives each first-party listing an id that starts with this prefix and ends with its slug. */
const FIRST_PARTY_SKILL_PREFIX = "openbot-curated-skill-";

type ArtworkIcon = typeof Rocket;

/**
 * Each first-party skill has its own line icon. The category is the one the catalog gives the skill,
 * and it picks the colour. A first-party skill that is not listed here keeps the artwork of the catalog.
 */
const FIRST_PARTY_SKILL_ARTWORK: Readonly<Record<string, { icon: ArtworkIcon; category: SkillCategory }>> = {
  "project-plan": { icon: ListChecks, category: "productivity" },
  "secure-code-guidance": { icon: ShieldCheck, category: "coding" },
  "change-review": { icon: GitPullRequest, category: "coding" },
  "evidence-brief": { icon: FileSearch, category: "research" },
  "bug-triage": { icon: Bug, category: "coding" },
  "meeting-actions": { icon: CalendarCheck, category: "productivity" },
  "competitor-comparison": { icon: Scale, category: "research" },
  "data-quality-review": { icon: DatabaseZap, category: "data-analytics" },
  "campaign-analysis": { icon: Megaphone, category: "data-analytics" },
  "launch-notes": { icon: Rocket, category: "documents" },
  "support-reply": { icon: LifeBuoy, category: "documents" },
  "hiring-scorecard": { icon: ClipboardList, category: "other" },
  "distinctive-frontend-design": { icon: Palette, category: "design" },
  "decision-quality-check": { icon: Target, category: "productivity" },
  "workflow-playbook": { icon: Workflow, category: "automation" },
  "internal-communications": { icon: Newspaper, category: "documents" },
  "account-brief": { icon: Briefcase, category: "research" },
  "repository-threat-model": { icon: ShieldAlert, category: "coding" },
  "interface-critique": { icon: ScanEye, category: "design" },
  "outreach-draft": { icon: Send, category: "documents" },
  pstack: { icon: Layers, category: "coding" },
};

/** What the artwork of a skill needs from its listing. */
export interface SkillArtworkSubject {
  id?: string | undefined;
  category?: SkillCategory | undefined;
}

export interface SkillArtwork {
  Icon: ArtworkIcon;
  /** Sets `--skill-art-color`, which the tile styles read for the stroke and the soft tint. */
  style: Record<string, string>;
}

/**
 * The own icon of a first-party OpenBot skill, or undefined for any other listing. A third-party
 * listing and a first-party skill that has no icon here keep the image the listing carries.
 */
export function skillArtwork(subject: SkillArtworkSubject | undefined): SkillArtwork | undefined {
  const id = subject?.id;
  if (!id?.startsWith(FIRST_PARTY_SKILL_PREFIX)) return undefined;
  const entry = FIRST_PARTY_SKILL_ARTWORK[id.slice(FIRST_PARTY_SKILL_PREFIX.length)];
  if (!entry) return undefined;
  const category = subject?.category ?? entry.category;
  return { Icon: entry.icon, style: { "--skill-art-color": `var(--openbot-skill-${category})` } };
}
