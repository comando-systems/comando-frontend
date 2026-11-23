import { Redirect, useFocusEffect } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Form } from '@/components/form';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type {
  CreateUserRequest,
  PageResponse,
  RoleCode,
  RoleSet,
  UpdateUserRequest,
  UserResponse,
} from '@/types';
import { ROLE_CODES } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import { permissions } from '@/utils/permissions';
import { roleSetToArray, toRoleSet } from '@/utils/roles';

const PAGE_SIZE = 20;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

const roleLabels: Record<RoleCode, string> = {
  ADMIN: 'Administrator',
  CASHIER: 'Cashier',
  SERVER: 'Server',
};

interface UserFormValues {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly roles: RoleSet;
}

type UsersMode =
  | { readonly kind: 'list' }
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly user: UserResponse };

interface UserFormProps {
  readonly initialUser: UserResponse | null;
  readonly currentUserId: string | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (values: UserFormValues) => void;
  readonly onCancel: () => void;
}

function roleSummary(roles: RoleSet): string {
  return ROLE_CODES.filter((role) => roles[role] === role)
    .map((role) => roleLabels[role])
    .join(', ');
}

function validateUserForm(values: UserFormValues, isEdit: boolean, isSelf: boolean): string | null {
  if (values.name.trim().length === 0) {
    return 'Enter a name.';
  }

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    return 'Enter a valid email address.';
  }

  if (ROLE_CODES.every((role) => values.roles[role] !== role)) {
    return 'Select at least one role.';
  }

  if (isSelf && values.roles.ADMIN !== 'ADMIN') {
    return 'You cannot remove your own administrator role.';
  }

  if (!isEdit && (values.password.length < 8 || values.password.length > 128)) {
    return 'Password must be 8 to 128 characters.';
  }

  if (isEdit && values.password.length > 0 && (values.password.length < 8 || values.password.length > 128)) {
    return 'Password must be 8 to 128 characters.';
  }

  return null;
}

