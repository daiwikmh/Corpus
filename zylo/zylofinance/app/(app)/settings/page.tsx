import { PageHeader } from '../../src/components/shell/PageHeader';
import { SettingsPanel } from '../../src/components/settings/SettingsPanel';

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Account and network" title="Settings" />
      <div className="max-w-2xl">
        <SettingsPanel />
      </div>
    </>
  );
}
