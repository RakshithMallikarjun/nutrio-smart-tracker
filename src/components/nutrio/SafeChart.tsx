import { Component, Suspense, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";

function ChartSkeleton() {
  return (
    <div
      className="h-full w-full animate-pulse rounded-2xl"
      style={{ backgroundColor: "#eeebe3" }}
      aria-hidden
    />
  );
}

function ChartErrorFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-2xl px-4 text-center text-xs font-bold"
      style={{ backgroundColor: "#eeebe3", color: "#171e19" }}
      role="alert"
    >
      Chart unavailable. Try refreshing the page.
    </div>
  );
}

class ChartErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[SafeChart] render failed:", error);
  }
  render() {
    if (this.state.hasError) return <ChartErrorFallback />;
    return this.props.children;
  }
}

/**
 * SSR-safe chart wrapper.
 * - ClientOnly: avoids recharts ResizeObserver/SSR issues
 * - Suspense: lets children use React.lazy to defer recharts modules
 * - ErrorBoundary: friendly fallback if anything in the chart throws
 */
export function SafeChart({
  height,
  children,
}: {
  height: number | string;
  children: ReactNode;
}) {
  return (
    <div style={{ height }}>
      <ChartErrorBoundary>
        <ClientOnly fallback={<ChartSkeleton />}>
          <Suspense fallback={<ChartSkeleton />}>{children}</Suspense>
        </ClientOnly>
      </ChartErrorBoundary>
    </div>
  );
}
