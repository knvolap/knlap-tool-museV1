'use strict';
// Extend the existing application. Keep branding, navigation and established input forms.
const productionViews = new Map(), productionEdits = new Map(), productionSetup = new Set();
const productionRequests = new Map(), studioReferences = new Map();
let studioReferenceProject = project;
const productionBase = {film, storyboard, aff, settings, remember, workflowData, collectCharacters};
const productionActive = t => ['running','preparing','submitting','rendering','verifying','downloading'].includes(t.status);
const productionErrors = t => ['error','review','download_error'].includes(t.status);
function productionButton(text, action, extra='', cls='outline') { return btn(text,'pd-'+action,cls,extra); }
function productionStatus(value) {
  return ({preparing:'Chuẩn bị',rendering:'Đang tạo',verifying:'Kiểm tra file',download_error:'Lỗi tải',paused:'Tạm dừng',editing:'Đang dựng',queued:'Chờ',done:'Hoàn thành',error:'Lỗi',review:'Cần duyệt',draft:'Bản nháp',planning:'Đang lập kịch bản'})[value]||value;
}
function productionTask(w,key) { return S.tasks.find(t=>t.id===w.render_tasks?.[key]); }
function productionMedia(task) { return task?.outputs?.map(id=>S.media.find(m=>m.id===id)).filter(Boolean)||[]; }
function productionRows(w) { return w.module==='storyboard' ? w.scenes||[] : w.plan?.shots||[]; }
function productionClips(w) {
  return productionRows(w).map((row,index)=>({row,index,task:productionTask(w,'clip:'+row.id)}));
}
function productionThumb(media) {
  if (!media) return '<div class="pd-placeholder">Chưa có kết quả</div>';
  return media.kind==='video' ? `<video controls preload="metadata" src="/media/${esc(media.id)}" poster="/media/${esc(media.id)}/thumb"></video>` : `<img src="/media/${esc(media.id)}" alt="${esc(media.name)}">`;
}
function productionCurrent() { return S.workflows.find(w=>w.id===workflow); }
function productionStages(w) {
  if(w.module==='film') return [['script','1 · Kịch bản'],['audio','2 · Nhạc nền'],['characters','3 · Ảnh nhân vật'],['images','4 · Ảnh cảnh'],['clips','5 · Clip thoại'],['edit','6 · Dựng phim']];
  if(w.module==='aff') return [['product','1 · Sản phẩm'],['script','2 · Kịch bản'],['characters','3 · Người dẫn'],['images','4 · Storyboard'],['clips','5 · Clip'],['audio','6 · Âm thanh'],['captions','7 · Phụ đề / CTA'],['edit','8 · Dựng video'],['final','9 · Kiểm tra / Xuất']];
  return [['clips','Phân cảnh & Clip'],['characters','Nhân vật & Giọng'],['continuity','Mạch nối'],['audio','Âm thanh'],['edit','Nối phim, Nhạc & Phụ đề'],['final','Bản hoàn chỉnh']];
}
function productionWorkspace(w) {
  const view=productionViews.get(w.id)||(w.module==='aff'?'product':w.module==='film'?'script':'clips');
  const clips=productionClips(w), done=clips.filter(x=>x.task?.status==='done').length;
  const failed=Object.values(w.render_tasks||{}).map(id=>S.tasks.find(t=>t.id===id)).filter(t=>t&&productionErrors(t)).length;
  const ratio=w.ratio||'16:9';
  return pagebar(esc(w.name),names[w.module],productionButton('Thiết lập','setup')+productionButton('Nhập clip','import-clips')+productionButton('Xóa dự án','delete','','danger'))+
    `<div class="workspace">${side(w.module,w.module==='storyboard'?'Dàn phân cảnh mới':w.module==='aff'?'Video mới':'Phim mới')}<div class="content pd-content">
    <section class="panel pd-summary"><div class="section-heading"><div><h2>${esc(w.name)}</h2><small>${esc(productionStatus(w.status))} · ${esc(w.stage||'Dữ liệu được lưu trên máy')}</small></div><span class="badge">${esc(ratio)}</span></div>
    <div class="pd-stats"><div><b>${done}/${clips.length}</b><small>Clip đã tạo</small></div><div><b>${failed}</b><small>Tác vụ cần kiểm tra</small></div><div><b>${Number(w.estimated_duration||productionRows(w).reduce((n,r)=>n+Number(r.duration||0),0)).toFixed(1)}s</b><small>Thời lượng dự kiến</small></div><div><b>${w.actual_duration?Number(w.actual_duration).toFixed(2)+'s':'—'}</b><small>Bản dựng thực tế</small></div></div>
    <div class="pd-progress"><span style="width:${clips.length?done/clips.length*100:0}%"></span></div>
    <div class="actions">${productionButton('Chạy cảnh chưa xong','resume','','primary')}${productionButton('Chạy lại lỗi','retry')}${productionButton('Dừng dàn','pause','','danger')}${productionButton('Làm mới','refresh')}${productionButton('Thư mục kết quả','folder')}</div>
    ${w.error?`<p class="pd-error" role="status">${esc(w.error)}</p>`:''}
    </section><div class="pd-stages">${productionStages(w).map(([key,title])=>productionButton(title,'view',`data-view="${key}"`,view===key?'active':'')).join('')}</div>
    ${view==='identity'?faceWorkspace(w):view==='product'?productionProduct(w):view==='script'?productionScript(w):view==='characters'?productionCharacters(w):view==='continuity'?productionContinuity(w):['edit','audio','captions'].includes(view)?productionEditor(w,view):view==='final'?productionFinal(w):productionResults(w,view)}
    <details class="panel pd-events"><summary>Nhật ký dự án</summary>${(w.events||[]).slice(-20).reverse().map(e=>`<p><small>${new Date(e.time*1000).toLocaleTimeString('vi-VN')}</small> ${esc(e.text)}</p>`).join('')||'<p>Chưa có công đoạn chạy.</p>'}</details>
    </div></div>`;
}
function productionScript(w) {
  const shots=w.plan?.shots||[];
  return `<section class="panel"><div class="section-heading"><h3>Kịch bản · ${shots.length} shot</h3><div class="actions">${productionButton('Tạo kịch bản bằng Muse','plan')}${shots.length?productionButton(w.plan_approved?'Đã duyệt · Duyệt lại':'Duyệt kịch bản','approve-plan','','primary'):''}${productionButton('Nhập kịch bản có sẵn','import-plan')}</div></div>
    <p class="muted">Chạy từng bước sẽ dừng tại công đoạn bạn chọn. Các câu lệnh đã nhập được giữ nguyên.</p>${w.plan_needs_review?'<p class="pd-error">Thông tin sản phẩm đã thay đổi; kiểm tra và duyệt lại kịch bản.</p>':''}
    ${shots.length?`<div class="pd-shot-grid">${shots.map((s,i)=>`<article class="pd-shot" data-shot-editor="${esc(s.id)}"><div class="section-heading"><b>Shot ${i+1}</b><small>${esc(s.scene||'')}</small></div><label>Ảnh cảnh</label><textarea data-shot-field="image_prompt">${esc(s.image_prompt)}</textarea><label>Video / chuyển động</label><textarea data-shot-field="video_prompt">${esc(s.video_prompt)}</textarea><div class="grid two"><div><label>Thời lượng dự kiến (s)</label><input data-shot-field="duration" type="number" min="0.1" step="0.1" value="${Number(s.duration||5)}"></div><div><label>Người nói</label><input data-shot-field="speaker" value="${esc(s.speaker||'')}"></div></div><label>Lời thoại</label><textarea data-shot-field="dialogue">${esc(s.dialogue||'')}</textarea>${productionButton('Lưu shot','save-shot',`data-shot="${esc(s.id)}"`)}</article>`).join('')}</div>`:empty('Chưa có kịch bản','Tạo bằng kết nối Muse hoặc nhập dữ liệu cảnh đã chuẩn bị.')}</section>`;
}
function productionCharacters(w) {
  const chars=w.module==='storyboard'?w.characters||[]:w.plan?.characters||[];
  return `<section class="panel"><div class="section-heading"><h3>Hồ sơ nhân vật / người dẫn</h3>${w.module==='storyboard'?productionButton('Chỉnh hồ sơ','setup'):productionButton('Tạo ảnh nhân vật','enqueue','data-stage="characters"','primary')}</div><p class="notice">Ảnh tham chiếu và hồ sơ được dùng lại theo đúng nhân vật. Việc lưu mô tả giọng chưa chứng minh đã khóa được giọng; cần duyệt âm thanh thực tế.</p><div class="pd-result-grid">${chars.map(c=>{const m=productionMedia(productionTask(w,'character:'+(c.code||c.id)))[0];return `<article class="pd-shot">${c.ref?`<img class="pd-character-photo" src="/refs/${esc(c.ref)}" alt="Ảnh nhân vật">`:productionThumb(m)}<h3>${esc(c.name||c.code||c.id)}</h3><small>${esc(c.code||c.id)}</small><p>${esc(c.appearance||'')}</p><p>${esc(c.voice||'Chưa có giọng cố định')}</p><span class="badge">Giọng: Chưa xác minh</span></article>`}).join('')||'<p>Chưa có nhân vật; cảnh chỉ có sản phẩm/bối cảnh có thể không cần người dẫn.</p>'}</div></section>`;
}
function productionResults(w,view) {
  const isImage=view==='images', rows=productionRows(w), caption=isImage?'Ảnh cảnh / Storyboard':'Clip theo từng phân cảnh';
  return `<section class="panel"><div class="section-heading"><h3>${caption}</h3><div class="actions">${productionButton(isImage?'Tạo ảnh cảnh':'Tạo clip','enqueue',`data-stage="${isImage?'images':'clips'}"`,'primary')}${w.module==='storyboard'?productionButton('Tạo cảnh độc lập','independent'):''}${productionButton('Mở hậu kỳ','view','data-view="edit"')}</div></div><p class="muted">Kết quả luôn theo thứ tự cảnh/shot, không theo thời điểm render xong.</p><div class="pd-result-grid">${rows.map((row,i)=>{const t=productionTask(w,(isImage?'image:':'clip:')+row.id),m=productionMedia(t)[0];return `<article class="pd-shot"><div class="section-heading"><b>${w.module==='storyboard'?'Cảnh':'Shot'} ${String(i+1).padStart(2,'0')}</b><small>${esc(productionStatus(t?.status||'draft'))}</small></div>${m?productionThumb(m):row.refs?.[0]?`<img src="/refs/${esc(row.refs[0])}" alt="Storyboard cảnh ${i+1}">`:productionThumb(null)}<div class="pd-time"><span>Dự kiến: ${Number(row.duration||0)}s</span><span>File thật: ${m?.duration?Number(m.duration).toFixed(2)+'s':'—'}</span></div><p class="pd-prompt">${esc(row.prompt||row.video_prompt||'')}</p>${t?.error?`<p class="pd-error">${esc(t.error)}</p>`:''}${t?productionButton('Chi tiết tác vụ','task',`data-task="${esc(t.id)}"`):''}</article>`}).join('')||empty('Chưa có cảnh','Tạo hoặc nhập kịch bản trước.')}</div></section>`;
}
function productionContinuity(w) {
  return `<section class="panel"><div class="section-heading"><h3>Mạch nối và phụ thuộc cảnh</h3>${productionButton('Phân tích quan hệ đã nhập','continuity','','primary')}${productionButton('Phân tích ảnh bằng Muse','analyze')}</div><p class="notice">Cảnh nối trực tiếp cần kết quả cảnh trước. Hồi tưởng, nhảy thời gian và chuyển địa điểm được đánh dấu riêng. Nhận xét AI và bản đồ nối chưa thay thế việc duyệt video thật.</p>${(w.scenes||[]).map((s,i)=>`<div class="pd-continuity"><b>Cảnh ${i+1}</b><select data-pd-transition="${esc(s.id)}">${[['opening','Mở đầu'],['direct','Nối trực tiếp'],['cut','Chuyển góc / địa điểm'],['time_jump','Nhảy thời gian'],['flashback','Hồi tưởng']].map(([v,t])=>`<option value="${v}" ${(s.transition||(i?'direct':'opening'))===v?'selected':''}>${t}</option>`).join('')}</select><span>${esc(s.opening||'Chưa ghi khung mở đầu')}</span><span>→ ${esc(s.ending||'Chưa ghi khung kết thúc')}</span><span class="badge">${s.analysis?'Có nhận xét AI · cần duyệt':'Chưa xác minh hình/tiếng'}</span></div>${s.analysis?`<details><summary>Nhận xét ảnh cảnh ${i+1}</summary><pre class="result">${esc(JSON.stringify(s.analysis,null,2))}</pre></details>`:''}`).join('')}${productionButton('Lưu loại chuyển cảnh','save-transitions')}</section>`;
}
function productionProduct(w) {
  const p=w.product_profile||{};
  return `<section class="panel"><div class="section-heading"><h3>Dữ liệu sản phẩm</h3><div class="actions">${w.source==='link'?productionButton('Đọc dữ liệu link Shopee','product'):''}${productionButton('Sửa ảnh / thông tin','setup')}${productionButton('Tôi xác nhận dữ liệu này','confirm-product','','primary')}</div></div><div class="pd-product-pics">${(w.product_refs||[]).map(id=>`<img src="/refs/${esc(id)}" alt="Ảnh thật sản phẩm">`).join('')}</div><h2>${esc(w.product_name||'Chưa có tên sản phẩm')}</h2><p style="white-space:pre-wrap">${esc(w.product_info||'Chưa có thông tin sản phẩm')}</p><p>Giá nhập: <b>${esc(w.price||'Chưa có')}</b> · Trạng thái: <b>${p.verification==='USER_CONFIRMED'?'Đã được bạn xác nhận':'Chưa xác nhận'}</b></p><p class="muted">Kiểm tra đúng phân loại, ảnh, giá và công dụng. Hai nguồn nhập dùng chung hồ sơ sản phẩm và quy trình phía sau.</p>${productionButton('Tiếp tục tới kịch bản','view','data-view="script"')}</section>`;
}
function productionEdit(w) {
  if(!productionEdits.has(w.id)) {
    const config=structuredClone(w.edit_config||{});
    if(!config.clips?.length) config.clips=productionClips(w).map(({task})=>productionMedia(task)[0]).filter(Boolean).map(m=>({media:m.id,enabled:true,start:0,end:m.duration}));
    config.music_mode??=w.music||'none';config.music_gain??=.22;config.voice_gain??=1;config.fps??=24;
    config.burn_subtitles??=!!w.subtitles;config.srt??='';config.tracks??=[];
    productionEdits.set(w.id,config);
  }
  return productionEdits.get(w.id);
}
function productionCollectEdit(w) {
  const form=$('#pd-edit-form'), c=productionEdit(w);
  if(!form) return c;
  for(const el of form.querySelectorAll('[data-edit-field]')) c[el.dataset.editField]=el.type==='checkbox'?el.checked:el.type==='number'||el.type==='range'?Number(el.value):el.value;
  form.querySelectorAll('[data-timeline-row]').forEach(el=>{
    const row=c.clips[Number(el.dataset.timelineRow)];row.enabled=el.querySelector('[data-cut-enabled]').checked;
    row.start=Number(el.querySelector('[data-cut-start]').value);row.end=Number(el.querySelector('[data-cut-end]').value);
  });
  form.querySelectorAll('[data-track-row]').forEach(el=>{
    const row=c.tracks[Number(el.dataset.trackRow)];row.audio=el.querySelector('[data-track-audio]').value;
    row.role=el.querySelector('[data-track-role]').value;row.start=Number(el.querySelector('[data-track-start]').value);row.gain=Number(el.querySelector('[data-track-gain]').value);
  });
  return c;
}
function productionEditor(w,view) {
  const c=productionEdit(w), media=S.media.filter(m=>m.project===w.project&&m.kind==='video'), audio=(S.audio||[]).filter(a=>a.project===w.project);
  const duration=c.clips.reduce((n,r)=>n+(r.enabled===false?0:Math.max(0,Number(r.end)-Number(r.start))),0)+(w.module==='aff'&&w.end_card?3:0);
  return `<form id="pd-edit-form" class="panel pd-editor"><div class="section-heading"><h3>Nối phim · Nhạc · Phụ đề</h3><div class="actions">${productionButton('Thêm clip có sẵn','add-clip')}${productionButton('Nhập clip từ máy','import-clips')}</div></div>
    <p class="notice">Thời lượng theo đoạn cắt: <b data-edit-duration>${duration.toFixed(2)} giây</b>${w.module==='aff'&&w.end_card?' · Đã tính 3 giây khung kết sản phẩm.':''} · Không tự kéo giãn hình hoặc tiếng để ép thời lượng.</p>
    <div class="pd-timeline">${c.clips.map((r,i)=>{const m=media.find(m=>m.id===r.media);return `<div class="pd-timeline-row" data-timeline-row="${i}"><label><input type="checkbox" data-cut-enabled ${r.enabled!==false?'checked':''}>${i+1}</label>${m?`<img src="/media/${esc(m.id)}/thumb" alt="Clip ${i+1}"><span>${esc(m.name)}<small>File thật: ${Number(m.duration).toFixed(2)}s</small></span>`:'<span class="pd-error">Clip không còn tồn tại</span>'}<div><label>Bắt đầu (s)</label><input type="number" data-cut-start step="0.01" min="0" value="${Number(r.start||0)}"></div><div><label>Kết thúc (s)</label><input type="number" data-cut-end step="0.01" min="0" value="${Number(r.end||0)}"></div><div>${productionButton('↑','move-clip',`data-index="${i}" data-direction="-1"`)}${productionButton('↓','move-clip',`data-index="${i}" data-direction="1"`)}${productionButton('×','remove-clip',`data-index="${i}"`)}</div></div>`}).join('')||'<p>Chưa có clip. Chạy tạo clip hoặc nhập file thật từ máy.</p>'}</div>
    <div class="grid two pd-audio-subtitles"><section class="pd-inset"><h3>Phụ đề theo bản dựng</h3><div class="actions">${productionButton('Nhập SRT','import-srt')}${productionButton('Tạo nháp từ thoại','draft-srt')}</div><label><input type="checkbox" data-edit-field="burn_subtitles" ${c.burn_subtitles?'checked':''}> Chèn phụ đề vào hình</label><textarea data-edit-field="srt" class="pd-srt" placeholder="Nhập SRT theo thoại cuối cùng; chỉnh timestamp theo các đoạn cắt.">${esc(c.srt)}</textarea><small>Bản nháp từ thoại cần được nghe và duyệt lại. Khi tắt chèn, SRT đã nhập vẫn được xuất riêng.</small></section>
    <section class="pd-inset"><h3>Âm thanh và thông số dựng</h3><label>Nhạc nền</label><select data-edit-field="music_mode">${[['none','Không nhạc'],['file','File của tôi'],['muse','Muse tạo · cần kết nối engine nhạc']].map(([v,t])=>`<option value="${v}" ${c.music_mode===v?'selected':''}>${t}</option>`).join('')}</select><label>File nhạc của dự án</label><select data-edit-field="music_id"><option value="">Chưa chọn</option>${audio.map(a=>`<option value="${esc(a.id)}" ${c.music_id===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select>${productionButton('Tải file âm thanh','import-audio')}<label>Âm lượng nhạc (0–1)</label><input data-edit-field="music_gain" type="number" step="0.01" min="0" max="1" value="${c.music_gain}"><label>Âm lượng âm thanh gốc (0–2)</label><input data-edit-field="voice_gain" type="number" step="0.05" min="0" max="2" value="${c.voice_gain}"><label><input type="checkbox" data-edit-field="ducking" ${c.ducking!==false?'checked':''}> Giảm nhạc khi âm thanh gốc nổi lên</label><label>FPS đầu ra</label><input data-edit-field="fps" type="number" min="24" max="60" value="${c.fps}">${w.module==='aff'?`<label><input type="checkbox" data-edit-field="allow_duration_variance" ${c.allow_duration_variance?'checked':''}> Tôi chấp nhận xuất theo thời lượng thật khác mục tiêu</label>`:''}</section></div>
    <section class="pd-inset"><div class="section-heading"><h3>Thoại riêng · Môi trường · SFX</h3>${productionButton('Thêm lớp âm thanh','add-track')}</div>${c.tracks.map((r,i)=>`<div class="pd-audio-track" data-track-row="${i}"><select data-track-audio><option value="">Chọn file</option>${audio.map(a=>`<option value="${esc(a.id)}" ${r.audio===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select><select data-track-role>${[['voice','Thoại'],['ambience','Môi trường'],['sfx','SFX']].map(([v,t])=>`<option value="${v}" ${r.role===v?'selected':''}>${t}</option>`).join('')}</select><div><label>Bắt đầu (s)</label><input type="number" data-track-start min="0" step="0.01" value="${Number(r.start||0)}"></div><div><label>Âm lượng (0–2)</label><input type="number" data-track-gain min="0" max="2" step="0.05" value="${Number(r.gain??1)}"></div>${productionButton('×','remove-track',`data-index="${i}"`)}</div>`).join('')}<small>Kiểm tra âm thanh sẵn trong clip để tránh lồng thoại hoặc hiệu ứng trùng.</small></section>
    ${w.module==='aff'?`<p class="notice">Khung kết: ${w.end_card?'Bật · ảnh thật sản phẩm, nội dung đã xác nhận':'Tắt'} · Nhãn AI: ${w.ai_label?'Bật':'Tắt'} · Quảng cáo: ${w.ad_label?'Bật':'Tắt'}. Nút mua trong MP4 là hình minh họa; link thật đi kèm caption.</p>`:''}
    <div class="actions">${productionButton('Lưu chỉnh sửa','save-edit')}${productionButton('Nối cảnh & xuất phim','export','','primary')}</div><div class="pd-progress"><span style="width:${Number(w.editing_progress||0)}%"></span></div><small>${w.status==='editing'?'Đang dựng':'Tiến độ dựng'}: ${Number(w.editing_progress||0)}% · Dữ liệu từ FFmpeg</small>
    ${w.final_output?productionFinal(w):''}</form>`;
}
function productionFinal(w) {
  const m=S.media.find(m=>m.id===w.final_output);
  return `<section class="panel pd-final"><h3>Bản phim hoàn chỉnh</h3>${m?productionThumb(m):empty('Chưa có bản dựng','Chọn clip trong phần Nối phim, Nhạc & Phụ đề rồi xuất.')} ${m?`<p>${esc(m.name)} · ${m.width}×${m.height} · ${Number(m.duration).toFixed(2)}s</p><div class="actions">${btn('Mở file','open-media','outline',`data-id="${esc(m.id)}"`)}<a class="banner-link" download="${esc(m.name)}" href="/media/${esc(m.id)}">Tải MP4</a></div><p>File đã kiểm tra kỹ thuật. Duyệt nội dung sau khi xem và nghe:</p><div class="checks pd-review">${[['visual','Đúng hình / nhân vật'],['voice','Đúng thoại và giọng'],['continuity','Mạch cảnh hợp lý'],...(w.module==='aff'?[['product','Đúng sản phẩm / bao bì'],['claims','Thông tin quảng cáo đúng'],['cta','CTA và nhãn đúng']]:[])].map(([k,t])=>`<label><input type="checkbox" data-final-check="${k}" ${w.final_reviewed?'checked':''}>${t}</label>`).join('')}</div>${productionButton(w.final_reviewed?'Đã duyệt hoàn thành':'Tôi đã kiểm tra · Chốt hoàn thành','review-output','','primary')}`:''}</section>`;
}
for(const module of ['film','storyboard','aff']) {
  const base=productionBase[module];
  globalThis[module]=function(){
    const w=S.workflows.find(w=>w.id===workflow&&w.module===module);
    if(w&&!productionSetup.has(w.id)) return productionWorkspace(w);
    let html=base();
    if(module==='aff') html=html.replace('Video bán hàng từ link Shopee','Video bán hàng từ sản phẩm');
    if(w) html=pagebar('Thiết lập dự án',esc(w.name),productionButton('Về dự án','back'))+html;
    return html;
  };
}
workflowData=function(module){const data=productionBase.workflowData(module);const w=productionCurrent();if(w&&w.module===module)data.project=w.project;return data;};
collectCharacters=function(){const old=storyModel().characters||[];return productionBase.collectCharacters().map(c=>({...old.find(x=>x.id===c.id),...c}));};
remember=function(){
  productionBase.remember();
  if(tab==='studio'&&$('#prompts')){drafts.studio.ratio=$('[name="task-ratio"]')?.value||'16:9';drafts.studio.count=$('[name="task-count"]')?.value||'1';studioReferences.set(project,{refs:[...refIds],draft:structuredClone(drafts.studio),kind,mapping});}
  const w=productionCurrent();if(w&&$('#pd-edit-form'))productionCollectEdit(w);
};
settings=function(){
  const html=productionBase.settings();
  const options=S.settings.render_options||{};
  return html.replace('</form>',`<section class="panel advanced"><div class="section-heading"><h3>Kết nối Muse</h3>${productionButton('Điền cấu hình Muse Chat','muse-preset')}</div><label>Cách gửi tác vụ</label><select name="render_adapter"><option value="native" ${options.adapter!=='muse_chat'?'selected':''}>Điều khiển các nút của công cụ</option><option value="muse_chat" ${options.adapter==='muse_chat'?'selected':''}>Muse Chat · thông số gửi riêng, prompt giữ nguyên</option></select><label><input type="checkbox" name="chat_settings_approved" ${options.chat_settings_approved?'checked':''}> Tôi đồng ý gửi thông số bằng một tin riêng trước prompt gốc</label><p class="muted">Muse Chat tiếp nhận thông số bằng hội thoại. App kiểm tra số file, loại và tỷ lệ thật sau khi tải; thời lượng Muse trả về có thể khác yêu cầu. Đăng nhập trong profile trên máy chạy app, rồi Kiểm tra cookie và Thả trình duyệt.</p></section><details class="panel advanced"><summary>Kết nối render · dành cho quản trị</summary><p>Mẫu Muse Chat được đối chiếu với giao diện thật. Cấu hình tùy chỉnh cần kiểm tra lại trên tài khoản của bạn.</p><p class="muted">Selector JSON: authenticated, prompt, send, output, busy, upload, uploadReady, assistantText. Kết nối điều khiển nút còn dùng mode_image, mode_video, mode_image_video, ratio, count; startFrame khi có khả năng tương ứng.</p>${area('Khả năng render (JSON)','render_options',JSON.stringify(options.max_refs?options:{max_refs:1,start_frame:false},null,2))}<p>Prompt luôn được gửi nguyên văn. Các mẫu lệnh cũ chỉ giữ để tham khảo, không tự ghép vào prompt.</p></details></form>`);
};
function productionTaskDetail(id) {
  const t=S.tasks.find(t=>t.id===id);if(!t)throw Error('Không tìm thấy tác vụ.');
  modal('Tác vụ '+(t.sequence||'')+' · '+productionStatus(t.status),`<p>Mã: ${esc(t.id)} · Kết quả: ${t.outputs?.length||0}/${t.count}</p><pre class="result">${esc(t.prompt)}</pre>${t.configuration?`<p class="muted">Thông số gửi riêng: ${esc(t.configuration.mode)} · ${esc(t.configuration.aspect_ratio)} · ${Number(t.configuration.results)} kết quả.</p>`:''}${t.duration_warning?`<p class="notice">${esc(t.duration_warning)}</p>`:''}${t.error?`<p class="pd-error">${esc(t.error)}</p>`:''}<div class="actions">${productionButton('Sao chép prompt gốc','copy-prompt',`data-task="${esc(id)}"`)}${productionErrors(t)||t.status==='paused'?productionButton('Tiếp tục nhận / tải kết quả','resume-task',`data-task="${esc(id)}"`):''}${productionErrors(t)&&(t.submitted_at||t.configuration_submitted_at)?productionButton('Đã kiểm tra Muse · Gửi lại','resubmit-task',`data-task="${esc(id)}"`,'danger'):''}</div><div class="pd-result-grid">${productionMedia(t).map(productionThumb).join('')}</div>`);
}
async function productionUpload(w,kind) {
  pick(kind==='audio'?'.wav,.mp3,.m4a':'.mp4,.mov,.mkv',true,async files=>{
    const added=[];
    for(const f of files){const r=await fetch('/api/upload?kind='+kind+'&project='+encodeURIComponent(w.project)+'&name='+encodeURIComponent(f.name),{method:'POST',body:f});const v=await r.json();if(!r.ok)throw Error(v.error);added.push(v);}
    if(kind==='media'){const c=productionEdit(w);for(const m of added)c.clips.push({media:m.id,enabled:true,start:0,end:m.duration});}
    await refresh();toast('Đã nhập file thật vào đúng dự án.');
  });
}
async function productionClick(button) {
  const action=button.dataset.action.slice(3), w=productionCurrent();
  if(action==='muse-preset'){
    const preset=S.render_presets?.muse_chat;if(!preset)throw Error('Chưa có mẫu cấu hình Muse Chat.');
    $('[name="muse_url"]').value=preset.muse_url;$('[name="selectors"]').value=JSON.stringify(preset.selectors,null,2);
    $('[name="render_options"]').value=JSON.stringify(preset.render_options,null,2);$('[name="render_adapter"]').value='muse_chat';
    $('[name="chat_settings_approved"]').checked=false;toast('Đã điền mẫu. Xem thông tin, chọn đồng ý gửi thông số riêng và bấm Lưu cài đặt.');return;
  }
  if(action==='view'){if(w)productionCollectEdit(w);productionViews.set(w.id,button.dataset.view);draw();return;}
  if(action==='setup'){productionSetup.add(w.id);delete drafts[w.module];draw();return;}
  if(action==='back'){productionSetup.delete(w.id);draw();return;}
  if(action==='refresh'){await refresh();return;}
  if(action==='folder'){await api('/api/open',{project:w.project});return;}
  if(action==='delete'){if(confirm('Xóa dự án và tác vụ khỏi danh sách? File đã lưu vẫn được giữ.')){await api('/api/workflow/delete',{id:w.id});workflow=null;delete drafts[w.module];await refresh();}return;}
  if(action==='import-clips'||action==='import-audio'){productionCollectEdit(w);await productionUpload(w,action==='import-audio'?'audio':'media');return;}
  if(action==='move-clip'||action==='remove-clip'){const c=productionCollectEdit(w),i=Number(button.dataset.index),j=i+Number(button.dataset.direction);if(action==='remove-clip')c.clips.splice(i,1);else if(j>=0&&j<c.clips.length)[c.clips[i],c.clips[j]]=[c.clips[j],c.clips[i]];draw();return;}
  if(action==='add-clip'){productionCollectEdit(w);modal('Thêm clip của dự án',`<select id="pd-choose-clip">${S.media.filter(m=>m.project===w.project&&m.kind==='video').map(m=>`<option value="${esc(m.id)}">${esc(m.name)} · ${m.duration}s</option>`).join('')}</select>${productionButton('Thêm vào timeline','choose-clip')}`);return;}
  if(action==='choose-clip'){const m=S.media.find(m=>m.id===$('#pd-choose-clip').value);if(!m)throw Error('Chọn clip trước.');productionEdit(w).clips.push({media:m.id,start:0,end:m.duration,enabled:true});$('#modal').close();draw();return;}
  if(action==='add-track'||action==='remove-track'){const c=productionCollectEdit(w);if(action==='add-track')c.tracks.push({audio:'',role:'sfx',start:0,gain:1});else c.tracks.splice(Number(button.dataset.index),1);draw();return;}
  if(action==='import-srt'){productionCollectEdit(w);pick('.srt',false,async files=>{productionEdit(w).srt=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await files[0].arrayBuffer());draw();});return;}
  if(action==='draft-srt'){
    const c=productionCollectEdit(w), clips=productionClips(w);let position=0,index=1,raw='';
    const clock=v=>{const n=Math.round(v*1000);return `${String(Math.floor(n/3600000)).padStart(2,'0')}:${String(Math.floor(n/60000)%60).padStart(2,'0')}:${String(Math.floor(n/1000)%60).padStart(2,'0')},${String(n%1000).padStart(3,'0')}`;};
    for(const r of c.clips){if(r.enabled===false)continue;const duration=r.end-r.start,match=clips.find(x=>x.task?.outputs?.includes(r.media)),text=match?.row.dialogue||'';if(text.trim())raw+=`${index++}\n${clock(position)} --> ${clock(position+duration)}\n${text}\n\n`;position+=duration;}
    if(!raw)throw Error('Chưa có lời thoại riêng theo shot để tạo bản nháp. Nhập SRT từ âm thanh thực tế.');
    c.srt=raw;draw();toast('Đã tạo nháp theo clip; cần nghe và sửa timestamp trước khi chèn.');return;
  }
  if(action==='save-edit'||action==='export'){const config=productionCollectEdit(w);const result=await api('/api/production/'+(action==='export'?'export':'timeline'),{id:w.id,config});if(action==='export')await watch(result);else{await refresh();toast('Đã lưu đoạn cắt, thứ tự và âm thanh.');}return;}
  if(action==='save-shot'){
    const editor=document.querySelector(`[data-shot-editor="${CSS.escape(button.dataset.shot)}"]`),old=w.plan.shots.find(s=>s.id===button.dataset.shot),values={};
    editor.querySelectorAll('[data-shot-field]').forEach(el=>{const k=el.dataset.shotField;values[k]=el.value===normalizeLines(old[k])?old[k]:el.value;});
    await api('/api/production/shot',{id:w.id,shot_id:old.id,values});await refresh();return;
  }
  if(action==='save-transitions'){const data=structuredClone(w);document.querySelectorAll('[data-pd-transition]').forEach(el=>{data.scenes.find(s=>s.id===el.dataset.pdTransition).transition=el.value;});await api('/api/workflow/save',data);await refresh();return;}
  if(action==='save-roles'){const data=structuredClone(w);data.reference_roles={};document.querySelectorAll('[data-reference-role]').forEach(el=>data.reference_roles[el.dataset.referenceRole]=el.value);await api('/api/workflow/save',data);await refresh();return;}
  if(action==='task'){productionTaskDetail(button.dataset.task);return;}
  if(action==='copy-prompt'){await navigator.clipboard.writeText(S.tasks.find(t=>t.id===button.dataset.task).prompt);toast('Đã sao chép nguyên văn prompt.');return;}
  if(action==='resume-task'||action==='resubmit-task'){
    if(action==='resubmit-task'&&!confirm('Bạn đã kiểm tra Muse và chấp nhận tạo lại tác vụ này?'))return;
    const id=button.dataset.task;await api('/api/tasks/action',{ids:[id],action:action==='resume-task'?'resume':'resubmit',reviewed:action==='resubmit-task'});
    await api('/api/queue/start',{ids:[id]});$('#modal').close();await refresh();return;
  }
  if(action==='review-output'){const checks={};document.querySelectorAll('[data-final-check]').forEach(el=>checks[el.dataset.finalCheck]=el.checked);await api('/api/production/review-output',{id:w.id,checks});await refresh();return;}
  if(action==='import-plan'){modal('Nhập kịch bản có sẵn',`<p>Nhập JSON gồm characters và shots. Mỗi shot có image_prompt, video_prompt, duration và dialogue nếu có. Prompt được giữ nguyên.</p><textarea id="pd-plan-json" class="result" placeholder='{"characters":[],"shots":[{"image_prompt":"...","video_prompt":"...","duration":5}]}'></textarea>${productionButton('Lưu kịch bản để duyệt','save-plan','','primary')}`);return;}
  if(action==='save-plan'){await api('/api/production/import-plan',{id:w.id,plan:JSON.parse($('#pd-plan-json').value)});$('#modal').close();await refresh();return;}
  if(action==='independent'&&!confirm('Tạo các cảnh độc lập và tự duyệt mạch nối sau khi nhận clip?'))return;
  if(['enqueue','independent','plan','continuity','analyze','approve-plan','pause','resume','retry','confirm-product','product'].includes(action)){
    const endpoint=action==='independent'?'enqueue':action;
    await watch(await api('/api/production/'+endpoint,{id:w.id,stage:button.dataset.stage||'clips',independent:action==='independent'}));
    productionEdits.delete(w.id);await refresh();return;
  }
  throw Error('Thao tác chưa được hỗ trợ.');
}
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b||!b.dataset.action.startsWith('pd-'))return;
  event.preventDefault();event.stopImmediatePropagation();if(b.disabled)return;b.disabled=true;
  Promise.resolve(productionClick(b)).catch(e=>toast(e.message,true)).finally(()=>b.disabled=false);
},true);
document.addEventListener('input',event=>{const w=productionCurrent();if(w&&event.target.closest('#pd-edit-form')){const c=productionCollectEdit(w),duration=c.clips.reduce((n,r)=>n+(r.enabled===false?0:Math.max(0,r.end-r.start)),0)+(w.module==='aff'&&w.end_card?3:0);const label=$('[data-edit-duration]');if(label)label.textContent=duration.toFixed(2)+' giây';}});
// Handle existing controls whose semantics changed: scoped queue, durable retries and exact prompts.
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
  if(!['create-run','create-only','queue-start','queue-stop','retry','task-detail','open-output','workflow-save','workflow-auto','story-run','save-settings','product-open','product-helper'].includes(a))return;
  event.preventDefault();event.stopImmediatePropagation();if(b.disabled)return;b.disabled=true;
  (async()=>{
    remember();
    if(a==='create-run'||a==='create-only'){
      const raw=rawFile??$('#prompts').value,delimiter=$('#delimiter').value;
      if(delimiter&&!raw.split(/\r\n|\n|\r/).includes(delimiter)&&!confirm('Không có dòng phân cách hợp lệ. Xử lý toàn bộ văn bản thành một prompt?'))return;
      const data={raw,delimiter,project,kind,mapping,refs:[...refIds],ratio:$('[name="task-ratio"]').value,count:Number($('[name="task-count"]').value),run:a==='create-run',provider:$('#studio-provider')?.value||'muse',render_model:$('#studio-model')?.value||''};
      const key=JSON.stringify(data);if(!productionRequests.has(key))productionRequests.set(key,crypto.randomUUID());data.request_id=productionRequests.get(key);
      await api('/api/tasks/bulk',data);productionRequests.delete(key);await refresh();toast(a==='create-only'?'Đã thêm; các tác vụ mới chưa được phép render.':'Đã thêm và khởi động tác vụ.');return;
    }
    if(a==='queue-start'){await api('/api/queue/start',{project,ids:selected.size?[...selected]:undefined});await refresh();return;}
    if(a==='queue-stop'){await api('/api/queue/stop',tab==='studio'?{project}:{});await refresh();return;}
    if(a==='retry'){const ids=S.tasks.filter(t=>t.project===project&&productionErrors(t)&&(!selected.size||selected.has(t.id))).map(t=>t.id);await api('/api/tasks/action',{ids,action:'retry'});await refresh();toast('Đã đưa tác vụ lỗi đủ điều kiện về hàng chờ; bấm Chạy để xử lý.');return;}
    if(a==='task-detail'){productionTaskDetail(b.dataset.id);return;}
    if(a==='open-output'){await api('/api/open',{project});return;}
    if(a==='save-settings'){
      const d=formData();d.selectors=JSON.parse(d.selectors);d.render_options=JSON.parse(d.render_options||'{}');d.templates={};
      d.render_options.adapter=d.render_adapter||'native';d.render_options.chat_settings_approved=!!d.chat_settings_approved;delete d.render_adapter;delete d.chat_settings_approved;
      for(const k of Object.keys(S.settings.templates)){d.templates[k]=d['template_'+k];delete d['template_'+k];}
      d.raw_prompt=true;for(const k of ['image_timeout','video_timeout','retries','reminders','pause','quota_limit','idle_minutes'])d[k]=Number(d[k]);await api('/api/settings',d);await refresh();toast('Đã lưu cài đặt; prompt luôn được giữ nguyên.');return;
    }
    if(a==='product-helper'){modal('Nhập sản phẩm Shopee','<p>Lưu dự án có link Shopee, chọn Đọc dữ liệu link Shopee trong phần Sản phẩm. Tool chỉ đọc trang truy cập được; nếu trang chặn, chuyển sang Ảnh + thông tin.</p>');return;}
    if(a==='product-open'){const url=$('[name="product_link"]').value;if(!/^https:\/\/(?:[\w-]+\.)?(?:shopee\.vn|shp\.ee)\//.test(url))throw Error('Nhập link Shopee HTTPS hợp lệ.');window.open(url,'_blank','noopener');return;}
    const module=b.dataset.module||'storyboard',w=await api('/api/workflow/save',workflowData(module));workflow=w.id;drafts[module]=structuredClone(w);productionSetup.delete(w.id);productionEdits.delete(w.id);await refresh();
    if(a==='workflow-save'){toast('Đã lưu dự án; chọn từng công đoạn để tiếp tục.');return;}
    if(a==='story-run'){await api('/api/production/enqueue',{id:w.id,stage:'clips',run:true});await refresh();return;}
    await watch(await api('/api/workflow/start',{id:w.id}));
  })().catch(e=>toast(e.message,true)).finally(()=>b.disabled=false);
},true);
// Preserve independent Studio drafts and reference selections when switching projects.
const productionStudio=studio;
studio=function(){
  if(studioReferenceProject!==project){const saved=studioReferences.get(project);refIds=new Set(saved?.refs||[]);drafts.studio=saved?.draft||{};if(saved){kind=saved.kind;mapping=saved.mapping;}studioReferenceProject=project;}
  return productionStudio();
};
// Keep the setup form open while its import/count controls save intermediate drafts.
const productionApi=api;
api=async function(path,data){const result=await productionApi(path,data);if(path==='/api/workflow/save'&&tab==='storyboard'&&document.querySelector('.story-form'))productionSetup.add(result.id);return result;};
const productionContinuityBase=productionContinuity;
productionContinuity=function(w){return `<section class="panel"><h3>Vai trò ảnh gốc</h3><div class="pd-result-grid">${(w.original_refs||[]).map(id=>`<div class="pd-shot"><img src="/refs/${esc(id)}" alt="Ảnh gốc"><label>Vai trò tham chiếu</label><select data-reference-role="${esc(id)}">${[['character','Nhân vật'],['environment','Bối cảnh'],['style','Phong cách']].map(([v,t])=>`<option value="${v}" ${(w.reference_roles?.[id]||'character')===v?'selected':''}>${t}</option>`).join('')}</select></div>`).join('')}</div>${productionButton('Lưu vai trò ảnh gốc','save-roles')}${w.reference_analysis?`<details><summary>Phân tích Muse · đề xuất cần duyệt</summary><pre class="result">${esc(JSON.stringify(w.reference_analysis,null,2))}</pre></details>`:''}</section>`+productionContinuityBase(w);};
