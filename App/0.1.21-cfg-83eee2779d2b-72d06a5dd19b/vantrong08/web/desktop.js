'use strict';
// Small additions to the existing UI; project and prompt editors stay intact.
const desktopAccounts=accounts, desktopSettings=settings, desktopRefresh=refresh;
accounts=function(){
  let html=desktopAccounts();
  for(const account of S.accounts){
    // Add one main action ahead of the existing advanced account controls.
    const marker=`<tr><td><input type="checkbox" data-account-toggle="${account.id}"`;
    if(html.includes(marker)){
      const at=html.indexOf(marker),end=html.indexOf('</tr>',at);
      const row=html.slice(at,end), actionAt=row.lastIndexOf('<td>');
      if(actionAt>=0){const insert=at+actionAt+4;html=html.slice(0,insert)+btn('Kết nối '+(account.provider==='flow'?'Flow':account.provider==='gemini'?'Gemini':'Muse'),'account-connect','primary',`data-id="${account.id}"`)+html.slice(insert);}
    }
  }
  return `<div class="notice">Bấm <b>Kết nối Muse</b> và đăng nhập trong cửa sổ được mở. App tự xác minh rồi chuyển sang sẵn sàng; không cần Kiểm tra cookie và Thả.</div>`+html;
};
function desktopUpdateContent(){
  const u=S.updates||{},r=u.release;
  return `<section class="panel"><h3>Cập nhật phiên bản</h3><p>Bản đang dùng: <b>${esc(S.version)}</b></p>${u.error?`<p>${esc(u.error)}</p>`:''}${r?`<p>Có bản <b>${esc(r.version)}</b> · ${(r.size/1048576).toFixed(1)} MB</p><p style="white-space:pre-wrap">${esc(r.notes)}</p>`:'<p>'+esc(u.message||'Chưa có bản mới được công bố.')+'</p>'}${u.stage==='downloading'?`<p>Đang tải ${u.progress}%</p>`:''}<div class="actions">${btn('Kiểm tra cập nhật','desktop-check')}${r?btn(u.downloaded?'Tải lại / Kiểm tra':'Tải bản mới','desktop-download','primary')+btn('Để sau','desktop-defer'):''}${u.downloaded?btn('Cài bản mới','desktop-install','primary'):''}</div><p class="muted">Cập nhật là tùy chọn. Để sau vẫn dùng bản hiện tại. Key, cài đặt và dự án được giữ.</p></section>`;
}
settings=function(){return desktopSettings()+desktopUpdateContent();};
let desktopNotified=new Set();
refresh=async function(render=true){
  await desktopRefresh(render);
  if(tab==='accounts'&&render===false&&!$('#modal').open)draw();
  const u=S.updates||{},r=u.release;
  if(r&&u.available&&u.deferred!==r.version&&!desktopNotified.has(r.version)){
    desktopNotified.add(r.version);
    toast('Có bản '+r.version+'. Vào Cài đặt để xem và cập nhật khi thuận tiện.');
  }
};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(action!=='account-connect'&&!action.startsWith('desktop-')&&action!=='check-updates')return;
  event.preventDefault();event.stopImmediatePropagation();if(button.disabled)return;button.disabled=true;
  (async()=>{
    if(action==='account-connect'){
      const account=S.accounts.find(a=>a.id===button.dataset.id);
      if(account?.provider&&account.provider!=='muse'){
        const config=S.providers?.[account.provider],ready=!!config?.selectors?.authenticated&&!!config?.selectors?.prompt;
        await watch(await api(ready?'/api/accounts/connect':'/api/accounts/action',{id:account.id,action:'login'}));await refresh();if(!ready)toast('Đã mở đăng nhập. Đối chiếu cấu hình trong Cài đặt → Kết nối tài khoản Google.',true);return;
      }
      const missing=!S.settings.selectors?.authenticated||!S.settings.selectors?.prompt||(S.settings.render_options?.adapter==='muse_chat'&&!S.settings.render_options?.chat_settings_approved);
      if(missing&&!confirm('Kết nối https://muse.ai/ bằng trình duyệt riêng của tài khoản. App sẽ gửi thông số trong một tin riêng trước prompt nguyên văn. Đồng ý thiết lập?'))return;
      await watch(await api('/api/accounts/connect',{id:button.dataset.id,approved:missing}));await refresh();return;
    }
    if(action==='desktop-defer'){const result=await api('/api/updates/defer',{});await refresh();toast(result.message);return;}
    if(action==='desktop-install'){
      if(!confirm('Đóng app và mở bộ cài mới? Hãy đợi mọi tác vụ hoàn tất. Key, cấu hình và dự án được giữ.'))return;
      const result=await api('/api/updates/install',{});toast(result.message);return;
    }
    await watch(await api(action==='desktop-download'?'/api/updates/download':'/api/updates',{}));
    await refresh();if(action==='check-updates'){tab='settings';draw();}
  })().catch(error=>toast(error.message,true)).finally(()=>button.disabled=false);
},true);
