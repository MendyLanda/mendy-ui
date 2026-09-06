// Source-derived type fixture, not production validation.
// External identifier validators are modeled as strings; full SimCall dependencies are absent.
import { z } from "zod";
export const lineStatuses = [
  "active",
  "canceled",
  "suspended_internally",
  "suspended_by_carrier",
  "ported_out",
  "ported_internally",
] as const;
export const lineBillingModels = ["prepaid", "postpaid"] as const;
export const lineCarrierPlanType = ["voice", "tablet", "other", "router"] as const;
export const lineCarrierPlanTier = ["regular", "premium"] as const;
export const staticIpStatuses = ["enabled", "disabled", "unknown", "not_applicable"] as const;
export const hdStreamingStatuses = ["enabled", "disabled", "not_applicable", "unknown"] as const;
export const roamingStatuses = ["enabled", "disabled", "not_applicable", "unknown"] as const;
export const autopayStatuses = ["enabled", "disabled", "unknown", "not_applicable"] as const;
const asArray = <T extends z.ZodType>(schema: T) => z.array(schema);
const zodICCIDOrEID = () => z.string();
const zodMdn = z.string();
const zodImei = z.string();
export const LinesFiltersSchema = z.object({
  q: asArray(z.string()).optional().describe("Search by MDN, ICCID, or ID"),

  // Carrier filters
  carrierId: z.array(z.string()).optional(),
  billingModel: z.enum(lineBillingModels).optional(),

  iccid: z.array(zodICCIDOrEID()).optional(),
  mdn: z.array(zodMdn).optional(),
  id: z.array(z.string()).optional(),
  imei: z.array(zodImei).optional(),

  // Status filters
  status: z.array(z.enum(lineStatuses)).optional(),

  // Plan filters
  carrierPlanId: z.array(z.string()).optional(),
  carrierPlanType: z.array(z.enum(lineCarrierPlanType)).optional(),
  carrierPlanTier: z.enum(lineCarrierPlanTier).nullish(),

  // Activation date filters
  activeStart: z.iso.date().optional(),
  activeEnd: z.iso.date().optional(),

  // Vendor & Company filters
  vendorId: z.array(z.string()).optional(),
  vendorCompanyId: z.array(z.string()).optional(),

  // Subscription filters
  hasSubscription: z.enum(["with", "without"]).optional(),
  resellerId: z.array(z.string()).optional(),
  subscriptionPlanId: z.array(z.string()).optional(),

  // Report filters
  report: z.enum(["simbank5gMissingFromServers"]).optional(),

  // Group filters
  groupMemberCount: z.tuple([z.number(), z.number()]).optional(),
  lineGroupId: z.array(z.string()).optional(),

  // Tag filters
  tagId: z.array(z.string()).optional(),
  hasTag: z.enum(["with", "without"]).optional(),

  // Pending port/swap filters
  hasPendingPort: z.enum(["with", "without"]).optional(),
  hasPendingSwap: z.enum(["with", "without"]).optional(),

  // Advanced filters
  staticIpStatus: z.enum(staticIpStatuses).optional(),
  autopayStatus: z.enum(autopayStatuses).optional(),
  hdStreamingStatus: z.enum(hdStreamingStatuses).optional(),
  roamingStatus: z.enum(roamingStatuses).optional(),
  renewalDatePreset: z.enum(["today", "yesterday", "thisWeek"]).optional(),
  accountType: asArray(z.string()).optional().nullable(),

  /**
   * Controls how the ICCID/MDN filters (explicit `iccid`/`mdn` arrays AND the
   * omni-search `q` tokens that look like an ICCID/MDN) treat *historical*
   * (closed) assignment rows.
   *
   * - `"exclude"` (default): only match lines whose *active* assignment row
   *   matches the input. This is the safe, conservative behavior — every
   *   non-UI caller (analytics, audits, statement importers, internal
   *   procedures, exports) gets this and only ever sees lines that *currently*
   *   carry the requested identifier.
   * - `"include"`: match active OR historical assignment rows. Use this when
   *   the caller wants to know about lines whose identifier was swapped/ported
   *   away — e.g. the lines page so a bulk paste of 50 ICCIDs surfaces matches
   *   that are no longer the current ICCID.
   * - `"only"`: match lines whose ONLY matching assignment is historical
   *   (i.e. the current iccid/mdn does NOT match the input). Used by the
   *   lines-page toolbar to narrow the result to "indirect matches" so the
   *   operator can review/filter them out of a bulk action.
   */
  historicalMatchMode: z.enum(["exclude", "include", "only"]).optional(),
});
type LinesFiltersSchema = z.infer<typeof LinesFiltersSchema>;
export type LineFilters = Omit<
  {
    [K in keyof LinesFiltersSchema]: Exclude<LinesFiltersSchema[K], undefined> | null;
  },
  "groupMemberCount"
> & {
  groupMemberCount?: number[] | null;
};
