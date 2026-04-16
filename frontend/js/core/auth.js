export function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) location.href = "login.html";
  return token;
}

export function logout() {
  localStorage.clear();
  location.href = "login.html";
}