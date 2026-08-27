import { PageHeader } from '../../src/components/shell/PageHeader';
import { SendCard } from '../../src/components/send/SendCard';

export default function SendPage() {
  return (
    <>
      <PageHeader eyebrow="Move assets" title="Send" />
      <div className="max-w-xl">
        <SendCard />
      </div>
    </>
  );
}
