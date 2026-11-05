import { useAuth } from '@/context/AuthContext';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { PasswordSection } from '@/components/settings/PasswordSection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { SystemSection } from '@/components/settings/SystemSection';

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const canViewSystem = hasPermission('administration.settings.view');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your account details, password, and display preferences.
        </p>
      </header>

      <ProfileSection />
      <PasswordSection />
      <PreferencesSection />
      {canViewSystem && <SystemSection />}
    </div>
  );
}
