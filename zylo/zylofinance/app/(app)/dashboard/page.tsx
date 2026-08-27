import Link from 'next/link';
import { PageHeader } from '../../src/components/shell/PageHeader';
import { PortfolioPanel } from '../../src/components/portfolio/PortfolioPanel';
import { ActivityList } from '../../src/components/portfolio/ActivityList';

const ACTIONS = [
  { href: '/fxrp', label: 'Mint FXRP', body: 'Bring XRP across to Flare' },
  { href: '/redeem', label: 'Redeem', body: 'Send FXRP back as XRP' },
  { href: '/analytics', label: 'Earn', body: 'Put FLR to work in the vault' },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Your assets on Flare" title="Portfolio" />

      <div className="mb-10 grid gap-px bg-white/10 sm:grid-cols-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group bg-black px-5 py-5 transition-colors hover:bg-white/[0.04]"
          >
            <p className="text-[15px] font-medium tracking-[-0.02em] uppercase">{action.label}</p>
            <p className="mt-2 text-[13px] text-white/40">{action.body}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PortfolioPanel />
        <ActivityList />
      </div>
    </>
  );
}
