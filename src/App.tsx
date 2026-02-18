import { AppShell } from '@/components/layout/AppShell.tsx';
import { AppErrorBoundary } from '@/components/shared/AppErrorBoundary.tsx';

export default function App() {
  return (
    <AppErrorBoundary>
      <AppShell />
    </AppErrorBoundary>
  );
}
