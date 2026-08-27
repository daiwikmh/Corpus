import { AppProvider } from '../src/providers/wallet';
import { AuthGuard } from '../src/components/auth';
import { SmartAccountProvider } from '../src/providers/smart-account';
import { DashboardShell } from '../src/components/shell/DashboardShell';

const SIDEBAR_BOOT = `try{if(localStorage.getItem('sidebar-collapsed')==='1')document.documentElement.classList.add('sidebar-collapsed')}catch(e){}`;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <script dangerouslySetInnerHTML={{ __html: SIDEBAR_BOOT }} />

      <AppProvider>
        <AuthGuard>
          <SmartAccountProvider>
            <DashboardShell>{children}</DashboardShell>
          </SmartAccountProvider>
        </AuthGuard>
      </AppProvider>
    </>
  );
}
