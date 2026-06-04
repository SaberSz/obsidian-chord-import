import { SiteAdapter } from "../types";
import { ultimateGuitarAdapter } from "./ultimateGuitar";
import { worshipTogetherAdapter } from "./worshipTogether";
import { pnwChordsAdapter } from "./pnwchords";

/**
 * Registry of site adapters. To support a new site, implement a SiteAdapter and
 * add it here — the rest of the pipeline (formatter, noteBuilder, modals) is
 * source-agnostic.
 */
const ADAPTERS: SiteAdapter[] = [ultimateGuitarAdapter, worshipTogetherAdapter, pnwChordsAdapter];

export function findAdapter(url: string): SiteAdapter | null {
  return ADAPTERS.find((a) => a.matches(url)) ?? null;
}
