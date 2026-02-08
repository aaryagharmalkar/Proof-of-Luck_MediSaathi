export const getApiBaseUrl = () => {
  const raw = import.meta.env.VITE_API_URL || "http://localhost:5050";
  const trimmed = String(raw).replace(/\/+$/, "");
  if (trimmed.endsWith("/api/v1")) {
    return trimmed;
  }
  return `${trimmed}/api/v1`;
};
