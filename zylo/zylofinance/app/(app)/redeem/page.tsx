import { PageHeader } from '../../src/components/shell/PageHeader';
import { RedeemCard } from '../../src/components/redeem/RedeemCard';

export default function RedeemPage() {
  return (
    <>
      <PageHeader eyebrow="Flare to XRP" title="Redeem" />
      <div className="max-w-xl">
        <RedeemCard />
      </div>
    </>
  );
}
