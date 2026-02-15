/** Client-side auth helpers (no backend). Passwords hashed with SHA-256 before storing. */

const USERS_KEY = 'stash_users';
const SESSION_KEY = 'stash_session';

export interface User {
  email: string;
  name: string;
  passwordHash: string;
}

export interface Session {
  email: string;
  name: string;
}

async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback when crypto.subtle is unavailable (e.g. non-HTTPS)
  let h = 0;
  for (let i = 0; i < password.length; i++) {
    h = (Math.imul(31, h) + password.charCodeAt(i)) | 0;
  }
  return 'fallback_' + Math.abs(h).toString(16) + '_' + password.length;
}

function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function register(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  if (!trimmedName || !trimmedEmail || !password) {
    return { ok: false, error: 'Please fill in all fields.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }
  const users = getUsers();
  if (users.some((u) => u.email === trimmedEmail)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const passwordHash = await hashPassword(password);
  users.push({ email: trimmedEmail, name: trimmedName, passwordHash });
  saveUsers(users);
  setSession({ email: trimmedEmail, name: trimmedName });
  return { ok: true };
}

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    return { ok: false, error: 'Please enter email and password.' };
  }
  const users = getUsers();
  const user = users.find((u) => u.email === trimmedEmail);
  if (!user) {
    return { ok: false, error: 'No account found with this email.' };
  }
  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    return { ok: false, error: 'Incorrect password.' };
  }
  setSession({ email: user.email, name: user.name });
  return { ok: true };
}
