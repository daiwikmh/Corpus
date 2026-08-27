import { PageHeader } from '../../src/components/shell/PageHeader';
import { MintFlow } from '../../src/components/mint/MintFlow';

export default function MintPage() {
  return (
    <>
      <PageHeader eyebrow="XRP to Flare" title="Mint FXRP" />
      <MintFlow />
    </>
  );
}
