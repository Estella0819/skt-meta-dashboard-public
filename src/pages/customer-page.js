(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  root.DashboardCustomer=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const labels={new:'新客',old:'老客',unknown:'未知'};
  const segment=s=>['prospecting','engaged'].includes(s)?'new':s==='existing'?'old':'unknown';
  function aggregate(rows){
    const groups=['new','old','unknown'].map(key=>({key,label:labels[key],spend:0,purchase_value:0,purchase_times:0}));
    for(const row of rows){const g=groups.find(g=>g.key===segment(row.segment)); for(const k of ['spend','purchase_value','purchase_times']) g[k]+=Number(row[k])||0;}
    const total=groups.reduce((s,r)=>s+r.purchase_value,0);
    return groups.map(r=>({...r,roas:r.spend?r.purchase_value/r.spend:null,cpa:r.purchase_times?r.spend/r.purchase_times:null,aov:r.purchase_times?r.purchase_value/r.purchase_times:null,share:total?r.purchase_value/total:null}));
  }
  function covered(payload,start,end){return Boolean(payload?.start_date && payload?.end_date && start>=payload.start_date && end<=payload.end_date);}
  function selectAds(rows,metadata,state,predicate){
    if(state.country?.length) return [];
    const daily=new Map(),canonical=new Map();
    const fields=['operator','standard_product_name','product_name','account_name'];
    const add=(map,key,row)=>{
      if(!map.has(key)) map.set(key,row);
      else if(fields.some(k=>map.get(key)?.[k]!==row[k])) map.set(key,null);
    };
    for(const r of metadata||[]){
      const key=String(r.ad_id); add(daily,`${key}:${r.date_start}`,r);
      add(canonical,key,r);
    }
    return (rows||[]).map(r=>{const dayKey=`${r.ad_id}:${r.date_start}`;const m=daily.has(dayKey)?daily.get(dayKey):canonical.get(String(r.ad_id));return {...m,...r,mapping_unknown:!m};}).filter(predicate);
  }
  function siteAvailable(state){return !['account','operator','product'].some(k=>state[k]?.length);}
  const compare=(now,before)=>now==null || before==null || before===0 ? null : (now-before)/Math.abs(before);
  function snapshot(rows,available){
    const result={total_gmv:available ? rows.reduce((s,r)=>s+(Number(r.purchase_value)||0),0) : null};
    for(const r of aggregate(rows)) for(const [key,value] of Object.entries({gmv:r.purchase_value,share:r.share,roas:r.roas,cpa:r.cpa,aov:r.aov,spend:r.spend,purchases:r.purchase_times})) result[`${r.key}_${key}`]=available ? value : null;
    return result;
  }
  function siteSnapshot(rows,available){
    const normalized=rows.map(r=>({...r,segment:String(r.customer_type).toLowerCase()==='new' ? 'prospecting' : String(r.customer_type).toLowerCase()==='returning' ? 'existing' : 'unknown',purchase_value:r.net_sales}));
    return snapshot(normalized,available);
  }
  function productRows(rows,previous,available,previousAvailable,hierarchy=[]){
    const name=r=>r.standard_product_name || r.product_name || '未映射';
    const names=new Set([...rows,...previous].map(name));
    const visited=new Set();
    function entry(label,leaves,depth){return {label,standard_product_name:label,_depth:depth,...snapshot(rows.filter(r=>leaves.includes(name(r))),available),previous:snapshot(previous.filter(r=>leaves.includes(name(r))),previousAvailable)};}
    function walk(node,depth){
      if(typeof node==='string'){if(!names.has(node))return [];visited.add(node);return [entry(node,[node],depth)];}
      const children=node.children.flatMap(n=>walk(n,depth+1));
      if(!children.length && !names.has(node.name))return [];
      if(names.has(node.name))visited.add(node.name);
      const leaves=[...new Set([...children.filter(r=>names.has(r.label)).map(r=>r.label),...(names.has(node.name)?[node.name]:[])])];
      const blocks=[]; for(const row of children){if(row._depth===depth+1)blocks.push([]);blocks.at(-1).push(row);}
      blocks.sort((a,b)=>(b[0].total_gmv||0)-(a[0].total_gmv||0));
      return [entry(node.name,leaves,depth),...blocks.flat()];
    }
    return [...hierarchy.flatMap(n=>walk(n,0)),...[...names].filter(n=>!visited.has(n)).sort().map(n=>entry(n,[n],0))];
  }
  return {aggregate,covered,selectAds,siteAvailable,compare,snapshot,siteSnapshot,productRows};
});
