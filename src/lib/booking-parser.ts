export type ParsedIntake = {
  timeline?: string;
  instagram?: string;
  city?: string;
  gender?: string;
  dob?: string;
  placement?: string;
  notes?: string;
  design?: string;
  rawText: string;
};

export function parseBookingDetails(text: string | null | undefined): ParsedIntake {
  if (!text) {
    return { rawText: "" };
  }

  const rawText = text.trim();
  const result: ParsedIntake = { rawText };

  // Match specific lines
  const timelineMatch = rawText.match(/^Timeline:\s*(.+)$/m);
  if (timelineMatch) result.timeline = timelineMatch[1].trim();

  const instaMatch = rawText.match(/^Instagram:\s*(.+)$/m);
  if (instaMatch) {
    let handle = instaMatch[1].trim();
    if (handle.startsWith("@")) handle = handle.slice(1);
    result.instagram = handle;
  }

  const cityMatch = rawText.match(/^City:\s*(.+)$/m);
  if (cityMatch) result.city = cityMatch[1].trim();

  const genderMatch = rawText.match(/^Gender:\s*(.+)$/m);
  if (genderMatch) result.gender = genderMatch[1].trim();

  const dobMatch = rawText.match(/^DOB:\s*(.+)$/m);
  if (dobMatch) result.dob = dobMatch[1].trim();

  const placementMatch = rawText.match(/^Placement:\s*(.+)$/m);
  if (placementMatch) result.placement = placementMatch[1].trim();

  const notesMatch = rawText.match(/^Notes:\s*([\s\S]*?)(?=\n\n(?:Design:|$)|$)/m);
  if (notesMatch) result.notes = notesMatch[1].trim();

  const designMatch = rawText.match(/^Design:\s*([\s\S]*)$/m);
  if (designMatch) {
    result.design = designMatch[1].trim();
  } else if (!result.timeline && !result.city && !result.instagram) {
    // If none of the prefixes matched, the whole text is the design description
    result.design = rawText;
  }

  return result;
}

export function formatPaise(paise: string | bigint | number | null | undefined, currency = "INR"): string {
  if (paise == null) return "—";
  const num = typeof paise === "bigint" ? Number(paise) : Number(paise);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num / 100);
}
