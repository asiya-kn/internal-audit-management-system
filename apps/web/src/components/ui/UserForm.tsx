import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronDown } from 'lucide-react';
import type { CreateAdminUserRequest, AdminUserDetailDto, RoleDto } from '@iams/shared';

interface UserFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: Partial<AdminUserDetailDto>;
  roles: RoleDto[];
  onSubmit: (values: CreateAdminUserRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  serverError?: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  roleIds: string[];
  isActive: boolean;
}

function buildInitial(values: Partial<AdminUserDetailDto> | undefined): FormState {
  return {
    firstName: values?.firstName ?? '',
    lastName: values?.lastName ?? '',
    email: values?.email ?? '',
    password: '',
    confirmPassword: '',
    roleIds: values?.roles?.map((r) => r.id) ?? [],
    isActive: values?.isActive ?? true,
  };
}

export function UserForm({
  open,
  mode,
  initialValues,
  roles,
  onSubmit,
  onCancel,
  loading,
  serverError,
}: UserFormProps) {
  const [state, setState] = useState<FormState>(() => buildInitial(initialValues));
  const [showPassword, setShowPassword] = useState(false);

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setState(buildInitial(initialValues));
      setShowPassword(false);
    }
  }

  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!state.firstName.trim()) errors.firstName = 'First name is required';
  if (!state.lastName.trim()) errors.lastName = 'Last name is required';
  if (!state.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) errors.email = 'A valid email is required';
  if (mode === 'create' && !state.password) errors.password = 'Password is required';
  if (state.password && state.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (state.password && state.password !== state.confirmPassword) errors.confirmPassword = 'Passwords do not match';

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function toggleRole(roleId: string) {
    setState((s) => ({
      ...s,
      roleIds: s.roleIds.includes(roleId)
        ? s.roleIds.filter((id) => id !== roleId)
        : [...s.roleIds, roleId],
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;
    const payload: CreateAdminUserRequest = {
      firstName: state.firstName.trim(),
      lastName: state.lastName.trim(),
      email: state.email.trim().toLowerCase(),
      password: state.password,
      roleIds: state.roleIds,
      isActive: state.isActive,
    };
    onSubmit(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === 'create' ? 'Add User' : 'Edit User'}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          {serverError && <span className="text-xs text-error-600">{serverError}</span>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
            <Button type="submit" form="user-form" loading={loading}>
              {mode === 'create' ? 'Create User' : 'Save Changes'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            name="firstName"
            value={state.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            error={errors.firstName}
            required
          />
          <Input
            label="Last Name"
            name="lastName"
            value={state.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            error={errors.lastName}
            required
          />
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          value={state.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
          placeholder="user@example.com"
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="user-password" className="label">
              {mode === 'create' ? 'Password' : 'New Password'}
              {mode === 'edit' && <span className="ml-1 text-xs font-normal text-neutral-400">(leave blank to keep current)</span>}
            </label>
            <input
              id="user-password"
              type={showPassword ? 'text' : 'password'}
              className={`input ${errors.password ? 'border-error-500' : ''}`}
              value={state.password}
              onChange={(e) => update('password', e.target.value)}
              autoComplete="new-password"
            />
            {errors.password && <p className="mt-1 text-xs text-error-600">{errors.password}</p>}
          </div>
          <div>
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={state.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          Show password
        </label>

        <div>
          <span className="label">Roles</span>
          <div className="mt-1 space-y-2 rounded-lg border border-neutral-200 p-3">
            {roles.length === 0 ? (
              <p className="text-sm text-neutral-400">No roles available.</p>
            ) : (
              roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    checked={state.roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <span className="font-medium">{role.name}</span>
                  {role.description && (
                    <span className="text-xs text-neutral-400">— {role.description}</span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          <label htmlFor="user-active" className="label">Account Status</label>
          <div className="relative">
            <select
              id="user-active"
              className="input appearance-none pr-9"
              value={state.isActive ? 'true' : 'false'}
              onChange={(e) => update('isActive', e.target.value === 'true')}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
      </form>
    </Modal>
  );
}
