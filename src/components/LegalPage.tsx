import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

/** Shared chrome for the long-form legal pages (Terms, Privacy): logo header,
 *  readable centered column, nested-element styling so pages write plain h2/p/ul. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line/70">
        <div className="max-w-[760px] mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Roomora home">
            <Logo size={30} />
          </Link>
          <Link href="/" className="text-[13px] font-medium text-sage">
            Back to app
          </Link>
        </div>
      </header>
      <main className="max-w-[760px] mx-auto px-5 py-10">
        <h1 className="text-[28px] font-semibold tracking-[-.02em] text-ink">{title}</h1>
        <p className="mt-1 text-[13px] text-ink-3">Last updated: {updated}</p>
        <div className="mt-7 space-y-5 text-[14.5px] leading-relaxed text-ink-2 [&_a]:text-sage [&_a]:underline [&_h2]:mt-2 [&_h2]:mb-1.5 [&_h2]:text-[16.5px] [&_h2]:font-semibold [&_h2]:text-ink [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
        <p className="mt-12 text-[12px] text-ink-3">Roomora · Made in Paris</p>
      </main>
    </div>
  );
}
