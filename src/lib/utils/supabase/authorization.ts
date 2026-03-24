import { type User } from "@supabase/supabase-js";

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord | null =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : null;

const getStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const getNestedValue = (source: unknown, path: string[]) => {
  let current: unknown = source;

  for (const key of path) {
    const record = toRecord(current);

    if (!record || !(key in record)) {
      return undefined;
    }

    current = record[key];
  }

  return current;
};

const unique = (values: string[]) => [...new Set(values)];

export const getRequiredGroup = () => {
  const value = process.env.NEXT_PUBLIC_GROUP?.trim();
  return value ? value : null;
};

export const extractGroupsFromAuthContext = ({
  user,
  claims,
}: {
  user: User | null;
  claims: Record<string, unknown> | null;
}) => {
  const groups = unique([
    ...getStringArray(getNestedValue(claims, ["groups"])),
    ...getStringArray(getNestedValue(claims, ["app_metadata", "groups"])),
    ...getStringArray(getNestedValue(claims, ["user_metadata", "groups"])),
    ...getStringArray(getNestedValue(claims, ["user_metadata", "custom_claims", "groups"])),
    ...getStringArray(getNestedValue(claims, ["user_metadata", "custom_claims", "group_ids"])),
    ...getStringArray(getNestedValue(user?.app_metadata, ["groups"])),
    ...getStringArray(getNestedValue(user?.user_metadata, ["groups"])),
    ...getStringArray(getNestedValue(user?.user_metadata, ["custom_claims", "groups"])),
    ...getStringArray(getNestedValue(user?.user_metadata, ["custom_claims", "group_ids"])),
  ]);

  return groups;
};

export const hasRequiredGroup = (groups: string[], requiredGroup: string | null) => {
  if (!requiredGroup) {
    return true;
  }

  const normalizedRequiredGroup = requiredGroup.trim().toLowerCase();

  return groups.some((group) => group.trim().toLowerCase() === normalizedRequiredGroup);
};

export const getAuthAuthorization = ({
  user,
  claims,
}: {
  user: User | null;
  claims: Record<string, unknown> | null;
}) => {
  const requiredGroup = getRequiredGroup();
  const groups = extractGroupsFromAuthContext({ user, claims });
  const isAuthorized = hasRequiredGroup(groups, requiredGroup);

  return {
    groups,
    requiredGroup,
    isAuthorized,
  };
};

export const UNAUTHORIZED_GROUP_ERROR = "insufficient_group_privilege";
