"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("@/components/AppShell"), {
  ssr: false,
  loading: () => (
    <main className="flex h-[100dvh] w-full items-center justify-center bg-black">
      <div className="h-2 w-2 animate-pulse rounded-full bg-[#ff2a2a]/60" />
    </main>
  ),
});

export default function ClientEntry() {
  return <AppShell />;
}