function UserForm({
  initialUser,
  currentUserId,
  busy,
  error,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const isEdit = initialUser !== null;
  const isSelf = isEdit && initialUser.id === currentUserId;
  const [values, setValues] = useState<UserFormValues>({
    name: initialUser?.name ?? '',
    email: initialUser?.email ?? '',
    password: '',
    roles: initialUser?.roles ?? toRoleSet([]),
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleRole = (role: RoleCode) => {
    setValidationError(null);
    setValues((current) => ({
      ...current,
      roles:
        current.roles[role] === role
          ? toRoleSet(roleSetToArray(current.roles).filter((entry) => entry !== role))
          : { ...current.roles, [role]: role },
    }));
  };

  const handleSubmit = () => {
    const nextError = validateUserForm(values, isEdit, isSelf);

    if (nextError !== null) {
      setValidationError(nextError);
      return;
    }

    setValidationError(null);
    onSubmit({
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
    });
  };

  const displayedError = validationError ?? error;

  return (
    <Screen scroll title={isEdit ? 'Edit user' : 'Create user'} subtitle="Administrator access">
      <Form
        testID="user-form"
        submit={isEdit ? 'Save user' : 'Create user'}
        onSubmit={handleSubmit}
        cancel="Cancel"
        onCancel={onCancel}
        submitButtonProps={{ loading: busy, icon: 'check', size: 'lg', testID: 'user-submit' }}
        cancelButtonProps={{ disabled: busy, testID: 'user-cancel' }}
      >
        <Field
          label="Name"
          value={values.name}
          onChangeText={(name) => {
            setValidationError(null);
            setValues((current) => ({ ...current, name }));
          }}
          placeholder="Full name"
          autoCapitalize="words"
          editable={!busy}
          testID="user-name"
        />
        <View style={{ marginTop: spacing.md }}>
          <Field
            label="Email"
            value={values.email}
            onChangeText={(email) => {
              setValidationError(null);
              setValues((current) => ({ ...current, email }));
            }}
            placeholder="user@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy}
            testID="user-email"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Field
            label={isEdit ? 'New password (optional)' : 'Password'}
            value={values.password}
            onChangeText={(password) => {
              setValidationError(null);
              setValues((current) => ({ ...current, password }));
            }}
            placeholder="8 to 128 characters"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            editable={!busy}
            testID="user-password"
          />
        </View>

        <Text style={[typography.label, { color: colors.text, marginTop: spacing.lg }]}>Roles</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
          {ROLE_CODES.map((role) => {
            const selected = values.roles[role] === role;
            const disabled = busy || (isSelf && role === 'ADMIN');

            return (
              <View
                key={role}
                style={{
                  backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: 999,
                  borderWidth: 1,
                  marginRight: spacing.sm,
                  marginBottom: spacing.sm,
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <Button
                  label={roleLabels[role]}
                  onPress={() => toggleRole(role)}
                  variant={selected ? 'primary' : 'secondary'}
                  disabled={disabled}
                  testID={`user-role-${role}`}
                />
              </View>
            );
          })}
        </View>
        {isSelf ? (
          <Text
            style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}
            testID="user-self-role-note"
          >
            You cannot remove your own administrator role.
          </Text>
        ) : null}

        {displayedError === null ? null : (
          <View style={{ marginTop: spacing.md }}>
            <ErrorBanner message={displayedError} testID="user-form-error" />
          </View>
        )}

      </Form>
    </Screen>
  );
}

interface UserRowProps {
  readonly user: UserResponse;
  readonly currentUserId: string | null;
  readonly busy: boolean;
  readonly onEdit: (target: UserResponse) => void;
  readonly onDeactivate: (target: UserResponse) => void;
  readonly onReactivate: (target: UserResponse) => void;
}

const UserRow = memo(function UserRow({
  user,
  currentUserId,
  busy,
  onEdit,
  onDeactivate,
  onReactivate,
}: UserRowProps) {
  const isSelf = user.id === currentUserId;

  return (
    <Card testID={`user-row-${user.id}`} style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.subtitle, { color: colors.text, flex: 1 }]}>{user.name}</Text>
        <Badge
          label={user.isActive ? 'Active' : 'Inactive'}
          tone={user.isActive ? 'success' : 'neutral'}
          testID={`user-active-${user.id}`}
        />
      </View>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
        {user.email}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
        {roleSummary(user.roles)}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Button
            label="Edit"
            onPress={() => onEdit(user)}
            variant="secondary"
            disabled={busy}
            testID={`user-edit-${user.id}`}
          />
        </View>
        <View style={{ flex: 1 }}>
          {user.isActive ? (
            <Button
              label="Deactivate"
              onPress={() => onDeactivate(user)}
              variant="danger"
              disabled={busy || isSelf}
              testID={`user-deactivate-${user.id}`}
            />
          ) : (
            <Button
              label="Reactivate"
              onPress={() => onReactivate(user)}
              disabled={busy}
              testID={`user-reactivate-${user.id}`}
            />
          )}
        </View>
      </View>
      {user.isActive && isSelf ? (
        <Text
          style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}
          testID={`user-self-note-${user.id}`}
        >
          You cannot deactivate your own account.
        </Text>
      ) : null}
    </Card>
  );
});

export default function Users() {
  const { user } = useSession();
  const [users, setUsers] = useState<readonly UserResponse[]>([]);
  const [pagination, setPagination] = useState<PageResponse<UserResponse>['pagination']>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<UsersMode>({ kind: 'list' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = permissions.canManage(user);

  const loadUsers = useCallback(
    async (isRefresh = false) => {
      if (!canManage) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const result = await api.users.list({ page, pageSize: PAGE_SIZE });
        setUsers(result.data);
        setPagination(result.pagination);
      } catch (loadError) {
        setError(toErrorMessage(loadError));
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [canManage, page],
  );

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers]),
  );

  const saveUser = useCallback(
    async (values: UserFormValues) => {
      setBusy(true);
      setError(null);

      try {
        if (mode.kind === 'create') {
          const body: CreateUserRequest = {
            name: values.name,
            email: values.email,
            password: values.password,
            roles: roleSetToArray(values.roles),
          };
          await api.users.create(body);
        } else if (mode.kind === 'edit') {
          const body: UpdateUserRequest = {
            name: values.name,
            email: values.email,
            roles: roleSetToArray(values.roles),
            ...(values.password.length === 0 ? {} : { password: values.password }),
          };
          await api.users.update(mode.user.id, body);
        }

        setMode({ kind: 'list' });
        await loadUsers();
      } catch (submitError) {
        setError(toErrorMessage(submitError));
      } finally {
        setBusy(false);
      }
    },
    [loadUsers, mode],
  );

  const changeActiveState = useCallback(
    async (target: UserResponse, reactivate: boolean) => {
      setBusy(true);
      setError(null);

      try {
        if (reactivate) {
          await api.users.update(target.id, { isActive: true });
        } else {
          await api.users.deactivate(target.id);
        }

        await loadUsers();
      } catch (actionError) {
        setError(toErrorMessage(actionError));
      } finally {
        setBusy(false);
      }
    },
    [loadUsers],
  );

  const openCreate = useCallback(() => {
    setError(null);
    setMode({ kind: 'create' });
  }, []);

  const openEdit = useCallback((target: UserResponse) => {
    setError(null);
    setMode({ kind: 'edit', user: target });
  }, []);

  if (!canManage) {
    return <Redirect href="/" />;
  }

  if (mode.kind === 'create' || mode.kind === 'edit') {
    return (
      <UserForm
        key={mode.kind === 'edit' ? mode.user.id : 'create'}
        initialUser={mode.kind === 'edit' ? mode.user : null}
        currentUserId={user?.id ?? null}
        busy={busy}
        error={error}
        onSubmit={(values) => void saveUser(values)}
        onCancel={() => {
          setError(null);
          setMode({ kind: 'list' });
        }}
      />
    );
  }

  if (loading && users.length === 0) {
    return (
      <Screen title="Users" subtitle="Staff accounts and roles">
        <LoadingState message="Loading users..." testID="users-loading" />
      </Screen>
    );
  }

  const totalPages = Math.max(pagination.totalPages, 1);
  const listHeader = (
    <View>
      <Button
        label="Add user"
        onPress={openCreate}
        icon="add"
        fullWidth
        testID="add-user-button"
      />
      {error === null ? null : (
        <View style={{ marginTop: spacing.md }}>
          <ErrorBanner
            message={error}
            onRetry={() => {
              void loadUsers(true);
            }}
            testID="users-error"
          />
        </View>
      )}
      {users.length === 0 ? null : (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={[typography.label, { color: colors.text }]}>Users</Text>
        </View>
      )}
    </View>
  );

  const listFooter = (
    <Card testID="users-pagination" style={{ marginTop: spacing.md }}>
      <Text style={[typography.label, { color: colors.text }]} testID="users-page-label">
        {`Page ${page} of ${totalPages}`}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Button
            label="Previous"
            onPress={() => setPage((current) => Math.max(1, current - 1))}
            variant="secondary"
            disabled={page <= 1}
            testID="users-previous"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Next"
            onPress={() => setPage((current) => current + 1)}
            variant="secondary"
            disabled={page >= totalPages}
            testID="users-next"
          />
        </View>
      </View>
    </Card>
  );

  return (
    <Screen title="Users" subtitle="Staff accounts and roles">
      <FlatList
        testID="users-list"
        data={users}
        keyExtractor={(entry) => entry.id}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <EmptyState
            title="No users found"
            description="Staff accounts will appear here."
            icon="users"
          />
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadUsers(true)} />
        }
        renderItem={({ item }) => (
          <UserRow
            user={item}
            currentUserId={user?.id ?? null}
            busy={busy}
            onEdit={openEdit}
            onDeactivate={(target) => void changeActiveState(target, false)}
            onReactivate={(target) => void changeActiveState(target, true)}
          />
        )}
      />
    </Screen>
  );
}
