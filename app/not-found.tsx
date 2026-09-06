import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-32">
      <p className="mb-4 font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-medium tracking-tight">Page not found</h1>
      <p className="my-5 text-muted-foreground">This page may have moved.</p>
      <Link href="/docs" className="underline underline-offset-4">
        Browse the documentation
      </Link>
    </div>
  );
}
