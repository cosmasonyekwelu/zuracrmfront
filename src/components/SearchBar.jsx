// src/components/SearchBar.jsx
import { useState } from "react";

export default function SearchBar({ placeholder = "Search…", onSubmit }) {
  const [q, setQ] = useState("");
  const submit = (e) => {
    e?.preventDefault?.();
    if (q.trim() && onSubmit) onSubmit(q.trim());
  };
  return (
    <form className="searchbar" onSubmit={submit} role="search">
      <input
        className="searchbar-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
      />
      <button className="btn btn-primary" type="submit">Search</button>
    </form>
  );
}
