import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { FilterBar, MendyUIProvider, defineFilters, filter } from "@mendylanda/ui";
import { useUrlFilters } from "@mendylanda/ui/filters/nuqs";
import { he } from "@mendylanda/ui/locales/he";
const definitions = defineFilters({
  city: filter.multiSelect({
    label: "עיר",
    options: ["אופקים", "ירושלים"].map((value) => ({ value, label: value })),
  }),
  range: filter.numberRange({ label: "טווח" }),
  text: filter.text({ label: "טקסט" }),
});
function UrlFiltersFixture() {
  const filters = useUrlFilters(definitions, { scope: "router-fixture", history: "push" });
  return (
    <main>
      <FilterBar filters={filters} />
      <button onClick={() => filters.set("city", ["אופקים"])}>One city</button>
      <button onClick={() => filters.set("city", ["אופקים", "ירושלים"])}>Two cities</button>
      <button onClick={() => filters.set("range", [10, 20])}>Range</button>
      <button onClick={() => filters.set("text", '["literal"]')}>JSON text</button>
      <button onClick={() => filters.clear()}>Clear fixture</button>
      <output data-values="">{JSON.stringify(filters.values)}</output>
    </main>
  );
}
const rootRoute = createRootRoute({
  component: () => (
    <NuqsAdapter>
      <MendyUIProvider locale={he}>
        <Outlet />
      </MendyUIProvider>
    </NuqsAdapter>
  ),
});
const route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: UrlFiltersFixture,
});
const router = createRouter({ routeTree: rootRoute.addChildren([route]) });
export function UrlRouterFixture() {
  return <RouterProvider router={router} />;
}
