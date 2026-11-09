import { useState, type FormEvent } from 'react';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useChangePassword } from '@/hooks/useSettings';

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyValues: PasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function PasswordSection() {
  const { toast } = useToast();
  const changePassword = useChangePassword();
  const [values, setValues] = useState<PasswordValues>(emptyValues);
  const passwordMismatch = values.confirmPassword.length > 0 && values.newPassword !== values.confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (values.newPassword !== values.confirmPassword) return;

    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setValues(emptyValues);
      toast('Password changed successfully', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to change password', 'error');
    }
  }

  return (
    <section className="card space-y-5 p-6">
      <header>
        <h2 className="text-lg font-semibold text-neutral-900">Password</h2>
        <p className="mt-1 text-sm text-neutral-500">Choose a new password for your account.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={values.currentPassword}
          onChange={(event) => setValues((current) => ({ ...current, currentPassword: event.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            value={values.newPassword}
            onChange={(event) => setValues((current) => ({ ...current, newPassword: event.target.value }))}
          />
          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            error={passwordMismatch ? 'Passwords do not match' : undefined}
            value={values.confirmPassword}
            onChange={(event) => setValues((current) => ({ ...current, confirmPassword: event.target.value }))}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={changePassword.isPending}>Change password</Button>
        </div>
      </form>
    </section>
  );
}