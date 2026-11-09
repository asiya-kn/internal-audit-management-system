import { useAuth } from '@/context/AuthContext';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoading } from '@/components/ui/Spinner';
import { useSystemInfo } from '@/hooks/useSettings';

export function SystemSection() {
  const { hasPermission } = useAuth();

  if (!hasPermission('administration.settings.view')) return null;

  return <SystemInfo />;
}

function SystemInfo() {
  const { data, isLoading, isError, refetch } = useSystemInfo();

  return (
    <section className="card space-y-5 p-6">
      <header>
        <h2 className="text-lg font-semibold text-neutral-900">System information</h2>
        <p className="mt-1 text-sm text-neutral-500">Current application configuration.</p>
      </header>

      {isLoading ? (
        <PageLoading />
      ) : isError ? (
        <ErrorState message="Unable to load system information" onRetry={() => void refetch()} />
      ) : data ? (
        <dl className="divide-y divide-neutral-100">
          <SystemValue label="Environment" value={data.environment} />
          <SystemValue label="Session lifetime" value={`${data.sessionLifetimeHours} hours`} />
          <SystemValue label="Login rate limit" value={`${data.loginRateLimitMax} requests per 15 minutes`} />
          <SystemValue label="API rate limit" value={`${data.apiRateLimitMax} requests per window`} />
        </dl>
      ) : null}
    </section>
  );
}

function SystemValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-neutral-600">{label}</dt>
      <dd className="text-sm font-medium text-neutral-900">{value}</dd>
    </div>
  );
}