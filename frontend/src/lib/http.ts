export const authHeaders = (token: string | null) =>
  token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
