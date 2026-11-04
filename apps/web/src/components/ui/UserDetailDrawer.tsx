import { Modal } from './Modal';
import { Button } from './Button';
import { Mail, User as UserIcon, Shield, Clock, CheckCircle2, XCircle, Key } from 'lucide-react';
import type { AdminUserDetailDto } from '@iams/shared';

interface UserDetailDrawerProps {
  open: boolean;
  user: AdminUserDetailDto | null;
  loading?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export function UserDetailDrawer({ open, user, loading, onClose, onEdit, canEdit }: UserDetailDrawerProps) {
  return (
    <Modal open={open} onClose={onClose} title="User Details" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : user ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${user.isActive ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-600'}`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
            {user.roles.map((role) => (
              <span key={role.id} className="badge bg-primary-50 text-primary-700">
                {role.name}
              </span>
            ))}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              {user.firstName} {user.lastName}
            </h3>
          </div>

          <dl className="divide-y divide-neutral-100">
            <div className="flex items-start gap-3 py-2">
              <Mail className="mt-0.5 h-4 w-4 text-neutral-400" />
              <div>
                <dt className="text-xs font-medium text-neutral-500">Email</dt>
                <dd className="mt-0.5 break-words text-sm text-neutral-900">{user.email}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2">
              <UserIcon className="mt-0.5 h-4 w-4 text-neutral-400" />
              <div>
                <dt className="text-xs font-medium text-neutral-500">Name</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">{user.firstName} {user.lastName}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2">
              {user.isActive ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-success-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 text-neutral-400" />
              )}
              <div>
                <dt className="text-xs font-medium text-neutral-500">Account Status</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">{user.isActive ? 'Active' : 'Inactive'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2">
              <Clock className="mt-0.5 h-4 w-4 text-neutral-400" />
              <div>
                <dt className="text-xs font-medium text-neutral-500">Last Login</dt>
                <dd className="mt-0.5 text-sm text-neutral-900">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                </dd>
              </div>
            </div>
          </dl>

          <div>
            <h4 className="text-sm font-semibold text-neutral-900">Roles & Permissions</h4>
            <div className="mt-2 space-y-2">
              {user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <div key={role.id} className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary-600" />
                      <span className="text-sm font-medium text-neutral-900">{role.name}</span>
                    </div>
                    {role.description && (
                      <p className="mt-1 text-xs text-neutral-500">{role.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-400">No roles assigned.</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Key className="h-4 w-4 text-neutral-400" />
              Effective Permissions ({user.permissions.length})
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.permissions.length > 0 ? (
                user.permissions.map((perm) => (
                  <span key={perm} className="badge bg-neutral-100 text-neutral-700">
                    {perm}
                  </span>
                ))
              ) : (
                <p className="text-sm text-neutral-400">No permissions granted.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-neutral-500">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(user.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span>{' '}
              {new Date(user.updatedAt).toLocaleString()}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {canEdit && onEdit && (
              <Button variant="primary" onClick={onEdit}>Edit</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-neutral-500">
          User details could not be loaded.
        </div>
      )}
    </Modal>
  );
}
