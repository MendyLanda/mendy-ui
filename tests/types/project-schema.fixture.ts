// Synthetic application state for typed binding checks.
import { z } from "zod";
export const projectStatuses = ["active", "paused", "archived"] as const;
const ProjectFiltersSchema = z.object({
  q: z.array(z.string()).optional(),
  workspaceId: z.array(z.string()).optional(),
  status: z.array(z.enum(projectStatuses)).optional(),
  createdAfter: z.iso.date().optional(),
  createdBefore: z.iso.date().optional(),
  tagId: z.array(z.string()).optional(),
  hasTag: z.enum(["with", "without"]).optional(),
  memberCount: z.tuple([z.number(), z.number()]).optional(),
});
type ProjectFiltersSchema = z.infer<typeof ProjectFiltersSchema>;
export type ProjectFilters = Omit<
  {
    [K in keyof ProjectFiltersSchema]: Exclude<ProjectFiltersSchema[K], undefined> | null;
  },
  "memberCount"
> & { memberCount?: number[] | null };
