import axios from "axios";

export const http = axios.create({
  baseURL: "/api",           // use Vite proxy or set your absolute API URL
  withCredentials: true,     // if you use cookies
});

http.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("auth.token");
  if (t && !cfg.headers.Authorization) {
    cfg.headers.Authorization = `Bearer ${t}`;
  }
  return cfg;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      localStorage.removeItem("auth.token");
      // don't bounce if we're already on auth screens
      if (!/\/(signin|signup)/.test(window.location.pathname)) {
        window.location.replace("/signin");
      }
    }
    return Promise.reject(err);
  }
);
