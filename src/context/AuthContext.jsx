// src/context/AuthContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { AuthAPI, USE_COOKIES, setAuthSession, clearAuthSession } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("auth.token"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hydrate once: only call /auth/me if cookie-mode OR a token exists
  useEffect(() => {
    let alive = true;
    (async () => {
      const storedToken = localStorage.getItem("auth.token");
      const shouldCallMe = USE_COOKIES || !!storedToken;

      if (!shouldCallMe) {
        if (alive) {
          setUser(null);
          setOrg(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const data = await AuthAPI.me(); // returns { user, org } or null
        if (!alive) return;

        if (data?.user) {
          setUser(data.user);
          setOrg(data.org || null);

          // In cookie-mode, keep a truthy token placeholder for route guards
          if (!storedToken && USE_COOKIES) setToken("session");

          // Persist X-Org-Id for multi-tenant headers
          setAuthSession({
            token: storedToken || (USE_COOKIES ? "session" : null),
            orgId: data?.org?.id || null,
          });
        } else {
          setUser(null);
          setOrg(null);
          setToken(null);
          clearAuthSession();
        }
      } catch (_e) {
        if (!alive) return;
        setUser(null);
        setOrg(null);
        setToken(null);
        clearAuthSession();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const afterAuth = useCallback((res) => {
    const u = res?.user ?? null;
    const org = res?.org ?? null;
    setUser(u);
    setOrg(org);
    if (res?.token) {
      setToken(res.token);
      setAuthSession({ token: res.token, orgId: org?.id || u?.orgId || null });
    } else {
      // cookie/session mode
      setToken("session");
      setAuthSession({ token: "session", orgId: org?.id || u?.orgId || null });
    }
    return res;
  }, []);

  const signin = useCallback(async (credentials) => {
    setError(null);
    const res = await AuthAPI.signin(credentials);
    return afterAuth(res);
  }, [afterAuth]);

  const signup = useCallback(async (payload) => {
    setError(null);
    const res = await AuthAPI.signup(payload);
    return afterAuth(res);
  }, [afterAuth]);

  const signout = useCallback(async () => {
    try { await AuthAPI.signout(); } catch {}
    setUser(null);
    setOrg(null);
    setToken(null);
    clearAuthSession();
  }, []);

  // Clear auth on 401 globally
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.status === 401 || err?.response?.status === 401) {
          setUser(null);
          setOrg(null);
          setToken(null);
          clearAuthSession();
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  const isAdmin = user?.role === "admin";
  const hasRole = useCallback(
    (roles) => {
      if (!user?.role) return false;
      if (!roles?.length) return true;
      return roles.includes(user.role);
    },
    [user?.role]
  );

  const value = useMemo(
    () => ({
      user,
      org,
      token,
      loading,
      error,
      isAuthenticated: Boolean(token),
      isAdmin,
      hasRole,
      signin,
      signup,
      signout,
      setUser,
      setLoading,
    }),
    [user, org, token, loading, error, isAdmin, hasRole, signin, signup, signout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
