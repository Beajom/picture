export function csvText(rows){
  if(!Array.isArray(rows)||!rows.length)return '';
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r||{})))];
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  return [
    keys.map(q).join(','),
    ...rows.map(r=>keys.map(k=>q(typeof r[k]==='object'?JSON.stringify(r[k]):r[k])).join(','))
  ].join('\n');
}

export function attachmentFileSize(n){
  const v=Number(n||0);
  if(v<1024)return v+' B';
  if(v<1048576)return (v/1024).toFixed(1)+' KB';
  return (v/1048576).toFixed(1)+' MB';
}

export function parseCartonSize(v=''){
  const s=String(v||'').replace(/,/g,'x');
  const m=s.match(/([\d.]+)\s*[x×*]\s*([\d.]+)\s*[x×*]\s*([\d.]+)/i);
  if(!m)return {len:'',wid:'',hei:'',cbm:0};
  const len=Number(m[1]||0),wid=Number(m[2]||0),hei=Number(m[3]||0);
  const cbm=len&&wid&&hei?(len*wid*hei/1000000):0;
  return {len,wid,hei,cbm};
}

export function formatCbm(v){
  return Number(v||0)?`${Number(v).toFixed(3)} CBM`:'-';
}
