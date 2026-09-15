export const docsGroups = [
  {
    title: "Getting started",
    pages: [
      { url: "/docs", title: "Introduction" },
      { url: "/docs/installation", title: "Installation" },
    ],
  },
  {
    title: "Table",
    pages: [
      { url: "/docs/components/table", title: "Overview" },
      { url: "/docs/table/columns", title: "Columns & rendering" },
      { url: "/docs/table/layout", title: "Layout & sizing" },
      { url: "/docs/table/data", title: "Data & queries" },
      { url: "/docs/table/selection", title: "Selection & clipboard" },
      { url: "/docs/table/preferences", title: "Preferences & saved views" },
      { url: "/docs/table/performance", title: "Performance" },
      { url: "/docs/table/api", title: "API reference" },
    ],
  },
  {
    title: "Filters",
    pages: [
      { url: "/docs/components/filters", title: "Overview" },
      { url: "/docs/defaults", title: "Behavior & defaults" },
      { url: "/docs/system", title: "Definitions & state" },
      { url: "/docs/advanced", title: "Async & custom editors" },
      { url: "/docs/examples", title: "Composition examples" },
      { url: "/docs/api", title: "API reference" },
    ],
  },
  {
    title: "Sheet",
    pages: [{ url: "/docs/components/sheet", title: "Overview & API" }],
  },
  {
    title: "Shared",
    pages: [
      { url: "/docs/localization", title: "Localization" },
      { url: "/docs/customization", title: "Styling & theming" },
      { url: "/docs/accessibility", title: "Keyboard & accessibility" },
    ],
  },
];
export const docsPages = docsGroups.flatMap((group) =>
  group.pages.map((page) => ({ ...page, group: group.title })),
);
