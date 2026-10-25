'use strict';
const faceViews=new Map(),faceDrafts=new Map(),facePending=new Set(),faceDirty=new Set();
const faceBaseStages=productionStages;
productionStages=function(w){const stages=faceBaseStages(w);const at=stages.findIndex(([key])=>key==='characters');stages.splice(at+1,0,['identity','Đồng nhất khuôn mặt']);return stages;};
function faceKey(w){return JSON.stringify([w.revision,w.render_tasks,S.tasks.filter(t=>t.workflow_id===w.id).map(t=>[t.id,t.status,t.outputs])]);}
async function faceLoad(w,reset=false){
  if(facePending.has(w.id))return;facePending.add(w.id);
  try{const data=await api('/api/production/identity-view',{id:w.id});faceViews.set(w.id,{data,key:faceKey(w)});if(reset||!faceDirty.has(w.id)){faceDrafts.delete(w.id);faceDirty.delete(w.id);}if(productionCurrent()?.id===w.id&&productionViews.get(w.id)==='identity')draw();}
  finally{facePending.delete(w.id);}
}
function faceDraft(w,data){
 if(!faceDrafts.has(w.id)){
  const suggested=w.module==='storyboard'?(w.characters||[]):(w.plan?.characters||[]);
  const people=data.characters.length?data.characters.map(c=>({...c,source:'ref:'+c.ref})):suggested.map(c=>({code:c.code||c.id,name:c.name||c.code||c.id,appearance:c.appearance||'',source:c.ref?'ref:'+c.ref:''}));
  const assignments={};for(const row of productionRows(w))assignments[row.id]=data.assignments[row.id]??(Array.isArray(row.characters)?[...row.characters]:[]);
  faceDrafts.set(w.id,{enabled:data.enabled,characters:people,assignments,sources:{...data.sources}});
 }
 return faceDrafts.get(w.id);
}
function faceReferences(w){return S.refs.filter(r=>r.kind==='image'&&!r.identity_sample&&(!r.project||r.project==='default'||r.project===w.project));}
function faceOptions(w,value='',includeMedia=true){
 const refs=faceReferences(w).map(r=>['ref:'+r.id,r.name||r.code||r.id]);
 if(includeMedia)for(const m of S.media.filter(m=>m.project===w.project&&m.kind==='image'))refs.push(['media:'+m.id,'Kết quả: '+m.name]);
 return '<option value="">Chưa chọn</option>'+refs.map(([id,label])=>`<option value="${esc(id)}" ${value===id?'selected':''}>${esc(label)}</option>`).join('');
}
function facePreview(source){if(!source)return '<div class="face-empty">Chưa có ảnh</div>';const [kind,id]=source.split(':');return `<img class="face-photo" src="/${kind==='media'?'media':'refs'}/${encodeURIComponent(id)}" alt="Ảnh tham chiếu nhân vật">`;}
function faceSceneMasters(item,data){
 const people=data.characters.filter(c=>(item.characters||[]).includes(c.code));
 return people.length?`<div class="face-scene-masters"><span>Ảnh chuẩn để đối chiếu</span>${people.map(c=>`<a href="/refs/${encodeURIComponent(c.ref)}" target="_blank" rel="noopener"><figure>${facePreview('ref:'+c.ref)}<figcaption>${esc(c.name)}</figcaption></figure></a>`).join('')}</div>`:'';
}
function faceStatus(value){return ({USER_APPROVED:'Bạn đã duyệt',REJECTED:'Cần sửa',NOT_VERIFIED:'Chưa duyệt'})[value]||'Chưa duyệt';}
function faceWorkspace(w){
 const cached=faceViews.get(w.id);
 if(!cached||cached.key!==faceKey(w)){Promise.resolve().then(()=>faceLoad(w)).catch(e=>toast(e.message,true));if(!cached)return '<section class="panel"><h3>Đồng nhất khuôn mặt</h3><p>Đang đọc ảnh chuẩn và kết quả của dự án…</p></section>';}
 const data=cached.data,draft=faceDraft(w,data),dirty=faceDirty.has(w.id);
 return `<section class="panel face-workspace"><div class="section-heading"><div><h3>Đồng nhất khuôn mặt</h3><p>Ảnh chuẩn cố định → ảnh từng cảnh đã duyệt → video → kiểm tra đầu, giữa, cuối.</p></div>${btn('Làm mới','face-refresh')}</div><p class="notice">Đây là hỗ trợ bằng ảnh tham chiếu. <b>App chưa tự kiểm tra độ giống khuôn mặt.</b> Bạn duyệt hình thực tế trước khi tạo video và xuất phim.</p>
 <div class="face-config"><label><input data-face-enabled type="checkbox" ${draft.enabled?'checked':''}> Bật dùng ảnh chuẩn và duyệt khuôn mặt cho dự án này</label><p class="muted">Ảnh chuẩn được lưu thành bản sao riêng. Prompt được giữ nguyên; thông tin nhân vật được lưu riêng với prompt.</p>
 <div class="face-people">${draft.characters.map((c,i)=>`<article class="face-person" data-face-person="${i}" data-face-original-code="${esc(c.code)}">${facePreview(c.source)}<div><label>Mã nhân vật<input data-face-field="code" value="${esc(c.code)}" placeholder="CHAR_001"></label><label>Tên<input data-face-field="name" value="${esc(c.name)}"></label><label>Ảnh chuẩn<select data-face-field="source">${faceOptions(w,c.source)}</select></label><div class="actions">${btn('Tải ảnh chuẩn','face-upload-master','',`data-person="${i}"`)}${btn('Bỏ nhân vật','face-remove-person','danger',`data-person="${i}"`)}</div><label>Hồ sơ ngoại hình<textarea data-face-field="appearance" placeholder="Khuôn mặt, tóc, tuổi, trang phục cần giữ">${esc(c.appearance)}</textarea></label></div></article>`).join('')||'<p>Chưa có ảnh chuẩn. Thêm nhân vật hoặc tạo kịch bản có nhân vật trước.</p>'}</div><div class="actions">${btn('Thêm nhân vật','face-add-person')}${btn('Lưu ảnh chuẩn và gán cảnh','face-save','primary')}</div><p class="face-dirty">${dirty?'Có thay đổi chưa lưu. Lưu trước khi duyệt hoặc render.':''}</p></div>
 <div class="actions">${w.module!=='storyboard'?btn('Tạo ảnh từng cảnh','face-images','primary'):''}${btn('Tạo video từ ảnh đã duyệt','face-clips','primary')}</div>
 <p class="muted">Kết nối hiện tại nhận tối đa ${Number(S.settings.render_options?.max_refs||1)} ảnh/tác vụ. Các cảnh vượt giới hạn sẽ được báo trước; app không tự bỏ ảnh.</p>
 ${productionRows(w).map((row,index)=>{const item=data.rows.find(x=>x.id===row.id)||{},source=item.image?.source;return `<article class="face-scene" data-face-scene="${esc(row.id)}"><div class="section-heading"><h3>Cảnh ${index+1}</h3><span class="badge">Ảnh: ${faceStatus(item.image_status)} · Clip: ${faceStatus(item.clip_status)}</span></div><div class="face-scene-config"><div><label>Nhân vật xuất hiện</label><div class="checks">${draft.characters.map(c=>`<label><input type="checkbox" data-face-assignment="${esc(c.code)}" ${(draft.assignments[row.id]||[]).includes(c.code)?'checked':''}>${esc(c.name)} · ${esc(c.code)}</label>`).join('')||'<small>Thêm ảnh chuẩn ở trên để gán nhân vật.</small>'}</div><small>Không chọn nhân vật: cảnh không có nhân vật cần giữ mặt.</small></div><div><label>Ảnh cảnh từ máy (tùy chọn)</label><select data-face-scene-source>${faceOptions(w,draft.sources[row.id]?'ref:'+draft.sources[row.id]:'',false)}</select>${btn('Tải ảnh cảnh','face-upload-scene','',`data-scene="${esc(row.id)}"`)}<small>Để trống: dùng ảnh Storyboard đã chọn hoặc kết quả tạo ảnh của cảnh.</small></div></div>
 ${faceSceneMasters(item,data)}<div class="face-review-grid"><div>${facePreview(source)}<p>${esc(item.image_error||'Đối chiếu khuôn mặt với ảnh chuẩn ở trên.')}</p><div class="actions">${btn('Ảnh đúng mặt · Duyệt','face-approve-image','primary',`data-scene="${esc(row.id)}" ${!item.image||dirty?'disabled':''}`)}${btn('Ảnh cần sửa','face-reject-image','',`data-scene="${esc(row.id)}" ${!item.image||dirty?'disabled':''}`)}${item.image?.task&&item.image_status==='REJECTED'?btn('Tạo lại ảnh cảnh','face-retry-image','',`data-scene="${esc(row.id)}" ${dirty?'disabled':''}`):''}</div></div><div>${item.clip?`<video controls preload="metadata" src="/media/${encodeURIComponent(item.clip.media)}"></video><div class="actions">${btn('Xem đầu · giữa · cuối','face-samples','',`data-scene="${esc(row.id)}" ${dirty?'disabled':''}`)}</div><div class="face-samples">${(item.samples||[]).map((id,i)=>`<figure><img src="/refs/${encodeURIComponent(id)}" alt="${['Đầu','Giữa','Cuối'][i]} clip"><figcaption>${['Đầu','Giữa','Cuối'][i]}</figcaption></figure>`).join('')}</div><label><input type="checkbox" data-face-clip-watched> Tôi đã xem video và đối chiếu cả 3 khung với ảnh chuẩn</label><div class="actions">${btn('Clip đúng mặt · Duyệt','face-approve-clip','primary',`data-scene="${esc(row.id)}" ${item.samples?.length!==3||dirty?'disabled':''}`)}${btn('Clip cần sửa','face-reject-clip','',`data-scene="${esc(row.id)}" ${dirty?'disabled':''}`)}${item.clip_status==='REJECTED'?btn('Tạo lại clip này','face-retry-clip','',`data-scene="${esc(row.id)}" ${dirty?'disabled':''}`):''}</div>`:'<div class="face-empty">Chưa có clip hoàn tất của cảnh.</div>'}</div></div></article>`;}).join('')||'<p>Tạo hoặc nhập kịch bản trước để gán nhân vật theo cảnh.</p>'}</section>`;
}
function faceCollect(w){
 const data=faceViews.get(w.id).data,draft=faceDraft(w,data),root=document.querySelector('.face-workspace');if(!root)return draft;
 draft.enabled=root.querySelector('[data-face-enabled]').checked;
 const renamed={};for(const card of root.querySelectorAll('[data-face-person]')){const c=draft.characters[Number(card.dataset.facePerson)];for(const field of card.querySelectorAll('[data-face-field]'))c[field.dataset.faceField]=field.value;renamed[card.dataset.faceOriginalCode]=c.code;}
 for(const row of root.querySelectorAll('[data-face-scene]')){const id=row.dataset.faceScene;draft.assignments[id]=Array.from(row.querySelectorAll('[data-face-assignment]:checked')).map(el=>renamed[el.dataset.faceAssignment]||el.dataset.faceAssignment);draft.sources[id]=row.querySelector('[data-face-scene-source]').value.replace(/^ref:/,'');}
 return draft;
}
async function faceUpload(w,person,scene){
 const draft=faceCollect(w);pick('.png,.jpg,.jpeg,.webp',false,async files=>{
  const file=files[0];if(file.size>20*1024*1024)throw Error('Ảnh tối đa 20 MB.');
  const response=await fetch('/api/upload?kind=ref&project='+encodeURIComponent(w.project)+'&name='+encodeURIComponent(file.name),{method:'POST',body:file});const value=await response.json();if(!response.ok)throw Error(value.error||'Tải ảnh thất bại.');
  if(person!==undefined)draft.characters[person].source='ref:'+value.id;else draft.sources[scene]=value.id;
  faceDirty.add(w.id);await refresh(false);draw();
 });
}
document.addEventListener('input',event=>{const w=productionCurrent();if(w&&event.target.closest('.face-config,.face-scene-config')){faceCollect(w);faceDirty.add(w.id);const label=document.querySelector('.face-dirty');if(label)label.textContent='Có thay đổi chưa lưu. Lưu trước khi duyệt hoặc render.';}});
document.addEventListener('change',event=>{const w=productionCurrent();if(w&&event.target.closest('.face-config,.face-scene-config')){faceCollect(w);faceDirty.add(w.id);}});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button||!button.dataset.action.startsWith('face-'))return;
 event.preventDefault();event.stopImmediatePropagation();if(button.disabled)return;button.disabled=true;
 (async()=>{
  const w=productionCurrent();if(!w)throw Error('Mở dự án trước.');const action=button.dataset.action;
  if(action==='face-refresh'){if(faceDirty.has(w.id)&&!confirm('Bỏ thay đổi chưa lưu và tải lại?'))return;await refresh(false);await faceLoad(productionCurrent(),true);return;}
  const draft=faceCollect(w);
  if(action==='face-add-person'){let n=1;while(draft.characters.some(c=>c.code==='CHAR_'+String(n).padStart(3,'0')))n++;draft.characters.push({code:'CHAR_'+String(n).padStart(3,'0'),name:'Nhân vật '+n,appearance:'',source:''});faceDirty.add(w.id);draw();return;}
  if(action==='face-remove-person'){const c=draft.characters.splice(Number(button.dataset.person),1)[0];for(const id of Object.keys(draft.assignments))draft.assignments[id]=draft.assignments[id].filter(code=>code!==c.code);faceDirty.add(w.id);draw();return;}
  if(action==='face-upload-master'){await faceUpload(w,Number(button.dataset.person));return;}
  if(action==='face-upload-scene'){await faceUpload(w,undefined,button.dataset.scene);return;}
  if(action==='face-save'){await api('/api/production/identity-configure',{id:w.id,...draft});await refresh(false);await faceLoad(productionCurrent(),true);toast('Đã lưu ảnh chuẩn. Duyệt ảnh từng cảnh trước khi tạo video.');return;}
  if(faceDirty.has(w.id))throw Error('Lưu ảnh chuẩn và gán cảnh trước khi duyệt hoặc render.');
  if(!faceViews.get(w.id).data.enabled)throw Error('Bật chế độ ảnh chuẩn rồi lưu để dùng quy trình này.');
  const scene=button.dataset.scene,item=faceViews.get(w.id).data.rows.find(r=>r.id===scene);
  if(action==='face-images'||action==='face-clips'){await watch(await api('/api/production/enqueue',{id:w.id,stage:action==='face-images'?'images':'clips',run:true}));}
  else if(action==='face-samples'){await watch(await api('/api/production/identity-samples',{id:w.id,scene}));}
  else if(action==='face-retry-image'||action==='face-retry-clip'){
   if(!confirm('Gửi yêu cầu tạo lại riêng cảnh này bằng prompt đã lưu? Yêu cầu mới có thể tốn tín dụng của tài khoản render; file cũ được giữ.'))return;
   await api('/api/production/identity-regenerate',{id:w.id,scene,kind:action==='face-retry-image'?'images':'clips'});
  }
  else{
   const kind=action.endsWith('-image')?'images':'clips',decision=action.includes('-approve-')?'approved':'rejected';
   if(kind==='clips'&&decision==='approved'&&!button.closest('[data-face-scene]').querySelector('[data-face-clip-watched]').checked)throw Error('Xem video và cả 3 khung rồi tích xác nhận trước khi duyệt.');
   await api('/api/production/identity-review',{id:w.id,scene,kind,token:kind==='images'?item.image_token:item.clip_token,decision});
  }
  await refresh(false);await faceLoad(productionCurrent(),true);
 })().catch(error=>toast(error.message,true)).finally(()=>button.disabled=false);
},true);
