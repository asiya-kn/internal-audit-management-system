import { useEffect, useState, type FormEvent } from 'react';
import type { UpdateProfileRequest } from '@iams/shared';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUpdateProfile } from '@/hooks/useSettings';

export function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const [values, setValues] = useState<UpdateProfileRequest>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
  });

  useEffect(() => {
    if (!user) return;
    setValues({ firstName: user.firstName, lastName: user.lastName, email: user.email });
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await updateProfile.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
      });
      await refreshUser();
      toast('Profile updated successfully', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to update profile', 'error');
    }
  }

  if (!user) return null;

  return (
    <section className="card space-y-5 p-6">
      <header>
        <h2 className="text-lg font-semibold text-neutral-900">Profile</h2>
        <p className="mt-1 text-sm text-neutral-500">Update your name and email address.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            autoComplete="given-name"
            maxLength={100}
            required
            value={values.firstName}
            onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))}
          />
          <Input
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            maxLength={100}
            required
            value={values.lastName}
            onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))}
          />
        </div>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={updateProfile.isPending}>Save profile</Button>
        </div>
      </form>
    </section>
  );
}