export default function Avatar({ name = "", src, size = 44 }) {
  const initials = name
    ? name.split(" ").slice(0, 2).map(p => p[0]?.toUpperCase()).join("")
    : "?";
  const S = { width: size, height: size };

  return src ? (
    <img
      src={src}
      alt={name || "Profile"}
      style={{ ...S, borderRadius: "999px", objectFit: "cover", border: "1px solid #e5e7eb" }}
    />
  ) : (
    <div
      aria-label={name || "Profile"}
      style={{
        ...S,
        borderRadius: "999px",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        background: "linear-gradient(180deg,#dbeafe,#ffffff)",
        color: "#0f172a",
        border: "1px solid #e5e7eb",
      }}
    >
      {initials}
    </div>
  );
}
