import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";

export type TableColumn<T extends object> = ColumnDef<DataTableFeatures, T> & {
  label?: string;
  align?: "start" | "center" | "end";
  /** Share of spare viewport width. Defaults to 1 for data columns, false for display columns. */
  grow?: number | false;
  defaultHidden?: boolean;
  pin?: "start" | "end";
  copyValue?: (row: T) => string;
  getCellValue?: (row: T) => string | null;
  exportOptions?:
    | { header: string; value: (row: T) => string }
    | { header: string; value: (row: T) => string }[]
    | false;
};

type Paths<T extends object, D extends unknown[] = []> = D["length"] extends 5
  ? never
  : {
      [K in keyof T & string]: NonNullable<T[K]> extends Date | readonly unknown[]
        ? K
        : NonNullable<T[K]> extends object
          ? K | `${K}.${Paths<NonNullable<T[K]>, [...D, 0]>}`
          : K;
    }[keyof T & string];
type At<T extends object, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? At<NonNullable<T[K]>, R> | Extract<T[K], null | undefined>
    : never
  : P extends keyof T
    ? T[P]
    : never;
export interface ValueFormat<V> {
  display: (value: V) => ReactNode;
  text: (value: V) => string;
  align?: "start" | "center" | "end";
}
interface ValueOptions<T extends object, V> {
  label: string;
  size?: number;
  grow?: number | false;
  minSize?: number;
  maxSize?: number;
  hidden?: boolean;
  pin?: "start" | "end";
  sortable?: boolean;
  format?: ValueFormat<NonNullable<V>>;
  render?: (context: { row: T; value: V }) => ReactNode;
  copy?: (value: V, row: T) => string;
  export?: false | ((value: V, row: T) => string);
}
function valueColumn<T extends object, V>(
  id: string,
  value: (row: T) => V,
  options: ValueOptions<T, V>,
): TableColumn<T> {
  const text = (row: T) => {
    const v = value(row);
    return v == null ? "" : (options.format?.text(v as NonNullable<V>) ?? String(v));
  };
  return {
    id,
    accessorFn: value,
    header: options.label,
    label: options.label,
    size: options.size,
    grow: options.grow,
    minSize: options.minSize,
    maxSize: options.maxSize,
    defaultHidden: options.hidden,
    pin: options.pin,
    align: options.format?.align,
    enableSorting: options.sortable ?? true,
    cell: ({ row }) => {
      const v = value(row.original);
      return options.render
        ? options.render({ row: row.original, value: v })
        : v == null
          ? "—"
          : (options.format?.display(v as NonNullable<V>) ?? String(v));
    },
    copyValue: options.copy ? (row) => options.copy!(value(row), row) : text,
    exportOptions:
      options.export === false
        ? false
        : {
            header: options.label,
            value:
              typeof options.export === "function"
                ? (row) => (options.export as (v: V, row: T) => string)(value(row), row)
                : text,
          },
  };
}
interface ColumnBuilder<T extends object> {
  accessor<P extends Paths<T>>(path: P, options: ValueOptions<T, At<T, P>>): TableColumn<T>;
  computed<V>(id: string, value: (row: T) => V, options: ValueOptions<T, V>): TableColumn<T>;
  display(
    id: string,
    options: {
      label: string;
      render: (row: T) => ReactNode;
      size?: number;
      minSize?: number;
      maxSize?: number;
      grow?: number | false;
      pin?: "start" | "end";
    },
  ): TableColumn<T>;
}
export function defineColumns<T extends object>(
  define: (column: ColumnBuilder<T>) => TableColumn<T>[],
): TableColumn<T>[] {
  return define({
    accessor: (path, options) =>
      valueColumn(
        path,
        (row) =>
          path
            .split(".")
            .reduce<unknown>(
              (v, key) => (v == null ? undefined : (v as Record<string, unknown>)[key]),
              row,
            ) as At<T, typeof path>,
        options,
      ),
    computed: valueColumn,
    display: (id, options) => ({
      id,
      label: options.label,
      header: options.label,
      size: options.size,
      minSize: options.minSize,
      maxSize: options.maxSize,
      grow: options.grow ?? false,
      pin: options.pin,
      enableSorting: false,
      enableCellSelection: false,
      cell: ({ row }) => options.render(row.original),
      exportOptions: false,
    }),
  });
}
export const format = {
  currency(currency: string, locale?: string): ValueFormat<number> {
    // react-doctor-disable-next-line react-doctor/js-hoist-intl -- Formatter factories run when defining columns; their closures reuse this instance for every cell.
    const formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
    return { display: formatter.format, text: formatter.format, align: "end" };
  },
  number(options?: Intl.NumberFormatOptions, locale?: string): ValueFormat<number> {
    // react-doctor-disable-next-line react-doctor/js-hoist-intl -- Formatter factories run when defining columns; their closures reuse this instance for every cell.
    const formatter = new Intl.NumberFormat(locale, options);
    return { display: formatter.format, text: formatter.format, align: "end" };
  },
  date(options?: Intl.DateTimeFormatOptions, locale?: string): ValueFormat<Date> {
    // react-doctor-disable-next-line react-doctor/js-hoist-intl -- Formatter factories run when defining columns; their closures reuse this instance for every cell.
    const formatter = new Intl.DateTimeFormat(locale, options);
    return { display: formatter.format, text: formatter.format };
  },
};
