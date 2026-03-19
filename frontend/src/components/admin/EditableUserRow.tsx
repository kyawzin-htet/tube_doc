import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { AdminUser } from '../../types/app';

interface EditableUserRowProps {
  user: AdminUser;
  onSave: (id: string, payload: Record<string, unknown>) => Promise<void>;
}

export function EditableUserRow({ user, onSave }: EditableUserRowProps) {
  const [form, setForm] = useState({
    role: user.role,
    plan: user.plan,
    dailyTranslationLimit: String(user.dailyTranslationLimit),
    tokenBalance: String(user.tokenBalance),
    tokenCap: String(user.tokenCap),
    isRestricted: user.isRestricted,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(user.id, {
        role: form.role,
        plan: form.plan,
        dailyTranslationLimit: Number(form.dailyTranslationLimit),
        tokenBalance: Number(form.tokenBalance),
        tokenCap: Number(form.tokenCap),
        isRestricted: form.isRestricted,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="admin-user-row">
      <td>
        <div className="table-title">{user.name || user.email}</div>
        <div className="table-subtitle">{user.email}</div>
      </td>
      <td>
        <select
          className="admin-select admin-select-role"
          value={form.role}
          onChange={(event) =>
            setForm((current) => ({ ...current, role: event.target.value as 'USER' | 'ADMIN' }))
          }
        >
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </td>
      <td>
        <select
          className="admin-select admin-select-plan"
          value={form.plan}
          onChange={(event) =>
            setForm((current) => ({ ...current, plan: event.target.value as 'FREE' | 'PREMIUM' }))
          }
        >
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium</option>
        </select>
      </td>
      <td>
        <input
          className="admin-input admin-input-short"
          type="number"
          min="0"
          inputMode="numeric"
          value={form.dailyTranslationLimit}
          onChange={(event) =>
            setForm((current) => ({ ...current, dailyTranslationLimit: event.target.value }))
          }
        />
      </td>
      <td>
        <input
          className="admin-input admin-input-medium"
          type="number"
          min="0"
          inputMode="numeric"
          value={form.tokenBalance}
          onChange={(event) =>
            setForm((current) => ({ ...current, tokenBalance: event.target.value }))
          }
        />
      </td>
      <td>
        <input
          className="admin-input admin-input-medium"
          type="number"
          min="0"
          inputMode="numeric"
          value={form.tokenCap}
          onChange={(event) => setForm((current) => ({ ...current, tokenCap: event.target.value }))}
        />
      </td>
      <td>
        <label className="checkbox admin-checkbox">
          <input
            type="checkbox"
            checked={form.isRestricted}
            onChange={(event) =>
              setForm((current) => ({ ...current, isRestricted: event.target.checked }))
            }
          />
          Restricted
        </label>
      </td>
      <td>
        <div className="table-subtitle">
          {user.translationCount} translations
          <br />
          {user.loginCount} logins
        </div>
      </td>
      <td>
        <button
          className="ghost-btn icon-btn"
          onClick={save}
          disabled={saving}
          aria-label="Save user"
          title="Save user"
        >
          {saving ? <Loader2 className="spinning" size={14} /> : <Save size={14} />}
        </button>
      </td>
    </tr>
  );
}
