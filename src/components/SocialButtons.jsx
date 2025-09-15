export default function SocialButtons({ onGoogle, onOther, label="Continue with" }){
  return (
    <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
      <button type="button" className="btn btn-outline" onClick={onGoogle}>
        <span style={{fontWeight:700}}>G</span> &nbsp;{label} Google
      </button>
      <button type="button" className="btn btn-outline" onClick={onOther}>
        <span style={{fontWeight:700}}>in</span> &nbsp;{label} Social
      </button>
    </div>
  );
}
