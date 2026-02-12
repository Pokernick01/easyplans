import { useEffect } from 'react';
import { TopBar } from './TopBar.tsx';
import { LeftSidebar } from './LeftSidebar.tsx';
import { CanvasArea } from './CanvasArea.tsx';
import { RightSidebar } from './RightSidebar.tsx';
import { BottomBar } from './BottomBar.tsx';
import { ExportDialog } from '@/components/dialogs/ExportDialog.tsx';
import SupportDialog from '@/components/dialogs/SupportDialog.tsx';
import { useUIStore } from '@/store/ui-store.ts';
import { useProjectStore } from '@/store/project-store.ts';

export function AppShell() {
  const exportDialogOpen = useUIStore((s) => s.exportDialogOpen);
  const supportDialogOpen = useUIStore((s) => s.supportDialogOpen);
  const isMobile = useUIStore((s) => s.isMobile);
  const setIsMobile = useUIStore((s) => s.setIsMobile);

  // Auto-load saved project from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('easyplans-project');
      if (saved) {
        const data = JSON.parse(saved);
        useProjectStore.getState().loadProject(data);
      }
    } catch (e) {
      console.warn('Failed to load saved project from localStorage:', e);
    }
  }, []);

  // Auto-save project to localStorage with 2s debounce
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useProjectStore.subscribe(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          const json = useProjectStore.getState().getProjectJSON();
          localStorage.setItem('easyplans-project', json);
        } catch (e) {
          console.warn('Failed to auto-save project to localStorage:', e);
        }
      }, 2000);
    });

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Listen for viewport size changes
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (e.matches) {
        // Auto-collapse sidebars on mobile
        const state = useUIStore.getState();
        if (state.rightSidebarOpen) state.toggleRightSidebar();
        if (state.leftSidebarOpen) state.toggleLeftSidebar();
      }
    };
    mq.addEventListener('change', handler);
    // Initial check
    if (mq.matches !== isMobile) {
      setIsMobile(mq.matches);
    }
    return () => mq.removeEventListener('change', handler);
  }, [setIsMobile, isMobile]);

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#f4f1ec' }}>
      <TopBar />
      <div className="flex flex-1 overflow-hidden" style={{ minWidth: 0 }}>
        <LeftSidebar />
        <CanvasArea />
        <RightSidebar />
      </div>
      <BottomBar />
      {exportDialogOpen && <ExportDialog />}
      {supportDialogOpen && <SupportDialog />}
    </div>
  );
}
