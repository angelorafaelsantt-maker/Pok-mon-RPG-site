'use strict';
const DEMO = document.body.dataset.demo === 'true';
const app = document.getElementById('app');
const toastNode = document.getElementById('toast');
const types=['Normal','Fogo','Água','Grama','Elétrico','Gelo','Lutador','Veneno','Terra','Voador','Psíquico','Inseto','Pedra','Fantasma','Dragão','Sombrio','Aço','Fada'];
const state={inviteCampaign:null,user:null,campaigns:[],species:[],captured:[],discoveries:[],dexFilter:'all',dexTrainerId:null,selectedTrainerId:null,editingCaptureId:null,view:'inicio',role:'jogador',authMode:'login',selectedCampaignId:null,pendingCode:(!DEMO ? (new URLSearchParams(location.search).get('convite')||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,20) : ''),editingSpeciesId:null,editingItemId:null,inventoryTrainerId:null,inventoryFilter:'Todos',shinyView:false,busy:false};
let toastTimer;
function esc(value=''){return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
function notice(message,error=false){toastNode.textContent=message;toastNode.className='toast show'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastNode.className='toast',3800);}
function field(name,label,type='text',placeholder='',extra='') {return `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" type="${esc(type)}" placeholder="${esc(placeholder)}" ${extra}></label>`;}
function paper(title,content,extraClass=''){return `<section class="paper ${extraClass}"><h2 class="paper-title">${esc(title)}</h2>${content}</section>`;}
function btn(label,kind='primary',extra=''){return `<button class="btn ${kind} ${extra}" type="submit">${label}</button>`;}
function ball(){return `<span class="ball" aria-hidden="true"></span>`;}
function activeCampaign(){return state.campaigns.find(c=>c.id===state.selectedCampaignId)||state.campaigns[0]||null;}
function roleTitle(){return state.user?.role==='mestre'?'Mestre':'Jogador';}
function options(current=''){return types.map(t=>`<option value="${esc(t)}" ${t===current?'selected':''}>${esc(t)}</option>`).join('');}
function empty(icon,title,desc){return `<div class="empty"><div class="emoji">${icon}</div><h3>${esc(title)}</h3><p>${esc(desc)}</p></div>`;}
function renderAuth(){
 const register=state.authMode==='register';
 app.innerHTML=`<main class="screen auth-screen">
   <header class="brand" aria-label="Pokémon Evolution RPG"><div class="brand-top">Pokémon</div><div class="brand-bottom">EVOLUTION</div><div class="brand-rpg">RPG</div></header>
   <div class="sign">${ball()}<span>Bem-vindo ao EvoLink!</span>${ball()}</div>
   ${DEMO?'<p class="demo-label">🧪 Demonstração local: não usa contas verdadeiras nem conecta jogadores em aparelhos diferentes.</p>':''}
   ${paper('ESCOLHA SEU PAPEL',`<div class="role-grid">
     <button type="button" data-action="role" data-value="mestre" class="role-card ${state.role==='mestre'?'selected':''}" aria-pressed="${state.role==='mestre'}"><span class="role-art" aria-hidden="true">📕</span><span class="role-name">Mestre</span><span class="role-note">Gerenciar a aventura</span></button>
     <button type="button" data-action="role" data-value="jogador" class="role-card blue ${state.role==='jogador'?'selected':''}" aria-pressed="${state.role==='jogador'}"><span class="role-art" aria-hidden="true">🎒</span><span class="role-name">Jogador</span><span class="role-note">Viver a aventura</span></button>
   </div>`) }
   ${paper(register?'CRIAR CONTA':'LOGIN',`
       <div class="tab-row" role="tablist" aria-label="Tipo de acesso"><button class="tab ${!register?'active':''}" data-action="auth-mode" data-value="login" type="button">Entrar</button><button class="tab ${register?'active':''}" data-action="auth-mode" data-value="register" type="button">Criar conta</button></div>
       <form id="auth-form" class="form-stack">
         ${register?field('name','Nome de treinador','text','Como quer ser chamado?', 'required maxlength="40" minlength="2" autocomplete="nickname"'):''}
         ${field('username','Usuário','text','Seu usuário','required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_.\\-]+" autocomplete="username" autocapitalize="none"')}
         ${field('password','Senha','password',register?'Pelo menos 8 caracteres':'Sua senha',`required minlength="8" maxlength="128" autocomplete="${register?'new-password':'current-password'}"`)}
         ${register?field('confirm','Confirmar senha','password','Digite a senha novamente','required minlength="8" autocomplete="new-password"'):''}
         ${btn(`${ball()} ${register?'Começar aventura':'Entrar'} ›`,'primary','full')}
       </form>
       <p class="helper">${register?'Já tem conta?':'Ainda não tem conta?'} <button type="button" class="link-button" data-action="auth-mode" data-value="${register?'login':'register'}">${register?'Entrar':'Criar conta'}</button></p>
       ${DEMO?`<hr><p class="helper">Ou experimente sem cadastro:</p><div class="row" style="margin-top:8px"><button class="btn tiny secondary" data-action="demo-enter" data-value="mestre">🎩 Mestre demo</button><button class="btn tiny blue" data-action="demo-enter" data-value="jogador">🎒 Jogador demo</button></div>`:''}
       <details><summary>🎟️ Entrar com código da campanha</summary><form id="invite-form" class="form-stack"><label class="field"><span>Código enviado pelo Mestre</span><input name="code" placeholder="Ex.: XY7KQ2B" required minlength="6" maxlength="20" autocapitalize="characters"></label>${btn('Continuar como Jogador','blue','full')}</form></details>${state.pendingCode?`<p class="note">🎟️ Convite recebido para <strong>${esc(state.inviteCampaign?.name||'campanha do Mestre')}</strong>. Entre ou crie uma conta como <strong>Jogador</strong> para participar automaticamente. Código: <strong>${esc(state.pendingCode)}</strong></p>`:''}
   `)}
   <p class="helper">Feito para o seu Pokémon Evolution RPG ✨</p>
 </main>`;
}
function campaignPicker() {
 if(state.campaigns.length<=1)return '';
 return `<div class="picker"><label for="active-campaign">Campanha ativa</label><select id="active-campaign">${state.campaigns.map(c=>`<option value="${esc(c.id)}" ${c.id===activeCampaign()?.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>`;
}
function dashboardHome(){
 const c=activeCampaign();const master=state.user.role==='mestre';const profile=state.user.trainer||{name:state.user.name};
 return `<section class="hero-welcome"><span class="decor" aria-hidden="true">${master?'📕':'🧢'}</span><span class="badge ${master?'red':'gold'}">${master?'🎲 MODO MESTRE':'⚡ MODO JOGADOR'}</span><h1>Olá, ${esc(master?state.user.name:profile.name)}!</h1><p>${master?'Seu mundo Pokémon está pronto para ganhar vida. Convide jogadores e monte sua Pokédex.':'Sua jornada começa aqui! Entre em uma campanha para conhecer o mundo do seu Mestre.'}</p></section>
 <div class="section-title"><h2>✦ Visão geral</h2></div>
 <div class="stats"><div class="stat"><strong>${state.campaigns.length}</strong><span>Campanhas</span></div><div class="stat"><strong>${master?state.campaigns.reduce((a,x)=>a+x.members.length,0):'06'}</strong><span>${master?'Jogadores':'Vagas na equipe'}</span></div><div class="stat"><strong>${state.species.length}</strong><span>Na Pokédex</span></div></div>
 <div class="section-title"><h2>📍 Sua aventura</h2><button type="button" class="btn tiny secondary" data-action="nav" data-value="campanhas">Ver campanhas ›</button></div>
 ${!c?empty('🗺️',master?'Crie sua primeira campanha':'Ainda não há campanhas',master?'Defina o nome da aventura e compartilhe o convite com seus jogadores.':'Peça ao seu Mestre o código e entre na sua primeira aventura.'):
 `<article class="list-card"><div class="row"><h3>${esc(c.name)}</h3><span class="badge">${master?'👑 Mestre':'🎒 Treinador'}</span></div><p>${master?`${c.members.length} jogador(es) participando`:`Mestre: ${esc(c.masterName)}`} • ${c.speciesCount} Pokémon cadastrados</p><div class="row"><button class="btn blue tiny" type="button" data-action="nav" data-value="campanhas">Abrir campanha ›</button><button class="btn secondary tiny" type="button" data-action="nav" data-value="pokedex">Pokédex ›</button></div></article>`}
 ${paper('PRÓXIMOS PASSOS',`<div class="note">${master?'Cadastre as espécies originais do seu universo na seção Pokédex. Os jogadores inscritos nessa campanha poderão consultá-las.':'Você já pode editar seu perfil de treinador, entrar na campanha e consultar a Pokédex publicada pelo Mestre.'}</div>`, 'dashboard-paper')}
 `;
}
function campaignCards() {
 return state.campaigns.map(c=>`<article class="list-card"><div class="row"><h3>${esc(c.name)}</h3><span class="badge">${c.members.length} jogador(es)</span></div><p>Organização: ${esc(c.masterName)}</p>
  ${state.user.role==='mestre'?`<div class="row"><span class="code" aria-label="Código da campanha">${esc(c.code)}</span><button type="button" class="btn secondary tiny" data-action="copy-code" data-value="${esc(c.code)}">📋 Copiar código</button></div><div class="row" style="margin-top:10px"><button type="button" class="btn blue tiny" data-action="share-invite" data-value="${esc(c.code)}" data-name="${esc(c.name)}">📨 Compartilhar convite</button><button type="button" class="btn tiny ghost" data-action="recode" data-value="${esc(c.id)}">🔄 Trocar código</button></div>${DEMO?'<div class="demo-online-warning">⚠️ O código desta demonstração funciona somente neste navegador. Para convidar outros celulares, abra a versão hospedada online.</div>':''}`:''}
  ${`<hr><strong style="font-size:13px">Participantes</strong>${c.members.length?`<div class="members" style="margin-top:9px">${c.members.map(u=>`<div class="member">${trainerPortrait(u.trainer)}<span>🧢 ${esc(u.trainer?.name||u.name)}<br><small>@${esc(u.username)}</small></span>${state.user.role==='mestre'?`<button type="button" class="btn tiny ghost" data-action="remove-member" data-id="${esc(c.id)}" data-value="${esc(u.id)}">Remover</button>`:''}</div>`).join('')}</div>`:'<p>Nenhum jogador entrou ainda. Compartilhe o código acima!</p>'}`}
 </article>`).join('');
}
function dashboardCampaigns(){const master=state.user.role==='mestre';return `
  ${paper(master?'CRIAR CAMPANHA':'ENTRAR NA CAMPANHA',master?
  `<p class="subtle">Cada campanha tem seu próprio código de convite, Pokédex e participantes.</p><form id="create-campaign-form" class="form-stack">${field('name','Nome da campanha','text','Pokémon Evolution RPG','required minlength="3" maxlength="60"')}${btn('➕ Criar campanha','primary','full')}</form>`:
  `<p class="subtle">Digite o código recebido do seu Mestre para participar da aventura.</p><form id="join-campaign-form" class="form-stack">${field('code','Código de convite','text','Ex.: XY7KQ2B','required minlength="6" maxlength="20" autocapitalize="characters"')}${btn('🎟️ Entrar na campanha','blue','full')}</form>`, 'dashboard-paper')}
  <div class="section-title"><h2>📂 ${master?'Minhas campanhas':'Campanhas em que participo'}</h2></div>
  ${state.campaigns.length?campaignCards():empty('🎫', 'Nenhuma campanha ainda',master?'Crie uma campanha acima para liberar seu painel de Mestre.':'Insira um código acima para começar sua jornada.')}
  `;}
function miniInput(name,label,value='',type='text',extra=''){
  return `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" value="${esc(value??'')}" ${extra}></label>`;
}
function speciesForm(p=null){
  const st=p?.stats||{};const ab=p?.abilities||{};
  const numberInput=miniInput('number','Nº Pokédex',p?.number,'number','required min="1" max="9999"');
  return `<form id="add-species-form" class="form-stack">
    <div class="spec-form-two">${numberInput}${miniInput('name','Nome',p?.name,'text','required maxlength="45"')}</div>
    <div class="spec-form-two"><label class="field"><span>Tipo 1</span><select name="type1" required>${options(p?.type1||'Grama')}</select></label><label class="field"><span>Tipo 2 (opcional)</span><select name="type2"><option value="">Nenhum</option>${options(p?.type2)}</select></label></div>
    <div class="spec-form-two">${miniInput('category','Categoria',p?.category,'text','maxlength="80"')}${miniInput('inspirationCountry','País de inspiração',p?.inspirationCountry,'text','maxlength="80"')}</div>
    <div class="spec-form-two">${miniInput('heightM','Altura (m)',p?.heightM,'number','min="0" max="1000" step="0.01"')}${miniInput('weightKg','Peso (kg)',p?.weightKg,'number','min="0" max="99999" step="0.01"')}</div>
    <label class="field"><span>Descrição da Pokédex</span><textarea name="description" maxlength="750" placeholder="Como é essa espécie?">${esc(p?.description||'')}</textarea></label>
    <strong class="spec-form-title">✨ Habilidades</strong>
    ${miniInput('ability1','Habilidade principal',ab.primary,'text','maxlength="60"')}
    ${miniInput('ability2','Segunda habilidade',ab.secondary,'text','maxlength="60"')}
    ${miniInput('hiddenAbility','Habilidade oculta',ab.hidden,'text','maxlength="60"')}
    <strong class="spec-form-title">📊 Base Status</strong>
    <div class="spec-stats-grid">
    ${[['hp','HP'],['attack','Attack'],['defense','Defense'],['spAttack','Sp. Attack'],['spDefense','Sp. Defense'],['speed','Speed']].map(([k,l])=>miniInput(k,l,st[k],'number','min="1" max="255"')).join('')}
    </div>
    <strong class="spec-form-title">🔄 Evolução</strong>
    <div class="spec-form-two">${miniInput('evolvesFrom','Evolui de (nº)',p?.evolvesFrom,'number','min="1" max="9999"')}${miniInput('evolvesTo','Evolui para (nº)',p?.evolvesTo,'number','min="1" max="9999"')}</div>
    ${miniInput('evolutionMethod','Condição de evolução',p?.evolutionMethod,'text','maxlength="150" placeholder="Ex.: nível 16 / pedra"')}
    <strong class="spec-form-title">🖼️ Imagens do Pokémon</strong>
    <div class="note">Agora aceitamos arquivos PNG, JPG ou WEBP de até <strong>20 MB por imagem</strong>. No aplicativo online, as imagens são armazenadas em tamanho original. Nesta demonstração, as fotos são reduzidas automaticamente para caber no armazenamento local do navegador.</div>
    <label class="field"><span>Arte normal</span><input name="normalImage" type="file" accept="image/png,image/jpeg,image/webp"></label>
    <label class="field"><span>Arte shiny</span><input name="shinyImage" type="file" accept="image/png,image/jpeg,image/webp"></label>
    <label class="field"><span>Visibilidade para jogadores</span><select name="visibleToPlayers"><option value="true" ${p?.visibleToPlayers!==false?'selected':''}>Visível</option><option value="false" ${p?.visibleToPlayers===false?'selected':''}>Oculto (somente Mestre)</option></select></label>
    ${btn(p?'💾 Salvar alterações':'📘 Cadastrar Pokémon','blue','full')}
    ${p?'<button class="btn secondary full" data-action="cancel-edit" type="button">Cancelar edição</button>':''}
  </form>`;
}
function dexTrainer(c){
 if(state.user.role!=='mestre')return state.user.id;
 return c.members?.some(m=>m.id===state.dexTrainerId)?state.dexTrainerId:(c.members?.[0]?.id||null);
}
function dexStatus(p,c,trainer){
 if(!trainer)return 'catalog';
 if(state.captured.some(x=>x.campaignId===c.id&&x.ownerId===trainer&&x.speciesId===p.id))return 'caught';
 return state.discoveries.find(d=>d.campaignId===c.id&&d.ownerId===trainer&&d.speciesId===p.id)?.status||'unknown';
}
function dexBadge(status){
 if(status==='caught')return '<span class="dex-marker caught">◉ Capturado</span>';
 if(status==='seen')return '<span class="dex-marker seen">◉ Visto</span>';
 if(status==='unknown')return '<span class="dex-marker unknown">🔒 Não visto</span>';
 return '<span class="dex-marker catalog">📖 Catálogo</span>';
}
function speciesCards(c){
 const master=state.user.role==='mestre';
 const managing=master&&state.dexSection==='manage';
 const trainer=managing?null:dexTrainer(c);
 const all=state.species.filter(p=>p.campaignId===c.id).sort((a,b)=>a.number-b.number);
 const filtered=all.filter(p=>{
  const st=dexStatus(p,c,trainer);
  return managing||state.dexFilter==='all'||(state.dexFilter==='seen'&&(st==='seen'||st==='caught'))||st===state.dexFilter;
 });
 return filtered.map(p=>{
  const status=dexStatus(p,c,trainer),undiscovered=(p.unknown===true||(!master&&status==='unknown'));
  const image=!undiscovered&&((state.shinyView?p.images?.shiny:p.images?.normal)||(state.shinyView?p.images?.normal:''));
  const stats=p.stats||{};const total=Object.values(stats).filter(n=>typeof n==='number').reduce((a,b)=>a+b,0);
  const complete=['hp','attack','defense','spAttack','spDefense','speed'].every(k=>typeof stats[k]==='number');
  const attrs=[p.category,p.inspirationCountry,p.heightM!=null?`${p.heightM} m`:null,p.weightKg!=null?`${p.weightKg} kg`:null].filter(Boolean).map(esc).join(' • ');
  const abilities=[p.abilities?.primary,p.abilities?.secondary].filter(Boolean).join(' / ');
  const to=p.evolvesTo!=null?`#${String(p.evolvesTo).padStart(3,'0')}`:'Sem evolução cadastrada';
  return `<article class="list-card species-card ${undiscovered?'dex-locked':''} ${status==='seen'?'dex-seen':''}" data-search="${undiscovered?esc(String(p.number)):esc(`${p.name} ${p.number} ${p.type1} ${p.type2||''}`.toLowerCase())}">
   <div class="species-head">
    <div class="species-thumb ${undiscovered?'unknown-thumb':''}">${undiscovered?'<div class="monster-shadow" aria-label="Espécie desconhecida"><i></i><span>?</span></div>':image?`<img loading="lazy" src="${esc(image)}" alt="Imagem ${state.shinyView?'shiny':'normal'} de ${esc(p.name)}">`:'<span class="species-placeholder">◉</span>'}</div>
    <div style="flex:1;min-width:0"><div class="row"><h3>${undiscovered?'????':esc(p.name)}</h3><span class="number">#${String(p.number).padStart(3,'0')}</span></div>
    <div class="row" style="justify-content:flex-start;gap:5px">${undiscovered?'<span class="type Normal">???</span>':`<span class="type ${esc(p.type1)}">${esc(p.type1)}</span>${p.type2?`<span class="type ${esc(p.type2)}">${esc(p.type2)}</span>`:''}`}</div>
    ${dexBadge(status)}</div></div>
   ${!undiscovered && p.visibleToPlayers===false&&master?'<span class="badge red">🔒 Oculto até ser descoberto</span>':''}
   ${undiscovered?'<p>Continue sua jornada para revelar este Pokémon.</p>':p.description?`<p>${esc(p.description)}</p>`:''}
   ${undiscovered?'':`<details><summary>Ver ficha completa</summary>
    ${attrs?`<p>${attrs}</p>`:''}
    <p><strong>Habilidades:</strong> ${esc(abilities||'Não cadastradas')} ${p.abilities?.hidden?`• Oculta: ${esc(p.abilities.hidden)}`:''}</p>
    <div class="spec-status">${[['hp','HP'],['attack','Atk'],['defense','Def'],['spAttack','SpA'],['spDefense','SpD'],['speed','Vel']].map(([k,l])=>`<span>${l}<strong>${stats[k]??'—'}</strong></span>`).join('')}</div>
    <p><strong>Total:</strong> ${complete?total:'—'} • <strong>Evolução:</strong> ${esc(to)}${p.evolutionMethod?` (${esc(p.evolutionMethod)})`:''}</p>
   </details>`}
   ${master?`<div class="dex-card-actions">
    ${trainer?`<button type="button" class="btn tiny ${status==='unknown'?'blue':'secondary'}" data-action="dex-discovery" data-id="${esc(c.id)}" data-trainer="${esc(trainer)}" data-value="${esc(p.id)}" data-status="${status==='unknown'?'seen':'unseen'}">${status==='unknown'?'👁 Marcar visto':'↶ Resetar visto'}</button>`:''}
    ${managing?`<button type="button" class="btn tiny secondary" data-action="edit-species" data-value="${esc(p.id)}">✏️ Editar</button>
    <button type="button" class="btn tiny ghost" data-action="delete-species" data-value="${esc(p.id)}" data-id="${esc(c.id)}">Excluir</button>`:''}
   </div>`:''}
  </article>`;
 }).join('')||empty('🔎','Nenhuma espécie encontrada','Altere o filtro para visualizar outros Pokémon.');
}
function dashboardPokedex(){
 const c=activeCampaign();const master=state.user.role==='mestre';const edit=state.species.find(p=>p.id===state.editingSpeciesId&&p.campaignId===c?.id);
 if(!c)return empty('📚','Pokédex bloqueada','Entre em uma campanha para visualizar ou cadastrar Pokémon.');
 const trainer=dexTrainer(c);
 const catalog=state.species.filter(p=>p.campaignId===c.id);
 const counts={seen:0,caught:0,unknown:0};for(const sp of catalog){const st=dexStatus(sp,c,trainer);if(st==='caught'){counts.caught++;counts.seen++;}else if(st==='seen')counts.seen++;else counts.unknown++;}
 return `${campaignPicker()}<section class="hero-welcome"><span class="badge gold">📘 POKÉDEX EVOLUTION</span><h1>${esc(c.name)}</h1><p>${master?'Acompanhe as descobertas de cada treinador.':'Descubra Pokémon durante sua jornada!'} • ${catalog.length} registros disponíveis</p></section>
 ${master?`<div class="dex-filter-bar" role="group" aria-label="Seções da Pokédex">${[['pokemon','Pokémon'],['manage','Fichas e criação']].map(([key,label])=>`<button type="button" class="dex-tab ${(state.dexSection||'pokemon')===key?'active':''}" data-action="dex-section" data-value="${key}" aria-pressed="${(state.dexSection||'pokemon')===key}">${label}</button>`).join('')}</div>`:''}
 ${!master||state.dexSection!=='manage'?` ${master&&c.members.length?`<div class="picker"><label for="dex-trainer-select">Pokédex do treinador</label><select id="dex-trainer-select">${c.members.map(m=>`<option value="${esc(m.id)}" ${trainer===m.id?'selected':''}>${esc(m.trainer?.name||m.name)}</option>`).join('')}</select></div>`:''}
 ${master&&!c.members.length?'<div class="note">Convide jogadores para registrar encontros e acompanhar seus progressos pessoais.</div>':''}
 <div class="dex-progress" aria-label="Progresso da Pokédex">
  <div><span>👁 Vistos</span><strong>${counts.seen}</strong></div><div><span>◉ Capturados</span><strong>${counts.caught}</strong></div><div><span>🔒 Desconhecidos</span><strong>${counts.unknown}</strong></div>
 </div>
 <div class="dex-filter-bar" role="group" aria-label="Filtrar Pokédex">${[['all','Todos'],['seen','Vistos'],['caught','Capturados'],['unknown','Não vistos']].map(([k,t])=>`<button type="button" class="dex-tab ${state.dexFilter===k?'active':''}" data-action="dex-filter" data-value="${k}" aria-pressed="${state.dexFilter===k}">${t}</button>`).join('')}</div>
 <div class="species-tools"><input type="search" id="species-search" placeholder="Buscar por nome, tipo ou número…" aria-label="Buscar Pokémon"><button type="button" class="btn ${state.shinyView?'blue':'secondary'} tiny" data-action="toggle-shiny">✨ ${state.shinyView?'Shiny':'Normal'}</button></div>
 ${catalog.length?speciesCards(c):empty('🥚','Pokédex vazia',master?'Cadastre seu primeiro Pokémon original na aba Fichas e criação.':'Seu Mestre ainda não publicou Pokémon nesta campanha.')}
 <div class="note dex-explain">🔎 Pokémon não vistos aparecem como silhuetas. Quando o Mestre registra um encontro, a ficha é revelada. Receber um Pokémon marca automaticamente a espécie como capturada.</div>
 `:''}
 ${master&&state.dexSection==='manage'?`<div class="species-tools"><input type="search" id="species-search" placeholder="Buscar ficha…" aria-label="Buscar ficha"><button type="button" class="btn secondary tiny" data-action="toggle-shiny">✨ ${state.shinyView?'Shiny':'Normal'}</button></div>${speciesCards(c)}`:''}
 ${master&&state.dexSection==='manage'?paper(edit?'EDITAR POKÉMON':'CADASTRAR POKÉMON',speciesForm(edit),'dashboard-paper'):''}
 ${master&&state.dexSection==='manage'?paper('IMPORTAR / EXPORTAR',`<p class="subtle">Cadastre várias espécies de uma vez pelo modelo JSON. As imagens são enviadas separadamente.</p><a href="/pokedex-template.json" class="btn secondary full" download="Pokedex-Evolution-Modelo.json">⬇️ Baixar modelo JSON</a><form id="import-species-form" class="form-stack" style="margin-top:12px"><label class="field"><span>Arquivo JSON preenchido</span><input name="importFile" type="file" accept=".json,application/json" required></label>${btn('📥 Importar Pokémon','blue','full')}</form><button type="button" class="btn secondary full" data-action="export-species" style="margin-top:12px">📤 Exportar Pokédex</button>`,'dashboard-paper'):''}`;
}
function capturedPhoto(cap, species){
 const image=(cap.shiny?species?.images?.shiny:species?.images?.normal)||(cap.shiny?species?.images?.normal:'');
 return image?`<img src="${esc(image)}" loading="lazy" alt="${esc(species?.name||'Pokémon')} ${cap.shiny?'shiny':'normal'}">`:'<span class="species-placeholder">◉</span>';
}
function captureDetails(cap,c){
 const sp=state.species.find(p=>p.id===cap.speciesId);
 const myPokemon=cap.ownerId===state.user.id;
 const master=state.user.role==='mestre';
 const title=cap.nickname||sp?.name||'Espécie indisponível';
 const hpPercent=Math.min(100,Math.max(0,Math.round((cap.currentHp/(cap.maxHp||1))*100)));
 return `<article class="list-card capture-card">
  <div class="species-head"><div class="species-thumb">${capturedPhoto(cap,sp)}</div>
   <div class="capture-meta"><div class="row"><h3>${esc(title)}</h3><span class="badge ${cap.shiny?'gold':''}">${cap.shiny?'✨ Shiny':'Nv. '+cap.level}</span></div>
    <p>${esc(sp?.name||'Espécie indisponível')} • ${esc(cap.gender||'Desconhecido')} • Nv. ${cap.level}</p>
    <div class="row"><span class="type ${esc(sp?.type1||'Normal')}">${esc(sp?.type1||'—')}</span>${sp?.type2?`<span class="type ${esc(sp.type2)}">${esc(sp.type2)}</span>`:''}<span class="badge">${cap.inTeam?'🎒 Equipe':'📦 Armazenado'}</span></div>
   </div></div>
  <div class="hp-line"><strong>HP ${cap.currentHp} / ${cap.maxHp}</strong><span>XP ${cap.experience}</span></div>
  <div class="hp-track"><div class="hp-fill ${hpPercent<25?'critical':hpPercent<55?'warning-hp':''}" style="width:${hpPercent}%"></div></div>
  <details><summary>📋 Ficha completa e golpes</summary>
   <p><strong>Habilidade:</strong> ${esc(cap.ability||'Não definida')} • <strong>Nível:</strong> ${cap.level}</p>
   <div class="moves-grid">${(cap.moves||[]).length?cap.moves.map(x=>`<span>⚡ ${esc(x)}</span>`).join(''):'<span>Golpes ainda não cadastrados</span>'}</div>
   <p><strong>Anotações:</strong> ${esc(cap.notes||'Nenhuma')}</p>
   ${myPokemon?`<form class="form-stack capture-customize" data-id="${esc(cap.id)}"><div class="spec-form-two">${miniInput('nickname','Apelido',cap.nickname,'text','maxlength="45"')}${miniInput('notes','Anotações',cap.notes,'text','maxlength="350"')}</div>${btn('💾 Salvar apelido / notas','secondary','full')}</form>`:''}
  </details>
  <div class="capture-actions"><button class="btn ${cap.inTeam?'secondary':'blue'} tiny" type="button" data-action="team-toggle" data-value="${esc(cap.id)}" data-id="${esc(c.id)}" data-on="${!cap.inTeam}">${cap.inTeam?'📦 Guardar':'➕ Na equipe'}</button>
  ${master?`<button class="btn secondary tiny" type="button" data-action="edit-capture" data-value="${esc(cap.id)}">✏️ Editar</button><button class="btn ghost tiny" type="button" data-action="delete-capture" data-id="${esc(c.id)}" data-value="${esc(cap.id)}">Remover</button>`:''}</div>
 </article>`;
}
function captureForm(c, p=null){
 const members=c.members||[];
 const ownerId=p?.ownerId||state.selectedTrainerId||members[0]?.id||'';
 const species=state.species.filter(sp=>sp.campaignId===c.id).sort((a,b)=>a.number-b.number);
 return `<form id="capture-form" class="form-stack">
   <label class="field"><span>Treinador destinatário</span><select name="ownerId" required>${members.map(u=>`<option value="${esc(u.id)}" ${ownerId===u.id?'selected':''}>${esc(u.trainer?.name||u.name)} (@${esc(u.username)})</option>`).join('')}</select></label>
   <label class="field"><span>Espécie cadastrada</span><select name="speciesId" required>${species.map(sp=>`<option value="${esc(sp.id)}" ${p?.speciesId===sp.id?'selected':''}>#${String(sp.number).padStart(3,'0')} ${esc(sp.name)}</option>`).join('')}</select></label>
   <div class="spec-form-two">${miniInput('nickname','Apelido (opcional)',p?.nickname||'','text','maxlength="45"')}${miniInput('level','Nível',p?.level??5,'number','min="1" max="100" required')}</div>
   <div class="spec-form-two">${miniInput('maxHp','HP máximo',p?.maxHp??20,'number','min="1" max="9999" required')}${miniInput('currentHp','HP atual',p?.currentHp??20,'number','min="0" max="9999" required')}</div>
   <div class="spec-form-two">${miniInput('experience','Experiência',p?.experience??0,'number','min="0" max="999999999" required')}${miniInput('ability','Habilidade',p?.ability||'','text','maxlength="60"')}</div>
   <div class="spec-form-two"><label class="field"><span>Gênero</span><select name="gender">${['Desconhecido','Macho','Fêmea','Sem gênero'].map(x=>`<option ${p?.gender===x?'selected':''}>${x}</option>`).join('')}</select></label>
   <label class="field"><span>Forma</span><select name="shiny"><option value="false" ${!p?.shiny?'selected':''}>Normal</option><option value="true" ${p?.shiny?'selected':''}>✨ Shiny</option></select></label></div>
   <strong class="spec-form-title">⚔️ Golpes (até 4)</strong><div class="spec-form-two">${[0,1,2,3].map(i=>miniInput('move'+i,'Golpe '+(i+1),p?.moves?.[i]||'','text','maxlength="60"')).join('')}</div>
   <label class="field"><span>Anotações</span><textarea name="notes" maxlength="350">${esc(p?.notes||'')}</textarea></label>
   ${!p?'<label class="field"><span>Onde fica?</span><select name="inTeam"><option value="false">📦 Armazenamento</option><option value="true">🎒 Equipe ativa</option></select></label>':''}
   ${btn(p?'💾 Salvar Pokémon':'🎁 Entregar Pokémon','primary','full')}
   ${p?'<button type="button" class="btn secondary full" data-action="cancel-capture">Cancelar edição</button>':''}
 </form>`;
}
function dashboardEquipe(){
 const c=activeCampaign();if(!c)return empty('🎒','Equipe indisponível','Entre ou crie uma campanha para começar.');
 const master=state.user.role==='mestre';
 const members=c.members||[];
 const selected=master?(members.some(x=>x.id===state.selectedTrainerId)?state.selectedTrainerId:members[0]?.id):state.user.id;
 const owned=state.captured.filter(x=>x.campaignId===c.id&&x.ownerId===selected);
 const inTeam=owned.filter(x=>x.inTeam);
 const pc=owned.filter(x=>!x.inTeam);
 const edit=state.captured.find(x=>x.id===state.editingCaptureId&&x.campaignId===c.id);
 const select=members.find(x=>x.id===selected);
 return `${campaignPicker()}<section class="hero-welcome"><span class="decor">🎒</span><span class="badge gold">EQUIPE POKÉMON</span><h1>${master?'Gestão de Pokémon':'Minha equipe'}</h1><p>${master?'Entregue Pokémon, escolha um treinador e ajuste as fichas.':'Organize seus parceiros de aventura e consulte HP, golpes e experiência.'}</p></section>
 ${master?(members.length?`<div class="picker"><label for="trainer-select">Treinador</label><select id="trainer-select">${members.map(u=>`<option value="${esc(u.id)}" ${u.id===selected?'selected':''}>${esc(u.trainer?.name||u.name)}</option>`).join('')}</select></div>`:empty('🧢','Ainda sem jogadores','Convide um jogador na seção Campanhas para entregar o primeiro Pokémon.')):''}
 ${master&&members.length&&state.species.some(x=>x.campaignId===c.id)?paper(edit?'EDITAR POKÉMON':'ENTREGAR POKÉMON',captureForm(c,edit),'dashboard-paper'):''}
 ${master&&members.length&&!state.species.some(x=>x.campaignId===c.id)?`<div class="note">Cadastre pelo menos uma espécie na Pokédex antes de entregar Pokémon.</div>`:''}
 ${master&&select?`${trainerPortrait(select.trainer)}<div class="section-title"><h2>🧢 ${esc(select.trainer?.name||select.name)}</h2></div>`:''}
 ${(selected||!master)?`<div class="stats"><div class="stat"><strong>${inTeam.length}/6</strong><span>Equipe ativa</span></div><div class="stat"><strong>${pc.length}</strong><span>Armazenados</span></div><div class="stat"><strong>${owned.filter(x=>x.shiny).length}</strong><span>Shiny</span></div></div>
 <div class="section-title"><h2>⚡ Equipe ativa</h2></div>
 <div class="team-slots">${Array.from({length:6},(_,i)=>{const cap=inTeam[i],sp=cap&&state.species.find(x=>x.id===cap.speciesId);return `<div class="team-slot ${cap?'filled':''}"><span>${cap?capturedPhoto(cap,sp):'＋'}</span><strong>${cap?esc(cap.nickname||sp?.name||'Pokémon'):'Vazio'}</strong><small>${cap?'Nv. '+cap.level:'Espaço '+(i+1)}</small></div>`}).join('')}</div>
 ${inTeam.map(cap=>captureDetails(cap,c)).join('')}
 <div class="section-title"><h2>📦 Armazenamento</h2></div>
 ${pc.length?pc.map(cap=>captureDetails(cap,c)).join(''):empty('📦','Nenhum Pokémon guardado','Pokémon retirados da equipe ficam aqui.')}
 <p class="subtle">As imagens vêm da Pokédex cadastrada pelo Mestre. O jogador pode organizar a equipe e editar apelido/anotações; o Mestre controla HP, níveis, experiência e golpes.</p>`:''}`;
}
function trainerPortrait(t){return t?.image?`<img class="trainer-portrait" src="${esc(t.image)}" alt="Personagem de ${esc(t.name||'treinador')}" loading="lazy">`:'';}
function dashboardProfile(){const u=state.user;const t=u.trainer||{name:u.name,hometown:'',bio:''};return `
 <section class="hero-welcome"><span class="decor" aria-hidden="true">${u.role==='mestre'?'🧙':'🧢'}</span><span class="badge ${u.role==='mestre'?'red':'gold'}">${roleTitle().toUpperCase()}</span><h1>${esc(u.name)}</h1><p>@${esc(u.username)} • ${roleTitle()}</p></section>
 ${u.role==='jogador'?paper('FICHA DO TREINADOR',`${trainerPortrait(t)}<form id="trainer-image-form" class="form-stack"><label class="field"><span>Imagem do personagem — PNG, JPG ou WEBP até 5 MB</span><input name="characterImage" type="file" accept="image/png,image/jpeg,image/webp" required></label>${btn('Enviar imagem','blue','full')}</form><p class="subtle">Visível para os participantes das suas campanhas.</p><form id="trainer-form" class="form-stack"><label class="field"><span>Nome do treinador</span><input name="name" required minlength="2" maxlength="40" value="${esc(t.name)}"></label><label class="field"><span>Cidade de origem</span><input name="hometown" maxlength="60" value="${esc(t.hometown||'')}" placeholder="Sua cidade"></label><label class="field"><span>História resumida</span><textarea name="bio" maxlength="300" placeholder="Conte um pouco sobre seu treinador...">${esc(t.bio||'')}</textarea></label>${btn('💾 Salvar ficha','blue','full')}</form>`, 'dashboard-paper'):
 paper('PAINEL DO MESTRE',`<p>Você possui acesso exclusivo à criação de campanhas, códigos de convite, gestão de jogadores e registro das espécies na Pokédex.</p><p class="subtle">Nas próximas versões, também poderá controlar batalhas e recompensas diretamente pelo aplicativo.</p>`, 'dashboard-paper')}
 ${paper('SUA CONTA',`<p><strong>Nome de usuário:</strong> @${esc(u.username)}</p><p><strong>Tipo:</strong> ${roleTitle()}</p><button type="button" class="btn ghost full" data-action="logout">🚪 Sair da conta</button>`, 'dashboard-paper')}`;}
const itemCategories=['Pokébolas','Cura','Batalha','Evolução','Missão','Outros'];
function invOwner(c){
 if(state.user.role!=='mestre')return state.user.id;
 return c.members?.some(x=>x.id===state.inventoryTrainerId)?state.inventoryTrainerId:c.members?.[0]?.id||null;
}
function quantityFor(c,owner,item){return state.inventory.find(x=>x.campaignId===c.id&&x.ownerId===owner&&x.itemId===item.id)?.quantity||0;}
function walletFor(c,owner){return state.wallets.find(x=>x.campaignId===c.id&&x.ownerId===owner)?.balance||0;}
function itemForm(item){return `<form id="item-create-form" class="form-stack">
  <div class="spec-form-two">${miniInput('name','Nome do item',item?.name||'','text','required minlength="2" maxlength="65"')}${miniInput('icon','Ícone (emoji)',item?.icon||'🎁','text','maxlength="6"')}</div>
  <label class="field"><span>Categoria</span><select name="category">${itemCategories.map(x=>`<option value="${esc(x)}" ${x===(item?.category||'Outros')?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
  <label class="field"><span>Descrição</span><textarea name="description" maxlength="400">${esc(item?.description||'')}</textarea></label>
  ${miniInput('healHp','HP restaurado automaticamente (0 = nenhum)',item?.healHp??0,'number','required min="0" max="9999"')}
  ${btn(item?'💾 Salvar item':'➕ Criar item','blue','full')}
  ${item?'<button type="button" class="btn secondary full" data-action="cancel-item-edit">Cancelar edição</button>':''}
 </form>`;}
function dashboardMochila(){
 const c=activeCampaign();const master=state.user.role==='mestre';
 if(!c)return empty('🎒','Mochila indisponível','Entre em uma campanha para visualizar seus itens.');
 const owner=invOwner(c);const trainer=c.members.find(x=>x.id===owner);
 const all=state.items.filter(x=>x.campaignId===c.id);
 const visible=all.filter(x=>quantityFor(c,owner,x)>0 && (state.inventoryFilter==='Todos'||state.inventoryFilter===x.category));
 const count=all.reduce((n,x)=>n+quantityFor(c,owner,x),0);
 const money=owner?walletFor(c,owner):0;
 const speciesById=new Map(state.species.map(p=>[p.id,p]));
 const healables=state.captured.filter(x=>x.campaignId===c.id&&x.ownerId===owner&&x.currentHp>0&&x.currentHp<x.maxHp);
 const hist=state.itemHistory.filter(x=>x.campaignId===c.id&&x.ownerId===owner).slice(-12).reverse();
 const selector=master?`<div class="picker"><label for="inventory-trainer-select">Treinador — Mochila</label><select id="inventory-trainer-select">${c.members.map(x=>`<option value="${esc(x.id)}" ${owner===x.id?'selected':''}>${esc(x.trainer?.name||x.name)}</option>`).join('')}</select></div>`:'';
 const rows=visible.map(item=>{
   const qty=quantityFor(c,owner,item);
   const select=item.healHp>0?`<label class="field heal-selector"><span>Curar Pokémon (+${item.healHp} HP)</span><select id="heal-target-${esc(item.id)}"><option value="">Escolha o Pokémon</option>${healables.map(cap=>`<option value="${esc(cap.id)}">${esc(cap.nickname||speciesById.get(cap.speciesId)?.name||'Pokémon')} — ${cap.currentHp}/${cap.maxHp} HP</option>`).join('')}</select></label>`:'';
   return `<article class="bag-item"><span class="bag-symbol" aria-hidden="true">${esc(item.icon||'🎁')}</span><div class="bag-info"><div class="row"><strong>${esc(item.name)}</strong><span class="bag-qty">× ${qty}</span></div><span class="subtle">${esc(item.category)}</span><p>${esc(item.description||'Item da aventura.')}</p>${!master?`${select}<button class="btn tiny ${item.healHp?'blue':'secondary'}" type="button" data-action="use-bag-item" data-value="${esc(item.id)}" data-id="${esc(c.id)}">${item.healHp?'🧪 Usar poção':'✓ Usar item'}</button>`:''}</div></article>`;
 }).join('');
 const catList=['Todos',...itemCategories];
 const filters=`<div class="bag-filters">${catList.map(x=>`<button type="button" class="bag-filter ${state.inventoryFilter===x?'active':''}" data-action="bag-filter" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
 const account=paper('MOCHILA DO TREINADOR',`${selector}${!owner?empty('🧢','Sem treinador','Convide um jogador para entregar itens.'):``}
   <div class="wallet-card"><span>💰 Pokédólares</span><strong>₽ ${money.toLocaleString('pt-BR')}</strong><small>${count} item(ns) na mochila</small></div>
   ${owner?filters+(rows||empty('🎒','Mochila vazia','O Mestre ainda não entregou itens desta categoria.')):''}`, 'dashboard-paper');
 const optionsItems=all.map(x=>`<option value="${esc(x.id)}">${esc(x.icon||'🎁')} ${esc(x.name)}</option>`).join('');
 const gmControls=master?`${owner?paper('DISTRIBUIR ITENS',`<form id="inventory-adjust-form" class="form-stack"><label class="field"><span>Item</span><select name="itemId">${optionsItems}</select></label><div class="spec-form-two"><label class="field"><span>Operação</span><select name="direction"><option value="add">Entregar</option><option value="remove">Retirar</option></select></label>${miniInput('quantity','Quantidade','1','number','required min="1" max="9999"')}</div>${btn('📦 Atualizar mochila','blue','full')}</form>`, 'dashboard-paper')+paper('AJUSTAR DINHEIRO',`<form id="wallet-adjust-form" class="form-stack"><div class="spec-form-two"><label class="field"><span>Operação</span><select name="direction"><option value="add">Adicionar</option><option value="remove">Retirar</option></select></label>${miniInput('amount','Pokédólares','100','number','required min="1" max="1000000000"')}</div>${miniInput('reason','Motivo (opcional)','','text','maxlength="120"')}${btn('💰 Atualizar saldo','blue','full')}</form>`, 'dashboard-paper'):''}
 ${paper('CATÁLOGO DO MESTRE',`<p class="subtle">Edite ou crie itens da campanha. O campo HP restaura vida ao usar uma poção da categoria Cura.</p>${all.map(x=>`<div class="catalog-row"><span>${esc(x.icon||'🎁')} ${esc(x.name)} <small>· ${esc(x.category)}</small></span><button type="button" class="btn tiny secondary" data-action="edit-bag-item" data-value="${esc(x.id)}">Editar</button></div>`).join('')}<hr>${itemForm(all.find(x=>x.id===state.editingItemId))}`, 'dashboard-paper')}`:'';
 const logs=owner?paper('MOVIMENTAÇÕES RECENTES',hist.length?hist.map(x=>{
   const item=all.find(a=>a.id===x.itemId);
   const label=x.kind==='money'?'Pokédólares':item?.name||'Item removido';
   const verb=x.kind==='use'?'Usou':x.delta>0?'Recebeu':'Retirou';
   return `<div class="ledger"><span><strong>${esc(verb)} ${esc(label)}</strong><small>${esc(x.details||new Date(x.at).toLocaleDateString('pt-BR'))}</small></span><b class="${x.delta>0?'positive':'negative'}">${x.delta>0?'+':''}${x.delta}</b></div>`;
 }).join(''):'<p class="subtle">Ainda não há movimentos registrados.</p>','dashboard-paper'):'';
 return `<section class="hero-welcome"><span class="decor">🎒</span><span class="badge gold">EVO LINK / INVENTÁRIO</span><h1>Minha Mochila</h1><p>${master?'Distribua itens e Pokédólares aos seus jogadores.': 'Consulte seus itens, use poções e acompanhe seu dinheiro.'}</p></section>${campaignPicker()}${account}${gmControls}${logs}`;
}
function renderDashboard(){
 const u=state.user;
 const contents={inicio:dashboardHome,campanhas:dashboardCampaigns,equipe:dashboardEquipe,pokedex:dashboardPokedex,mochila:dashboardMochila,perfil:dashboardProfile};
 const selected=contents[state.view]||dashboardHome;
 app.innerHTML=`<main class="screen dashboard-screen">
   <header class="topbar"><div class="app-title"><img src="./icons/icon-192.png" alt=""><div><strong>EvoLink</strong><small>POKÉMON EVOLUTION RPG</small></div></div><div class="row"><span class="badge ${u.role==='mestre'?'red':'gold'}">${roleTitle()}</span><button type="button" class="btn tiny ghost" data-action="logout" aria-label="Sair">↪</button></div></header>
   ${DEMO?'<div class="demo-label">⚠️ Modo demonstração: dados locais, sem autenticação real ou sincronização.</div>':''}
   ${selected()}
 </main><nav class="bottom-nav" aria-label="Navegação principal">${[['inicio','⌂','Início'],['campanhas','🗺️','Mapa'],['equipe','◉','Equipe'],['pokedex','📖','Pokédex'],['mochila','🎒','Mochila'],['perfil','👤','Perfil']].map(([key,icon,label])=>`<button type="button" class="nav-item ${state.view===key?'active':''}" data-action="nav" data-value="${key}" aria-current="${state.view===key?'page':'false'}"><span aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')}</nav>`;
}
function render(){if(state.user)renderDashboard();else renderAuth();}
function storeDemo(){try{localStorage.setItem('evolink_demo_db',JSON.stringify(demoDB));}catch(error){if(error?.name==='QuotaExceededError')throw new Error('Armazenamento do navegador cheio. Para adicionar mais imagens, use o aplicativo online.');}}
function getDemo(){try{const found=JSON.parse(localStorage.getItem('evolink_demo_db'));if(found?.users&&found?.campaigns&&found?.species)return found;}catch{}
 return {items:[],inventory:[],wallets:[],itemHistory:[],users:[{id:'demo-master',username:'mestre',name:'Mestre Evolution',role:'mestre',trainer:{name:'Mestre Evolution',hometown:'',bio:''}},{id:'demo-player',username:'jogador',name:'Treinador(a)',role:'jogador',trainer:{name:'Treinador(a)',hometown:'Vila Inicial',bio:''}}],userId:null,campaigns:[{id:'demo-camp',name:'Pokémon Evolution RPG',code:'EVOLINK',masterId:'demo-master',memberIds:['demo-player'],createdAt:new Date().toISOString()}],captured:[{id:'demo-capture',campaignId:'demo-camp',ownerId:'demo-player',speciesId:'sample1',nickname:'Folhinha',level:5,currentHp:12,maxHp:20,experience:0,gender:'Desconhecido',ability:'',shiny:false,moves:['Investida'],notes:'Meu primeiro Pokémon',inTeam:true,createdAt:new Date().toISOString()}],species:[{id:'sample1',campaignId:'demo-camp',name:'Cedarbi',number:1,type1:'Grama',type2:'',description:'Espécie original da região Evolution, usada aqui como exemplo.',category:'',inspirationCountry:'Marrocos',abilities:{primary:'',secondary:'',hidden:''},stats:{hp:null,attack:null,defense:null,spAttack:null,spDefense:null,speed:null},images:{normal:'',shiny:''},visibleToPlayers:true}]};}
let demoDB=DEMO?getDemo():null;
if(demoDB){
 demoDB.captured ||= [];demoDB.discoveries ||= [];
 demoDB.items ||= [];demoDB.inventory ||= [];demoDB.wallets ||= [];demoDB.itemHistory ||= [];
 if(!demoDB.items.some(x=>x.campaignId==='demo-camp')){
  for(const [name,category,description,healHp,icon] of [
   ['Poké Ball','Pokébolas','Usada em tentativas de captura.',0,'🔴'],
   ['Great Ball','Pokébolas','Pokébola aprimorada.',0,'🔵'],
   ['Potion','Cura','Recupera 20 HP de um Pokémon não desmaiado.',20,'🧪'],
   ['Super Potion','Cura','Recupera 50 HP de um Pokémon não desmaiado.',50,'💊'],
   ['Antidote','Cura','Use conforme as regras do Mestre.',0,'💚']]){
    demoDB.items.push({id:'item-'+name.replaceAll(' ','-'),campaignId:'demo-camp',name,category,description,healHp,icon});
  }
 }
 if(!demoDB.inventory.some(x=>x.campaignId==='demo-camp')){
   for(const [name,quantity] of [['Poké Ball',5],['Potion',3],['Super Potion',1]]){
    const item=demoDB.items.find(x=>x.name===name&&x.campaignId==='demo-camp');
    if(item)demoDB.inventory.push({campaignId:'demo-camp',ownerId:'demo-player',itemId:item.id,quantity});
   }
   demoDB.wallets.push({campaignId:'demo-camp',ownerId:'demo-player',balance:1500});
 }

 // Mostra exemplos de fichas Visto/Não visto mesmo em demos anteriores que só tinham Cedarbi.
 if(demoDB.species.length===1&&demoDB.species[0].id==='sample1'){
  for(const [id,number,name,type1,type2] of [['sample2',2,'Zellion','Grama','Psíquico'],['sample3',3,'Mosaileo','Grama','Psíquico'],['sample10',10,'Gasenik','Inseto','Pedra']])demoDB.species.push({id,campaignId:'demo-camp',number,name,type1,type2,description:'Registro de exemplo. O Mestre pode substituir pelos dados e artes oficiais da campanha.',category:'',inspirationCountry:'',abilities:{primary:'',secondary:'',hidden:''},stats:{hp:null,attack:null,defense:null,spAttack:null,spDefense:null,speed:null},images:{normal:'',shiny:''},visibleToPlayers:true});
 }
 for(const cap of demoDB.captured)if(!demoDB.discoveries.some(d=>d.campaignId===cap.campaignId&&d.ownerId===cap.ownerId&&d.speciesId===cap.speciesId))demoDB.discoveries.push({campaignId:cap.campaignId,ownerId:cap.ownerId,speciesId:cap.speciesId,status:'caught'});
 if(!demoDB.discoveries.some(d=>d.ownerId==='demo-player'&&d.speciesId==='sample2')&&demoDB.species.some(p=>p.id==='sample2'))demoDB.discoveries.push({campaignId:'demo-camp',ownerId:'demo-player',speciesId:'sample2',status:'seen'});
 storeDemo();
}
function demoC(c){return {id:c.id,name:c.name,code:c.code,masterName:demoDB.users.find(u=>u.id===c.masterId)?.name||'Mestre',members:c.memberIds.map(i=>demoDB.users.find(u=>u.id===i)).filter(Boolean).map(u=>({id:u.id,name:u.name,username:u.username,trainer:u.trainer})),speciesCount:demoDB.species.filter(p=>p.campaignId===c.id&&(c.masterId===demoDB.userId||p.visibleToPlayers!==false)).length,createdAt:c.createdAt};}
function demoAPI(method,url,data={}) {
 const u=demoDB.users.find(u=>u.id===demoDB.userId);
 const error=(message)=>{throw new Error(message);};
 if(url==='/api/me')return {user:u||null,campaigns:u?demoDB.campaigns.filter(c=>c.masterId===u.id||c.memberIds.includes(u.id)).map(demoC):[],species:u?demoDB.species.flatMap(p=>{const c=demoDB.campaigns.find(c=>c.id===p.campaignId);if(!c||!(c.masterId===u.id||c.memberIds.includes(u.id)))return [];if(c.masterId===u.id)return [p];const seen=demoDB.discoveries.some(d=>d.campaignId===c.id&&d.ownerId===u.id&&d.speciesId===p.id);if(p.visibleToPlayers===false&&!seen)return [];return [seen?p:{id:p.id,campaignId:p.campaignId,number:p.number,unknown:true,visibleToPlayers:true}];}):[],discoveries:u?demoDB.discoveries.filter(d=>demoDB.campaigns.some(c=>c.id===d.campaignId&&(c.masterId===u.id||(c.memberIds.includes(u.id)&&d.ownerId===u.id)))):[],captured:u?demoDB.captured.filter(p=>demoDB.campaigns.some(c=>c.id===p.campaignId&&(c.masterId===u.id||(c.memberIds.includes(u.id)&&p.ownerId===u.id)))):[],items:u?demoDB.items.filter(x=>demoDB.campaigns.some(c=>c.id===x.campaignId&&(c.masterId===u.id||c.memberIds.includes(u.id)))):[],inventory:u?demoDB.inventory.filter(x=>demoDB.campaigns.some(c=>c.id===x.campaignId&&(c.masterId===u.id||(c.memberIds.includes(u.id)&&x.ownerId===u.id)))):[],wallets:u?demoDB.wallets.filter(x=>demoDB.campaigns.some(c=>c.id===x.campaignId&&(c.masterId===u.id||(c.memberIds.includes(u.id)&&x.ownerId===u.id)))):[],itemHistory:u?demoDB.itemHistory.filter(x=>demoDB.campaigns.some(c=>c.id===x.campaignId&&(c.masterId===u.id||(c.memberIds.includes(u.id)&&x.ownerId===u.id)))).slice(-150):[]};
 if(url==='/api/logout'){demoDB.userId=null;storeDemo();return{ok:true};}
 if(url==='/api/login'){let user=demoDB.users.find(u=>u.username===data.username.toLowerCase());if(!user)error('Na demonstração, use os botões Mestre demo e Jogador demo ou crie uma conta fictícia.');if(user.role!==data.role)error('Escolha o perfil correto desta conta.');demoDB.userId=user.id;storeDemo();return{user};}
 if(url==='/api/register'){if(demoDB.users.some(u=>u.username===data.username.toLowerCase()))error('Usuário já existe.');let user={id:'u'+Date.now(),username:data.username.toLowerCase(),name:data.name,role:data.role,trainer:{name:data.name,hometown:'',bio:''}};demoDB.users.push(user);demoDB.userId=user.id;storeDemo();return{user};}
 if(!u)error('Entre na demonstração primeiro.');
 if(/\/discoveries$/.test(url)){
  const cid=url.split('/')[3],c=demoDB.campaigns.find(x=>x.id===cid);
  if(!c||c.masterId!==u.id)error('Somente o Mestre registra encontros.');
  if(!c.memberIds.includes(data.ownerId)||!demoDB.species.some(p=>p.id===data.speciesId&&p.campaignId===c.id))error('Treinador ou espécie inválidos.');
  if(!['seen','unseen'].includes(data.status))error('Estado inválido.');
  if(data.status==='unseen'&&demoDB.captured.some(p=>p.campaignId===cid&&p.ownerId===data.ownerId&&p.speciesId===data.speciesId))error('Este treinador possui este Pokémon.');
  demoDB.discoveries=demoDB.discoveries.filter(d=>!(d.campaignId===cid&&d.ownerId===data.ownerId&&d.speciesId===data.speciesId));
  if(data.status==='seen')demoDB.discoveries.push({campaignId:cid,ownerId:data.ownerId,speciesId:data.speciesId,status:'seen'});
  storeDemo();return {ok:true,status:data.status};
 }
 if(url==='/api/campaigns'){if(u.role!=='mestre')error('Só o Mestre cria campanhas.');let c={id:'c'+Date.now(),name:data.name,code:Math.random().toString(36).slice(2,9).toUpperCase(),masterId:u.id,memberIds:[]};demoDB.campaigns.push(c);for(const template of demoDB.items.filter(x=>x.campaignId==='demo-camp'))demoDB.items.push({...template,id:'new'+Math.random().toString(36).slice(2),campaignId:c.id});storeDemo();return{campaign:demoC(c)};}
 if(url==='/api/campaigns/join'){let c=demoDB.campaigns.find(x=>x.code===data.code.toUpperCase());if(!c)error('Código não encontrado.');if(u.role!=='jogador')error('Entre como Jogador.');if(!c.memberIds.includes(u.id))c.memberIds.push(u.id);storeDemo();return{campaign:demoC(c)};}
 if(url==='/api/trainer/image'){u.trainer={...u.trainer,image:'data:image/webp;base64,'+data.base64};storeDemo();return{trainer:u.trainer};}
 if(url==='/api/trainer'){u.trainer={...u.trainer,name:data.name,hometown:data.hometown,bio:data.bio};storeDemo();return{trainer:u.trainer};}
 let inv=url.match(/^\/api\/campaigns\/([^/]+)\/(items|inventory|wallet)(?:\/([^/]+))?(?:\/(update|use|adjust))?$/);
 if(inv){
  const c=demoDB.campaigns.find(x=>x.id===inv[1]);if(!c||(c.masterId!==u.id&&!c.memberIds.includes(u.id)))error('Campanha inválida.');
  const isMaster=c.masterId===u.id;
  const item=demoDB.items.find(x=>x.campaignId===c.id&&x.id===inv[3]);
  const change=(ownerId,itemId,delta,kind='adjust')=>{
   if(!demoDB.items.some(x=>x.campaignId===c.id&&x.id===itemId))error('Item inválido.');
   let entry=demoDB.inventory.find(x=>x.campaignId===c.id&&x.ownerId===ownerId&&x.itemId===itemId);
   const quantity=(entry?.quantity||0)+delta;
   if(quantity<0||quantity>9999)error('Quantidade insuficiente ou acima de 9999.');
   if(!entry){entry={campaignId:c.id,ownerId,itemId,quantity:0};demoDB.inventory.push(entry);}
   entry.quantity=quantity;demoDB.itemHistory.push({id:'h'+Date.now()+Math.random(),campaignId:c.id,ownerId,itemId,kind,delta,actorId:u.id,at:new Date().toISOString()});return entry;
  };
  if(inv[2]==='items'&&inv[4]==='use'){
   if(isMaster)error('Somente jogadores podem usar seus itens.');if(!item)error('Item inexistente.');
   const owned=demoDB.inventory.find(x=>x.campaignId===c.id&&x.ownerId===u.id&&x.itemId===item.id);
   if(!owned?.quantity)error('Item esgotado.');
   let captured=null,healed=0;
   if(item.healHp>0){captured=demoDB.captured.find(x=>x.id===data.capturedId&&x.ownerId===u.id&&x.campaignId===c.id);if(!captured)error('Escolha um Pokémon seu.');if(captured.currentHp<=0||captured.currentHp>=captured.maxHp)error('Esse Pokémon não pode receber esta poção.');healed=Math.min(item.healHp,captured.maxHp-captured.currentHp);}
   change(u.id,item.id,-1,'use');if(captured)captured.currentHp+=healed;storeDemo();return{ok:true,healed,captured};
  }
  if(!isMaster)error('Somente o Mestre gerencia a mochila.');
  if(inv[2]==='items'&&(!inv[3]||inv[4]==='update')){
   if(!item&&inv[4]==='update')error('Item não encontrado.');
   const name=String(data.name||'').trim(),category=String(data.category||'');
   if(name.length<2||!itemCategories.includes(category)||data.healHp<0||data.healHp>9999)error('Dados do item inválidos.');
   if(+data.healHp>0&&category!=='Cura')error('O item de cura precisa ser da categoria Cura.');
   if(demoDB.items.some(x=>x.campaignId===c.id&&x.id!==item?.id&&x.name.toLowerCase()===name.toLowerCase()))error('Já existe um item com esse nome.');
   const entry={id:item?.id||'item'+Date.now()+Math.random(),campaignId:c.id,name,category,description:String(data.description||'').slice(0,400),icon:String(data.icon||'🎁').slice(0,6),healHp:Number(data.healHp)||0};
   if(item)Object.assign(item,entry);else demoDB.items.push(entry);storeDemo();return{item:entry};
  }
  if(!c.memberIds.includes(data.ownerId))error('Treinador não participa da campanha.');
  const delta=Number(data.delta);if(!Number.isInteger(delta)||!delta||Math.abs(delta)>1e9)error('Valor inválido.');
  if(inv[2]==='inventory'&&inv[3]==='adjust'){
   if(Math.abs(delta)>9999)error('Quantidade inválida.');const row=change(data.ownerId,data.itemId,delta);storeDemo();return{inventory:row};
  }
  if(inv[2]==='wallet'&&inv[3]==='adjust'){
   let wallet=demoDB.wallets.find(x=>x.campaignId===c.id&&x.ownerId===data.ownerId);
   const balance=(wallet?.balance||0)+delta;
   if(balance<0||balance>1e9)error('Dinheiro insuficiente ou acima do limite.');
   if(!wallet){wallet={campaignId:c.id,ownerId:data.ownerId,balance:0};demoDB.wallets.push(wallet);}
   wallet.balance=balance;demoDB.itemHistory.push({id:'h'+Date.now()+Math.random(),campaignId:c.id,ownerId:data.ownerId,kind:'money',delta,actorId:u.id,details:data.reason||'',at:new Date().toISOString()});storeDemo();return{wallet};
  }
 }
 let capRoute=url.match(/^\/api\/campaigns\/([^/]+)\/captured(?:\/([^/]+)(?:\/(update|customize|team))?)?$/);
 if(capRoute){
  const c=demoDB.campaigns.find(x=>x.id===capRoute[1]);if(!c||(c.masterId!==u.id&&!c.memberIds.includes(u.id)))error('Campanha indisponível.');
  const master=c.masterId===u.id;
  const old=demoDB.captured.find(x=>x.id===capRoute[2]&&x.campaignId===c.id);
  if(method==='DELETE'){if(!master)error('Somente o Mestre remove Pokémon.');if(!old)error('Pokémon não encontrado.');demoDB.captured=demoDB.captured.filter(x=>x.id!==old.id);storeDemo();return{ok:true};}
  if(!capRoute[2]){
   if(!master)error('Somente o Mestre pode entregar Pokémon.');
   if(!c.memberIds.includes(data.ownerId))error('Selecione um jogador da campanha.');
   if(!demoDB.species.some(x=>x.id===data.speciesId&&x.campaignId===c.id))error('Espécie não cadastrada.');
   if(data.inTeam&&demoDB.captured.filter(x=>x.campaignId===c.id&&x.ownerId===data.ownerId&&x.inTeam).length>=6)error('Equipe cheia.');
   const cap={...data,id:'cap'+Date.now()+Math.random().toString(36).slice(2),campaignId:c.id,createdAt:new Date().toISOString()};demoDB.captured.push(cap);if(!demoDB.discoveries.some(d=>d.campaignId===c.id&&d.ownerId===cap.ownerId&&d.speciesId===cap.speciesId&&d.status==='caught')){demoDB.discoveries=demoDB.discoveries.filter(d=>!(d.campaignId===c.id&&d.ownerId===cap.ownerId&&d.speciesId===cap.speciesId));demoDB.discoveries.push({campaignId:c.id,ownerId:cap.ownerId,speciesId:cap.speciesId,status:'caught'});}storeDemo();return{captured:cap};
  }
  if(!old)error('Pokémon capturado não encontrado.');
  if(!master&&old.ownerId!==u.id)error('Você não pode modificar o Pokémon de outro treinador.');
  if(capRoute[3]==='update'){
   if(!master)error('Somente o Mestre pode editar status.');
   if(!c.memberIds.includes(data.ownerId)||!demoDB.species.some(x=>x.id===data.speciesId&&x.campaignId===c.id))error('Treinador ou espécie inválidos.');
   if(data.currentHp<0||data.currentHp>data.maxHp||data.level<1||data.level>100)error('Status inválidos.');
   if(data.ownerId!==old.ownerId&&old.inTeam&&demoDB.captured.filter(x=>x.campaignId===c.id&&x.ownerId===data.ownerId&&x.inTeam).length>=6)error('Equipe cheia.');
   const {inTeam:ignored,...editData}=data;Object.assign(old,editData);demoDB.discoveries=demoDB.discoveries.filter(d=>!(d.campaignId===c.id&&d.ownerId===old.ownerId&&d.speciesId===old.speciesId));demoDB.discoveries.push({campaignId:c.id,ownerId:old.ownerId,speciesId:old.speciesId,status:'caught'});storeDemo();return{captured:old};
  }
  if(capRoute[3]==='customize'){old.nickname=String(data.nickname||'').slice(0,45);old.notes=String(data.notes||'').slice(0,350);storeDemo();return{captured:old};}
  if(capRoute[3]==='team'){
   if(typeof data.inTeam!=='boolean')error('Valor de equipe inválido.');
   if(data.inTeam&&!old.inTeam&&demoDB.captured.filter(x=>x.campaignId===c.id&&x.ownerId===old.ownerId&&x.inTeam).length>=6)error('Equipe cheia: máximo seis Pokémon.');
   old.inTeam=data.inTeam;storeDemo();return{captured:old};
  }
 }
 let m=url.match(/^\/api\/campaigns\/([^/]+)\/(reissue-code|remove-member|species)(?:\/([^/]+))?(?:\/(update|image))?$/);
 if(m && !(m[2]==='species'&&m[3]==='import')){const c=demoDB.campaigns.find(c=>c.id===m[1]);if(!c||c.masterId!==u.id)error('Apenas o Mestre pode alterar a campanha.');
   if(m[2]==='reissue-code')c.code=Math.random().toString(36).slice(2,9).toUpperCase();
   if(m[2]==='remove-member')c.memberIds=c.memberIds.filter(i=>i!==data.memberId);
   if(m[2]==='species'&&method==='POST'&&!m[3]){
     if(demoDB.species.some(sp=>sp.campaignId===c.id&&(sp.number===Number(data.number)||sp.name.toLowerCase()===data.name.toLowerCase())))error('Número ou nome já cadastrado.');
     const sp={...data,number:Number(data.number),id:'sp'+Date.now(),campaignId:c.id,images:{normal:'',shiny:''}};demoDB.species.push(sp);storeDemo();return{species:sp};
   }
   if(m[2]==='species'&&method==='POST'&&m[4]==='update'){
     const old=demoDB.species.find(sp=>sp.id===m[3]&&sp.campaignId===c.id);if(!old)error('Pokémon não encontrado.');Object.assign(old,data,{number:Number(data.number),images:old.images});storeDemo();return{species:old};
   }
   if(m[2]==='species'&&method==='POST'&&m[4]==='image'){
     const old=demoDB.species.find(sp=>sp.id===m[3]&&sp.campaignId===c.id);if(!old)error('Pokémon não encontrado.');if(data.base64.length>400000)error('A imagem da demonstração deve ficar abaixo de 300 KB após otimização.');
     old.images||={normal:'',shiny:''};old.images[data.variant]='data:'+data.mime+';base64,'+data.base64;storeDemo();return{species:old};
   }
   if(m[2]==='species'&&method==='DELETE'){if(demoDB.captured.some(x=>x.speciesId===m[3]))error('Essa espécie ainda pertence a um treinador.');demoDB.species=demoDB.species.filter(sp=>sp.id!==m[3]);demoDB.discoveries=demoDB.discoveries.filter(d=>d.speciesId!==m[3]);}
   storeDemo();return{ok:true};
 }
 const im=url.match(/^\/api\/campaigns\/([^/]+)\/species\/import$/);
 if(im){const c=demoDB.campaigns.find(c=>c.id===im[1]);if(!c||c.masterId!==u.id)error('Apenas o Mestre pode importar.');if(!Array.isArray(data.species)||!data.species.length)error('Arquivo vazio.');for(const p of data.species){if(demoDB.species.some(sp=>sp.campaignId===c.id&&(sp.number===Number(p.number)||sp.name.toLowerCase()===p.name.toLowerCase())))error('Um número ou nome já está cadastrado.');}
   for(const p of data.species)demoDB.species.push({...p,id:'sp'+Math.random().toString(36).slice(2),campaignId:c.id,images:{normal:'',shiny:''}});storeDemo();return{imported:data.species.length};}
 error('Função indisponível na demonstração.');
}
function readFileBase64(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onerror=()=>reject(new Error('Não foi possível abrir a imagem.'));
  reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');reader.readAsDataURL(file);
 });
}
async function compressDemoImage(file){
 const url=URL.createObjectURL(file);const img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Imagem inválida.'));img.src=url;});
  let w=img.naturalWidth,h=img.naturalHeight;
  if(!w||!h||w*h>100_000_000)throw new Error('A imagem é grande demais em resolução.');
  const side=720,ratio=Math.min(1,side/Math.max(w,h));w=Math.max(1,Math.round(w*ratio));h=Math.max(1,Math.round(h*ratio));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('O navegador não conseguiu preparar a imagem.');
  ctx.drawImage(img,0,0,w,h);
  let data='';for(const q of [.75,.60,.42,.26]){
    data=canvas.toDataURL('image/webp',q);
    if(!data.startsWith('data:image/webp'))throw new Error('O navegador não suporta WEBP na demonstração.');
    if(data.length<320000)break;
  }
  if(data.length>=400000)throw new Error('Não foi possível reduzir a imagem para salvar na demonstração; use o app online.');
  return data.split(',')[1];
 }finally{URL.revokeObjectURL(url);}
}
async function request(method,path,data){
 if(DEMO)return demoAPI(method,path,data);
 const res=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(method!=='GET'&&method!=='DELETE'?{body:JSON.stringify(data)}:{})});
 let result;try{result=await res.json();}catch{throw new Error('Servidor indisponível. Verifique a conexão.');}
 if(!res.ok)throw new Error(result.error||'Algo deu errado.');return result;
}
async function refresh(){const r=await request('GET','/api/me');state.user=r.user;state.campaigns=r.campaigns;state.species=r.species||[];state.captured=r.captured||[];state.discoveries=r.discoveries||[];state.items=r.items||[];state.inventory=r.inventory||[];state.wallets=r.wallets||[];state.itemHistory=r.itemHistory||[];if(!state.campaigns.some(c=>c.id===state.selectedCampaignId))state.selectedCampaignId=state.campaigns[0]?.id||null;render();}
function freeze(btn,yes){if(btn){btn.disabled=yes;btn.dataset.original||=(btn.innerText||'');btn.innerText=yes?'Aguarde...':btn.dataset.original;}}
app.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b||state.busy)return;
 const action=b.dataset.action;const value=b.dataset.value;
 if(action==='reload'){location.reload();return;}
 if(action==='role'){state.role=value;render();return;}
 if(action==='auth-mode'){state.authMode=value;render();return;}
 if(action==='nav'){state.view=value;render();scrollTo({top:0,behavior:'smooth'});return;}
 if(action==='copy-code'){if(DEMO){notice('Este é um código de demonstração local. Para convidar outros celulares, publique o EvoLink online.',true);return;}try{await navigator.clipboard.writeText(value);notice('Código copiado!');}catch{notice('Código: '+value);}return;}
 if(action==='share-invite'){
  if(DEMO){notice('Demonstração local: não é possível convidar outros celulares. Use a versão online.',true);return;}
  const link=`${location.origin}/?convite=${encodeURIComponent(value)}`;
  const name=b.dataset.name||'Pokémon Evolution RPG';
  if(navigator.share){try{await navigator.share({title:'Convite EvoLink',text:`Entre na campanha ${name} do EvoLink!`,url:link});return;}catch(e){if(e.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(link);notice('Link de convite copiado! Envie para os jogadores.');}catch{prompt('Copie o link e envie aos jogadores:',link);}
  return;
 }
 if(action==='demo-enter'&&DEMO){demoDB.userId=value==='mestre'?'demo-master':'demo-player';storeDemo();state.view='inicio';state.dexFilter='all';state.dexTrainerId=null;await refresh();notice('Demonstração: modo '+(value==='mestre'?'Mestre':'Jogador'));return;}
 if(action==='logout'){try{state.busy=true;state.dexFilter='all';state.dexTrainerId=null;await request('POST','/api/logout',{});state.view='inicio';await refresh();notice('Você saiu da conta.');}catch(err){notice(err.message,true);}finally{state.busy=false;}return;}
 if(action==='remove-member'){if(!confirm('Deseja remover este jogador da campanha?'))return;try{state.busy=true;await request('POST',`/api/campaigns/${b.dataset.id}/remove-member`,{memberId:value});await refresh();notice('Jogador removido.');}catch(err){notice(err.message,true);}finally{state.busy=false;}return;}
 if(action==='recode'){if(!confirm('Criar novo código? O código anterior deixará de funcionar.'))return;try{state.busy=true;await request('POST',`/api/campaigns/${value}/reissue-code`,{});await refresh();notice('Novo código criado!');}catch(err){notice(err.message,true);}finally{state.busy=false;}return;}
 if(action==='bag-filter'){state.inventoryFilter=value;render();return;}
 if(action==='edit-bag-item'){state.editingItemId=value;render();document.querySelector('#item-create-form')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
 if(action==='cancel-item-edit'){state.editingItemId=null;render();return;}
 if(action==='use-bag-item'){
  const item=state.items.find(x=>x.id===value);const healTarget=document.getElementById('heal-target-'+value)?.value||'';
  if(!item)return;
  if(item.healHp>0&&!healTarget){notice('Escolha um Pokémon para receber a cura.',true);return;}
  if(!confirm(`Usar uma unidade de ${item.name}?`))return;
  try{state.busy=true;const r=await request('POST',`/api/campaigns/${b.dataset.id}/items/${value}/use`,{capturedId:healTarget});await refresh();notice(r.healed?`Poção utilizada! +${r.healed} HP recuperados.`:'Item utilizado e descontado da mochila!');}catch(err){notice(err.message,true);}finally{state.busy=false;}return;
 }
 if(action==='dex-section'){state.dexSection=value;render();return;}
 if(action==='dex-filter'){state.dexFilter=value;render();return;}
 if(action==='dex-discovery'){
  try{state.busy=true;await request('POST',`/api/campaigns/${b.dataset.id}/discoveries`,{ownerId:b.dataset.trainer,speciesId:value,status:b.dataset.status});await refresh();notice(b.dataset.status==='seen'?'Encontro registrado na Pokédex!':'Registro de encontro removido.');}
  catch(err){notice(err.message,true);}finally{state.busy=false;}return;
 }
 if(action==='toggle-shiny'){state.shinyView=!state.shinyView;render();return;}
 if(action==='cancel-capture'){state.editingCaptureId=null;render();return;}
 if(action==='edit-capture'){state.editingCaptureId=value;render();document.querySelector('#capture-form')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(action==='team-toggle'){try{state.busy=true;await request('POST',`/api/campaigns/${b.dataset.id}/captured/${value}/team`,{inTeam:b.dataset.on==='true'});await refresh();notice(b.dataset.on==='true'?'Pokémon adicionado à equipe!':'Pokémon enviado ao armazenamento!');}catch(err){notice(err.message,true);}finally{state.busy=false;}return;}
 if(action==='delete-capture'){if(!confirm('Remover este Pokémon do treinador?'))return;try{state.busy=true;await request('DELETE',`/api/campaigns/${b.dataset.id}/captured/${value}`);state.editingCaptureId=null;await refresh();notice('Pokémon removido do treinador.');}catch(err){notice(err.message,true);}finally{state.busy=false;}return;}
 if(action==='edit-species'){state.dexSection='manage';state.editingSpeciesId=value;render();document.querySelector('#add-species-form')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(action==='cancel-edit'){state.editingSpeciesId=null;render();return;}
 if(action==='export-species'){
   const c=activeCampaign();if(!c)return;
   const entries=state.species.filter(p=>p.campaignId===c.id).map(({id,campaignId,createdAt,updatedAt,...fields})=>({...fields,images:{normal:'',shiny:''}}));
   const blob=new Blob([JSON.stringify(entries,null,2)],{type:'application/json'});
   const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='pokedex-evolution-export.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1200);notice('Pokédex exportada. As imagens não estão incluídas no JSON.');return;
 }
 if(action==='delete-species'){if(!confirm('Excluir este Pokémon da Pokédex?'))return;try{state.busy=true;await request('DELETE',`/api/campaigns/${b.dataset.id}/species/${value}`);state.editingSpeciesId=null;await refresh();notice('Pokémon excluído.');}catch(err){notice(err.message,true);}finally{state.busy=false;}return;}
});
app.addEventListener('change',e=>{if(e.target.id==='active-campaign'){state.selectedCampaignId=e.target.value;state.dexTrainerId=null;state.dexFilter='all';state.editingSpeciesId=null;state.editingCaptureId=null;state.selectedTrainerId=null;state.inventoryTrainerId=null;state.inventoryFilter='Todos';state.editingItemId=null;render();}if(e.target.id==='inventory-trainer-select'){state.inventoryTrainerId=e.target.value;render();}if(e.target.id==='dex-trainer-select'){state.dexTrainerId=e.target.value;render();}if(e.target.id==='trainer-select'){state.selectedTrainerId=e.target.value;state.editingCaptureId=null;render();}});
app.addEventListener('input',e=>{if(e.target.id==='species-search'){const q=e.target.value.toLowerCase();for(const card of app.querySelectorAll('.species-card'))card.hidden=!card.dataset.search.includes(q);}});
app.addEventListener('submit',async e=>{
 const form=e.target;if(!(form instanceof HTMLFormElement))return;e.preventDefault();if(state.busy)return;
 const data=Object.fromEntries(new FormData(form));const submit=form.querySelector('[type="submit"]');
 try {
  state.busy=true;freeze(submit,true);
  if(form.id==='item-create-form'){
    const c=activeCampaign();const payload={name:data.name,icon:data.icon,category:data.category,description:data.description,healHp:Number(data.healHp)};
    await request('POST',state.editingItemId?`/api/campaigns/${c.id}/items/${state.editingItemId}/update`:`/api/campaigns/${c.id}/items`,payload);
    state.editingItemId=null;await refresh();notice('Item salvo no catálogo!');
  } else if(form.id==='inventory-adjust-form'){
    const c=activeCampaign(),ownerId=invOwner(c),delta=Number(data.quantity)*(data.direction==='remove'?-1:1);
    await request('POST',`/api/campaigns/${c.id}/inventory/adjust`,{ownerId,itemId:data.itemId,delta});await refresh();notice('Mochila do treinador atualizada!');
  } else if(form.id==='wallet-adjust-form'){
    const c=activeCampaign(),ownerId=invOwner(c),delta=Number(data.amount)*(data.direction==='remove'?-1:1);
    await request('POST',`/api/campaigns/${c.id}/wallet/adjust`,{ownerId,delta,reason:data.reason});await refresh();notice('Pokédólares atualizados!');
  } else if(form.id==='capture-form'){
    const c=activeCampaign();if(!c)throw new Error('Selecione uma campanha.');
    const moves=[data.move0,data.move1,data.move2,data.move3].map(x=>String(x||'').trim()).filter(Boolean);
    const payload={ownerId:data.ownerId,speciesId:data.speciesId,nickname:data.nickname,level:Number(data.level),maxHp:Number(data.maxHp),currentHp:Number(data.currentHp),experience:Number(data.experience),ability:data.ability,gender:data.gender,shiny:data.shiny==='true',moves,notes:data.notes,inTeam:data.inTeam==='true'};
    const editId=state.editingCaptureId;await request('POST',editId?`/api/campaigns/${c.id}/captured/${editId}/update`:`/api/campaigns/${c.id}/captured`,payload);
    state.editingCaptureId=null;state.selectedTrainerId=data.ownerId;await refresh();notice(editId?'Ficha do Pokémon atualizada!':'Pokémon entregue ao treinador!');
  } else if(form.classList.contains('capture-customize')){
    const c=activeCampaign();await request('POST',`/api/campaigns/${c.id}/captured/${form.dataset.id}/customize`,{nickname:data.nickname,notes:data.notes});await refresh();notice('Apelido e anotações salvos!');
  } else if(form.id==='auth-form'){
    if(state.authMode==='register'&&data.password!==data.confirm)throw new Error('As senhas não coincidem.');
    await request('POST',state.authMode==='register'?'/api/register':'/api/login',{...data,role:state.role});state.view='inicio';state.dexFilter='all';await refresh();notice(state.authMode==='register'?'Conta criada! Bem-vindo ao EvoLink.':'Login realizado!');
     if(state.pendingCode && state.user?.role==='jogador'){const code=state.pendingCode;state.pendingCode='';try{const joined=await request('POST','/api/campaigns/join',{code});state.selectedCampaignId=joined.campaign.id;await refresh();if(!DEMO)history.replaceState({},'',location.pathname);notice('Você entrou na campanha pelo convite!');}catch(err){notice('Login feito, mas o convite falhou: '+err.message,true);}}
  } else if(form.id==='invite-form'){
    state.role='jogador';state.pendingCode=String(data.code||'').toUpperCase().replace(/[\s-]/g,'');render();notice('Convite guardado! Entre ou crie uma conta de Jogador.');
  } else if(form.id==='create-campaign-form'){
    const r=await request('POST','/api/campaigns',{name:data.name});state.selectedCampaignId=r.campaign.id;await refresh();notice('Campanha criada! Compartilhe o código.');
  } else if(form.id==='join-campaign-form'){
    const r=await request('POST','/api/campaigns/join',{code:data.code});state.selectedCampaignId=r.campaign.id;await refresh();notice('Você entrou na campanha!');
  } else if(form.id==='add-species-form'){
    const c=activeCampaign();if(!c)throw new Error('Selecione uma campanha.');
    const fileNormal=data.normalImage,fileShiny=data.shinyImage;
    const stats=Object.fromEntries(['hp','attack','defense','spAttack','spDefense','speed'].map(k=>[k,data[k]||null]));
    const payload={...data,stats,abilities:{primary:data.ability1,secondary:data.ability2,hidden:data.hiddenAbility},visibleToPlayers:data.visibleToPlayers==='true'};
    delete payload.normalImage;delete payload.shinyImage;
    for(const file of [fileNormal,fileShiny])if(file instanceof File&&file.size>20_000_000)throw new Error('Cada arte deve ter até 20 MB.');
    const editId=state.editingSpeciesId;
    const endpoint=`/api/campaigns/${c.id}/species`;
    const result=await request('POST',editId?`${endpoint}/${editId}/update`:endpoint,payload);
    let uploaded=0;
    for(const [variant,file] of [['normal',fileNormal],['shiny',fileShiny]]){
      if(!(file instanceof File)||!file.size)continue;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Pokémon salvo, mas a imagem precisa ser PNG, JPG ou WEBP.');
      if(file.size>20_000_000)throw new Error('O limite agora é de 20 MB por imagem.');
      const base64=DEMO?await compressDemoImage(file):await readFileBase64(file);
      await request('POST',`${endpoint}/${result.species.id}/image`,{variant,mime:DEMO?'image/webp':file.type,base64});uploaded++;
    }
    state.editingSpeciesId=null;await refresh();notice(`Pokémon ${editId?'atualizado':'cadastrado'}! ${uploaded?uploaded+' imagem(ns) enviada(s).':''}`);
  } else if(form.id==='import-species-form'){
    const c=activeCampaign();if(!c)throw new Error('Selecione uma campanha.');
    const file=data.importFile;if(!(file instanceof File)||file.size>2_000_000)throw new Error('Escolha JSON de até 2 MB.');
    let parsed;try{parsed=JSON.parse(await file.text());}catch{throw new Error('Arquivo JSON inválido.');}
    const entries=Array.isArray(parsed)?parsed:parsed.species;
    if(!Array.isArray(entries)||!entries.length||entries.length>200)throw new Error('O JSON precisa conter de 1 a 200 Pokémon.');
    const result=await request('POST',`/api/campaigns/${c.id}/species/import`,{species:entries});await refresh();notice(`${result.imported} Pokémon importados!`);
  } else if(form.id==='trainer-image-form'){
    const file=data.characterImage;
    if(!(file instanceof File)||!file.size||file.size>5_000_000)throw new Error('Escolha uma imagem de até 5 MB.');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use PNG, JPG ou WEBP.');
    await request('POST','/api/trainer/image',{base64:DEMO?await compressDemoImage(file):await readFileBase64(file)});await refresh();notice('Imagem do personagem salva!');
  } else if(form.id==='trainer-form'){
    await request('POST','/api/trainer',data);await refresh();notice('Ficha do treinador atualizada!');
  }
 }catch(err){notice(err.message||'Ocorreu um erro.',true);}finally{state.busy=false;freeze(submit,false);}
});
(async()=>{
 try{
   if(state.pendingCode && !DEMO){
     try {const invite=await request('GET',`/api/invites/${encodeURIComponent(state.pendingCode)}`);state.inviteCampaign=invite.campaign;state.role='jogador';}
     catch(err){notice(err.message,true);state.pendingCode='';history.replaceState({},'',location.pathname);}
   }
   await refresh();
   if(state.pendingCode && state.user?.role==='jogador'){
     const code=state.pendingCode;
     try {const joined=await request('POST','/api/campaigns/join',{code});state.pendingCode='';state.selectedCampaignId=joined.campaign.id;history.replaceState({},'',location.pathname);await refresh();notice('Convite aceito! Você entrou na campanha.');}
     catch(err){notice('Convite não aceito: '+err.message,true);}
   }
   if(!DEMO && 'serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost'))navigator.serviceWorker.register('/sw.js').catch(()=>{});}
 catch(err){app.innerHTML=`<main class="screen auth-screen"><header class="brand"><div class="brand-top">Pokémon</div><div class="brand-bottom">EVOLUTION</div><div class="brand-rpg">RPG</div></header>${paper('SEM CONEXÃO',`<div class="empty"><div class="emoji">📡</div><h3>Não foi possível acessar o servidor</h3><p>O EvoLink precisa do servidor Node.js para cadastro e login reais. Se quiser apenas conhecer a interface, abra o arquivo <strong>demo.html</strong>.</p><button class="btn primary full" data-action="reload">Tentar novamente</button></div>`)}</main>`;notice('Conexão indisponível.',true);}
})();

