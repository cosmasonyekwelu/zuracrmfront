export default function DealKanban({ pipelines, deals = [], onMove }){
  const stages = (pipelines?.[0]?.stages || []).sort((a,b)=>a.order-b.order);
  const byStage = {}; stages.forEach(s => byStage[s._id] = []); deals.forEach(d => { if(!byStage[d.stageId]) byStage[d.stageId]=[]; byStage[d.stageId].push(d); });
  const handleDrop = (e, stageId) => { const dealId = e.dataTransfer.getData("text/plain"); onMove(dealId, stageId); };
  return (<div className="kanban">{stages.map(s => (<div key={s._id} className="column" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>handleDrop(e, s._id)}><h4>{s.name}</h4>{(byStage[s._id] || []).map(d => (<div key={d._id} className="deal" draggable onDragStart={(e)=>e.dataTransfer.setData('text/plain', d._id)}><div style={{fontWeight:600}}>{d.name}</div><div style={{fontSize:12, color:"#475569"}}>${d.amount?.toLocaleString?.() || 0}</div></div>))}</div>))}</div>)
}
