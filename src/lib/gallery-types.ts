export type MediaCategory =
  | "reference"
  | "design"
  | "before"
  | "fresh"
  | "healed"
  | "touch_up";

export const CATEGORY_META: Record<
  MediaCategory,
  {
    label: string;
    description: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
  }
> = {
  fresh: {
    label: "Fresh Tattoos",
    description: "Photographs taken immediately post-tattoo session in studio",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-300 dark:border-emerald-800",
  },
  healed: {
    label: "Healed (Follow-ups)",
    description: "Follow-up photos after 4-8 weeks healing period",
    badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
    badgeText: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300 dark:border-purple-800",
  },
  reference: {
    label: "Reference Images",
    description: "Client inspiration photos, anatomical references & placement moodboards",
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
    badgeText: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-300 dark:border-blue-800",
  },
  design: {
    label: "Design Concepts",
    description: "Custom stencils, line-art flash concepts, and digital sketches",
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/20",
    badgeText: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-300 dark:border-amber-800",
  },
  before: {
    label: "Before Session",
    description: "Skin preparation, stencil transfer & previous tattoo cover-up canvases",
    badgeBg: "bg-zinc-500/10 dark:bg-zinc-500/20",
    badgeText: "text-zinc-700 dark:text-zinc-300",
    borderColor: "border-zinc-300 dark:border-zinc-700",
  },
  touch_up: {
    label: "Touch-ups",
    description: "Secondary touch-up pass, refinement & pigment boost captures",
    badgeBg: "bg-[#C4FF61]/20 dark:bg-[#C4FF61]/25",
    badgeText: "text-[#1A1A1A] dark:text-[#C4FF61]",
    borderColor: "border-[#C4FF61]/60 dark:border-[#C4FF61]/40",
  },
};

export type MediaAssetWithDetails = {
  id: string;
  clientId: string;
  bookingId: string | null;
  sessionId: string | null;
  url: string;
  category: MediaCategory;
  caption: string | null;
  consentForMarketing: boolean;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    instagramHandle: string | null;
  } | null;
  booking?: {
    id: string;
    serviceType: string;
    placement: string | null;
    designDescription: string | null;
  } | null;
  session?: {
    id: string;
    sessionNumber: number;
    scheduledStart: string;
    status: string;
  } | null;
};

export type CreateMediaAssetInput = {
  clientId: string;
  bookingId?: string | null;
  sessionId?: string | null;
  url: string;
  category: MediaCategory;
  caption?: string | null;
  consentForMarketing?: boolean;
};
