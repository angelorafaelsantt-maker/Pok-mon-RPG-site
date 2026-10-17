// Inserido no app.js pela atualização v15 (usa estado, renderização e sessão existentes).
function coTrainerField(name, label, value, editable, long=false, placeholder='') {
  const val=esc(value ?? '');
  if (!editable) return `<div class="co-sheet-field ${long?'co-sheet-field-long':''}"><span class="co-sheet-label">${esc(label)}</span><div class="co-sheet-read ${!String(value??'').trim()?'co-empty':''}">${String(value??'').trim()?val:'Ainda não preenchido'}</div></div>`;
  return `<label class="co-sheet-field ${long?'co-sheet-field-long':''}"><span class="co-sheet-label">${esc(label)}</span>${long?`<textarea name="${esc(name)}" maxlength="${name==='history'?6000:3000}" placeholder="${esc(placeholder)}" rows="${name==='history'?7:5}">${val}</textarea>`:`<input name="${esc(name)}" type="${name==='age'?'number':'text'}" ${name==='name'?'required minlength="2" maxlength="40"':name==='age'?'min="0" max="120" step="1"':name==='dream'?'maxlength="160"':'maxlength="100"'} value="${val}" placeholder="${esc(placeholder)}">`}</label>`;
}
function coTrainerSheet(trainer, editable, username, fallbackName) {
  const t=trainer || {}, name=t.name||fallbackName||'Treinador';
  const photo=t.image?`<img src="${esc(t.image)}" alt="Imagem de ${esc(name)}" loading="lazy">`:'<span class="co-avatar-empty" aria-hidden="true">✦<small>ÍCONE</small></span>';
  const photoBox=editable?`<form id="trainer-image-form" class="co-avatar-form"><label class="co-avatar-frame" aria-label="Selecionar imagem do personagem">${photo}<span class="co-avatar-edit">＋</span><input type="file" name="characterImage" accept="image/png,image/jpeg,image/webp" aria-label="Imagem do personagem" required></label><button type="submit" class="co-photo-submit">↑ Salvar ícone</button><small>PNG, JPG ou WEBP • até 5 MB</small></form>`:`<div class="co-avatar-form"><div class="co-avatar-frame co-avatar-view">${photo}</div></div>`;
  const fields=`<div class="co-sheet-grid">
    ${coTrainerField('name','Nome',t.name||fallbackName,editable,false,'Nome do personagem')}
    ${coTrainerField('age','Idade',t.age??'',editable,false,'Idade')}
    ${coTrainerField('dream','Sonho',t.dream,editable,false,'Qual é o maior sonho?')}
    ${coTrainerField('profession','Profissão',t.profession,editable,false,'Profissão do personagem')}
  </div><div class="co-sheet-story">
    ${coTrainerField('history','História',t.history??t.bio,editable,true,'Conte a origem, objetivos e acontecimentos importantes do personagem...')}
    ${coTrainerField('appearance','Aparência',t.appearance,editable,true,'Descreva cabelos, olhos, roupas, acessórios, altura e outras características...')}
  </div>`;
  return `<section class="co-trainer-sheet" aria-label="Ficha do treinador ${esc(name)}">
    <header class="co-sheet-banner"><span>◈ EVO-LINK <b>/</b> TRAINER DATABASE</span><span class="co-sheet-state">${editable?'● FICHA EDITÁVEL':'● VISUALIZAÇÃO DO MESTRE'}</span></header>
    <div class="co-sheet-body"><div class="co-sheet-intro">
      ${photoBox}
      <div class="co-sheet-identity"><span class="co-overline">IDENTIFICAÇÃO DO TREINADOR</span><h2>${esc(name)}</h2><p>@${esc(username||'jogador')}</p><div class="co-id-tags"><span>◉ TRAINER CARD</span><span>${editable?'✎ EDIÇÃO LIBERADA':'◉ SOMENTE LEITURA'}</span></div></div>
    </div>
    ${editable?`<form id="trainer-form" class="co-sheet-form">${fields}<div class="co-sheet-foot"><span>As alterações serão salvas na sua conta e ficarão disponíveis para o mestre.</span><button type="submit" class="co-sheet-save">✦ Salvar minha ficha</button></div></form>`:`<div class="co-sheet-form">${fields}</div>`}
    </div><footer class="co-sheet-bottom">CHAOS &amp; OBSTRUCTION <span>◈</span> TREINADOR // EVOLINK</footer>
  </section>`;
}
function dashboardProfile(){
  const u=state.user, master=u.role==='mestre', c=activeCampaign();
  const account=paper('SUA CONTA',`<p><strong>Nome de usuário:</strong> @${esc(u.username)}</p><p><strong>Tipo:</strong> ${roleTitle()}</p><button type="button" class="btn ghost full" data-action="logout">🚪 Sair da conta</button>`,'dashboard-paper');
  if(!master) return `<div class="co-profile-page"><div class="co-profile-title"><span>◈ CHAOS & OBSTRUCTION</span><h1>Ficha do Treinador</h1><p>Crie sua história e personalize seu personagem. Toque no ícone para escolher sua imagem.</p></div>${coTrainerSheet(u.trainer,true,u.username,u.name)}${account}</div>`;
  const members=c?.members||[];
  const selected=members.find(p=>p.id===state.coSheetUserId)||members[0];
  return `<div class="co-profile-page"><div class="co-profile-title"><span>◈ ÁREA DO MESTRE</span><h1>Fichas dos Jogadores</h1><p>Visualize as informações que cada treinador salvou. Somente o dono da conta pode alterar sua ficha.</p></div>
    ${campaignPicker()}
    ${!c?empty('📂','Nenhuma campanha selecionada','Crie uma campanha ou selecione uma existente para visualizar as fichas.'):`<div class="co-master-header"><h2>Treinadores da campanha</h2><span>${members.length} ${members.length===1?'jogador':'jogadores'}</span></div>
    ${members.length?`<div class="co-master-list" role="group" aria-label="Escolher ficha de jogador">${members.map(p=>`<button type="button" class="co-master-card ${p.id===selected.id?'selected':''}" data-action="co-view-trainer" data-value="${esc(p.id)}" aria-pressed="${p.id===selected.id?'true':'false'}"><span class="co-card-avatar">${p.trainer?.image?`<img src="${esc(p.trainer.image)}" alt="">`:'✦'}</span><span class="co-master-card-text"><strong>${esc(p.trainer?.name||p.name)}</strong><small>@${esc(p.username)}</small></span><span class="co-card-arrow">→</span></button>`).join('')}</div><p class="co-selection-hint">Ficha selecionada • leitura do mestre</p>${coTrainerSheet(selected.trainer,false,selected.username,selected.name)}`:empty('🧢','Nenhum jogador nesta campanha','Compartilhe o convite da campanha para que os jogadores possam criar suas fichas.')}`}
    ${account}</div>`;
}
