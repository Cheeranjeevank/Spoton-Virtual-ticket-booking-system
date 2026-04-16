export function getApiBase() {
  const origin = window.location.origin;

  if (origin.includes("devtunnels.ms")) return origin + "/api";
  if (origin.includes("localhost")) return "http://localhost:5507/api";

  return origin + "/api";
}