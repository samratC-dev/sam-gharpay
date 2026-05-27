import {
  Outlet,
  Link,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { AppProvider as MYTAppProvider } from "@/myt/lib/app-context";
import { SettingsProvider as MYTSettingsProvider } from "@/myt/lib/settings-context";
import { TourDataProvider as MYTTourDataProvider } from "@/myt/lib/tour-data-context";
import { OwnerProvider } from "@/owner/owner-context";
import { OnboardingWalkthrough } from "@/components/OnboardingWalkthrough";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <MYTSettingsProvider>
        <MYTTourDataProvider>
          <MYTAppProvider>
            <OwnerProvider>
              <Outlet />
              <Toaster />
              <KeyboardShortcuts />
              <OnboardingWalkthrough />
            </OwnerProvider>
          </MYTAppProvider>
        </MYTTourDataProvider>
      </MYTSettingsProvider>
    </QueryClientProvider>
  );
}
