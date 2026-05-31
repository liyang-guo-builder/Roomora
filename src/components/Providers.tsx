"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FlowProvider } from "./flow/FlowProvider";
import { AppShell } from "./flow/AppShell";

/**
 * Client providers wrapping the whole app: TanStack Query (used by the
 * generation job in Phase 3) + the flow controller + the mobile shell
 * (header, bottom nav, modal overlays). The Zustand store is a module
 * singleton and needs no provider.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <FlowProvider>
        <AppShell>{children}</AppShell>
      </FlowProvider>
    </QueryClientProvider>
  );
}
