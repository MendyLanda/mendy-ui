import type { DataTableInstance } from "@mendylanda/ui/table";

export type PerformanceHarnessWindow = Window & {
  metrics: { renders: number };
  table: DataTableInstance<{ id: string; value: number }>;
  copySelection: () => string;
};
