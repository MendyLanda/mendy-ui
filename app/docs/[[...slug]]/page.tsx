import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { mdxComponents } from "@/mdx-components";
import { SITE } from "@/constants/site";

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => source.generateParams();

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: page.url },
  };
}

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const Content = page.data.body;
  return (
    <div className="grid min-w-0 gap-12 xl:grid-cols-[minmax(0,1fr)_150px]">
      <article className="min-w-0 pb-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{page.data.title}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{page.data.description}</p>
        </header>
        <Content components={mdxComponents} />
        <div className="mt-12 border-t pt-6 text-xs text-muted-foreground">
          <a
            href={`${SITE.github}/edit/main/content/docs/${page.path}`}
            className="hover:text-foreground"
          >
            Edit this page on GitHub ↗
          </a>
        </div>
      </article>
      <aside
        aria-label="On this page"
        className="hidden xl:sticky xl:top-28 xl:block xl:self-start"
      >
        <p className="mb-4 text-xs font-medium">On this page</p>
        <ul className="space-y-3">
          {page.data.toc
            .filter((item) => item.depth === 2)
            .map((item) => (
              <li key={item.url}>
                <a
                  className="text-xs leading-5 text-muted-foreground hover:text-foreground"
                  href={item.url}
                >
                  {item.title}
                </a>
              </li>
            ))}
        </ul>
      </aside>
    </div>
  );
}
