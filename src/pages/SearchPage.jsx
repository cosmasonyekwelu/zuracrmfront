// src/pages/SearchPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import API from "../services/api";
import SearchBar from "../components/SearchBar.jsx";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function SearchPage() {
  const q = useQuery().get("q") || "";
  const [input, setInput] = useState(q);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState({ leads: [], contacts: [], deals: [], activities: [] });

  useEffect(() => {
    if (!q) return;
    (async () => {
      setLoading(true);
      try {
        const data = await API.get(`/search`, { params: { q } }).then((r) => r.data);
        setRes({
          leads: data?.leads || [],
          contacts: data?.contacts || [],
          deals: data?.deals || [],
          activities: data?.activities || [],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [q]);

  return (
    <div className="page pad">
      <div className="search-header">
        <SearchBar
          placeholder="Search leads, contacts, deals, activities…"
          onSubmit={(next) => (window.location.href = `/search?q=${encodeURIComponent(next)}`)}
        />
      </div>

      {loading && <div>Searching…</div>}

      {!loading && !q && <div>Type a query to begin.</div>}

      {!loading && q && (
        <>
          <h2>Results for “{q}”</h2>
          <ResultSection title="Leads" items={res.leads} base="/leads" />
          <ResultSection title="Contacts" items={res.contacts} base="/contacts" />
          <ResultSection title="Deals" items={res.deals} base="/deals" />
          <ResultSection title="Activities" items={res.activities} base="/activities" />
        </>
      )}
    </div>
  );
}

function ResultSection({ title, items, base }) {
  if (!items?.length) return null;
  return (
    <section className="result-section">
      <h3>{title}</h3>
      <ul className="result-list">
        {items.map((it) => (
          <li key={it._id || it.id}>
            <Link to={`${base}/${it._id || it.id}`}>{it.name || it.title || it.subject}</Link>
            {it.email && <span className="muted"> · {it.email}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
