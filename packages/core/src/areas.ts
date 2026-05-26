export function normalizeArea(area: string): string {
  return area.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
}

export function normalizeAreas(areas: string[] | undefined): string[] {
  return Array.from(new Set((areas ?? []).map(normalizeArea).filter(Boolean))).sort();
}

export function overlappingAreas(left: string[] | undefined, right: string[] | undefined): string[] {
  const leftAreas = normalizeAreas(left);
  const rightAreas = normalizeAreas(right);
  const overlaps = new Set<string>();

  for (const a of leftAreas) {
    for (const b of rightAreas) {
      if (a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)) {
        overlaps.add(a.length <= b.length ? a : b);
      }
    }
  }

  return Array.from(overlaps).sort();
}
