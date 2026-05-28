import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { PropertyHealthDashboard } from '@/components/PropertyHealthDashboard';

export const Route = createFileRoute('/owners')({
  head: () => ({ meta: [{ title: 'Property Health Dashboard — Gharpayy' }] }),
  component: () => <AppShell><PropertyHealthDashboard /></AppShell>,
});
