'use strict';
/* EvoLink v14: Pokédex visual e responsiva para os jogadores.
 * Acesso somente de leitura; respeita espécies desconhecidas e visibilidade por campanha. */
(() => {
  if (typeof app === 'undefined' || typeof renderDashboard !== 'function' || typeof activeCampaign !== 'function') return;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TYPE_ICONS = {
    'Normal':'○','Fogo':'🔥','Água':'💧','Grama':'🌿','Elétrico':'⚡','Gelo':'❄️','Lutador':'✊',
    'Veneno':'☣️','Terra':'⛰️','Voador':'🕊️','Psíquico':'🔮','Inseto':'🐞','Pedra':'🪨','Fantasma':'👻',
    'Dragão':'🐉','Sombrio':'🌙','Aço':'⬡','Fada':'✦'
  };
  const typeNames = ['Normal','Fogo','Água','Grama','Elétrico','Gelo','Lutador','Veneno','Terra','Voador','Psíquico','Inseto','Pedra','Fantasma','Dragão','Sombrio','Aço','Fada'];
  const pageSize = 24;
  const isPlayer = () => state.user?.role === 'jogador';
  const currentCamp = () => activeCampaign();
  const num = n => String(Number(n || 0)).padStart(4,'0');
  const speciesForCampaign = () => (state.species || []).filter(x => x.campaignId === currentCamp()?.id).sort((a,b) => a.number-b.number);
  const statusOf = sp => dexStatus(sp, currentCamp(), state.user.id);
  const hidden = sp => sp.unknown === true || statusOf(sp) === 'unknown';
  const known = sp => sp && !hidden(sp);
  function matchingSpecies(){
    const q = (state.dexV14Search || '').toLocaleLowerCase('pt-BR').trim();
    const type = state.dexV14Type || 'Todos';
    const f = state.dexFilter || 'all';
    return speciesForCampaign().filter(sp => {
      const st = statusOf(sp);
      if (f === 'seen' && st !== 'seen' && st !== 'caught') return false;
      if (f === 'caught' && st !== 'caught') return false;
      if (f === 'unknown' && st !== 'unknown') return false;
      if (type !== 'Todos' && (hidden(sp) || (sp.type1 !== type && sp.type2 !== type))) return false;
      if (!q) return true;
      return String(sp.number).includes(q.replace('#','')) || (!hidden(sp) && String(`${sp.name} ${sp.type1||''} ${sp.type2||''}`).toLocaleLowerCase('pt-BR').includes(q));
    });
  }
  function typeChip(type){
    if(!type) return '';
    return `<span class="dex-v12-type-pill evo-v14-chip" data-type="${escapeHTML(type)}"><b>${escapeHTML(TYPE_ICONS[type] || '•')}</b> ${escapeHTML(type.toUpperCase())}</span>`;
  }
  function card(sp) {
    const st = statusOf(sp);
    const locked = hidden(sp);
    const shiny = state.dexV14Shiny === true;
    const art = locked ? '' : (shiny ? (sp.images?.shiny || sp.images?.normal) : (sp.images?.normal || sp.images?.shiny)) || '';
    const content = `<span class="dex-v12-card-content">
      <span class="dex-v12-card-top"><span class="dex-v12-number">#${num(sp.number)}</span>
      <span class="dex-v12-name">${locked?'????':escapeHTML(sp.name)}</span>
      <span class="dex-v12-card-check" aria-label="${st==='caught'?'Capturado':st==='seen'?'Visto':'Desconhecido'}">${st==='caught'?'✓':st==='seen'?'◉':'🔒'}</span></span>
      <span class="dex-v12-category">${locked?'Pokémon não descoberto':escapeHTML(sp.category || 'Pokémon')}</span>
      <span class="dex-v12-types">${locked?'<span class="dex-v12-type-pill">???</span>':typeChip(sp.type1)+typeChip(sp.type2)}</span>
      <span class="dex-v12-edit-caption">${locked?'Encontre este Pokémon para desbloquear':st==='caught'?'◉ Capturado • Toque para ver':'👁 Visto • Toque para ver'} ›</span>
      </span><span class="dex-v12-image-circle">${locked?'<span class="evo-v14-locked-art" aria-hidden="true">?</span>':art?`<img class="dex-v12-image" src="${escapeHTML(art)}" alt="" loading="lazy">`:'<span class="dex-v12-art-placeholder">◉</span>'}</span>`;
    if(locked) return `<article class="dex-v12-card evo-v14-locked" data-type="Normal" aria-label="Pokémon número ${num(sp.number)} ainda não visto">${content}</article>`;
    return `<button type="button" class="dex-v12-card" data-type="${escapeHTML(sp.type1||'Normal')}" data-action="dex-v14-open" data-value="${escapeHTML(sp.id)}" aria-label="Abrir informações de ${escapeHTML(sp.name)}">${content}</button>`;
  }
  function results(){
    const pool=matchingSpecies();
    const pages=Math.max(1,Math.ceil(pool.length/pageSize));
    state.dexV14Page=Math.min(pages-1,Math.max(0,state.dexV14Page||0));
    const sliced=pool.slice(state.dexV14Page*pageSize,(state.dexV14Page+1)*pageSize);
    return `<p class="dex-v12-count">${pool.length} Pokémon encontrados • página ${state.dexV14Page+1} de ${pages}</p>
      <div class="dex-v12-list">${sliced.length?sliced.map(card).join(''):'<div class="dex-v12-empty"><strong>Nenhum Pokémon encontrado</strong><p>Altere os filtros para procurar outras espécies.</p></div>'}</div>
      ${pages>1?`<div class="dex-v12-pager"><button class="btn secondary tiny" type="button" data-action="dex-v14-page" data-value="-1" ${state.dexV14Page===0?'disabled':''}>← Anterior</button><span>${state.dexV14Page+1} / ${pages}</span><button class="btn secondary tiny" type="button" data-action="dex-v14-page" data-value="1" ${state.dexV14Page+1>=pages?'disabled':''}>Próxima →</button></div>`:''}`;
  }
  function progress(){
    const pool=speciesForCampaign();
    return {seen:pool.filter(s=>['seen','caught'].includes(statusOf(s))).length,caught:pool.filter(s=>statusOf(s)==='caught').length,unknown:pool.filter(s=>statusOf(s)==='unknown').length};
  }
  function page(){
    const camp=currentCamp();
    const counter=progress();
    return `<div class="evo-v14-pokedex-list">
      ${campaignPicker()}
      <div class="dex-v12-header evo-v14-header"><div class="dex-v12-header-title"><span class="dex-v12-kicker">SUA AVENTURA POKÉMON</span><h1>Pokédex</h1><p>${escapeHTML(camp?.name||'Descubra novas espécies')}</p></div>
        <button type="button" class="dex-v12-shiny ${state.dexV14Shiny?'selected':''}" data-action="dex-v14-shiny" title="Alternar normal/shiny"><span>✦</span><small>${state.dexV14Shiny?'Shiny':'Normal'}</small></button></div>
      ${!camp?'<div class="dex-v12-empty"><strong>Você ainda não entrou em uma campanha.</strong><p>Peça ao Mestre o código de convite.</p></div>':`
      <div class="evo-v14-progress"><div><b>${counter.seen}</b><small>👁 Vistos</small></div><div><b>${counter.caught}</b><small>◉ Capturados</small></div><div><b>${counter.unknown}</b><small>🔒 Não vistos</small></div></div>
      <div class="evo-v14-filters">${[['all','Todos'],['seen','Vistos'],['caught','Capturados'],['unknown','Não vistos']].map(([id,label])=>`<button type="button" class="${(state.dexFilter||'all')===id?'active':''}" data-action="dex-v14-filter" data-value="${id}">${label}</button>`).join('')}</div>
      <div class="dex-v12-filters"><label class="field"><span>Pesquisar</span><input id="dex-v14-search" type="search" placeholder="Nome ou número" value="${escapeHTML(state.dexV14Search||'')}"></label>
       <label class="field"><span>Tipo</span><select id="dex-v14-type">${['Todos',...typeNames].map(t=>`<option value="${escapeHTML(t)}" ${state.dexV14Type===t?'selected':''}>${escapeHTML(t)}</option>`).join('')}</select></label></div>
      <div id="dex-v14-results">${results()}</div>
      <p class="evo-v14-tip">🔒 Pokémon não vistos continuam ocultos. Quando o Mestre registrar um encontro, a ficha será revelada.</p>`}
    </div>`;
  }
  function isValidSelected(){
    const sp=speciesForCampaign().find(sp=>sp.id===state.dexV14SelectedId);
    return known(sp)?sp:null;
  }
  function detail(){
    const sp=isValidSelected();
    if(!sp) return '<div class="dex-v12-empty"><strong>Pokémon ainda não descoberto.</strong><p>Volte para a lista da sua Pokédex.</p><button type="button" class="btn secondary" data-action="dex-v14-back">← Voltar</button></div>';
    const renderDetail=window.EvoLinkDexV13?.renderDetail;
    if(!renderDetail) return '<div class="dex-v12-empty"><p>Não foi possível abrir a ficha visual. Atualize a página.</p></div>';
    const previous=state.dexV13Shiny;
    state.dexV13Shiny=state.dexV14Shiny===true;
    const html=renderDetail(sp,{readOnly:true});
    state.dexV13Shiny=previous;
    return `<div class="evo-v14-readonly">${html}</div>`;
  }
  function refreshResults(){const node=app.querySelector('#dex-v14-results');if(node)node.innerHTML=results();}
  const before=renderDashboard;
  renderDashboard=function(){
    const player=isPlayer()&&state.view==='pokedex';
    const showDetail=player&&!!state.dexV14SelectedId;
    if(player)state.view='inicio';
    try{before();}finally{if(player)state.view='pokedex';}
    if(!player)return;
    const main=app.querySelector('.dashboard-screen');
    if(!main)return;
    const header=main.querySelector('.topbar');
    if(header)main.innerHTML=header.outerHTML+(showDetail?detail():page());
    main.classList.add('evo-v14-screen');
    const nav=app.querySelector('.bottom-nav');
    nav?.querySelectorAll('.nav-item').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-current','false');});
    const target=nav?.querySelector('[data-value="pokedex"]');
    if(target){target.classList.add('active');target.setAttribute('aria-current','page');}
  };
  app.addEventListener('click',e=>{
    if(!isPlayer())return;
    const b=e.target.closest?.('[data-action]');if(!b)return;
    const action=b.dataset.action;
    if(!action.startsWith('dex-v14-')&&!action.startsWith('dex-v13-'))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(action==='dex-v14-open'){
      const sp=speciesForCampaign().find(x=>x.id===b.dataset.value);
      if(!known(sp)){notice('Este Pokémon ainda não foi descoberto.',true);return;}
      state.dexV14SelectedId=sp.id;state.dexV13Tab='informacoes';state.dexV14Page=Math.max(0,state.dexV14Page||0);render();window.scrollTo({top:0,behavior:'smooth'});
    }else if(action==='dex-v14-back'||action==='dex-v13-back'){
      state.dexV14SelectedId=null;render();window.scrollTo({top:0,behavior:'smooth'});
    }else if(action==='dex-v13-tab'){
      state.dexV13Tab=b.dataset.value;render();window.scrollTo({top:0,behavior:'smooth'});
    }else if(action==='dex-v13-movemode'){
      state.dexV13MoveMode=b.dataset.value;render();
    }else if(action==='dex-v13-shiny'||action==='dex-v14-shiny'){
      state.dexV14Shiny=!state.dexV14Shiny;render();
    }else if(action==='dex-v13-jump'){
      const sp=speciesForCampaign().find(x=>x.id===b.dataset.value);
      if(!known(sp)){notice('Essa evolução ainda não foi descoberta.',true);return;}
      state.dexV14SelectedId=sp.id;state.dexV13Tab='informacoes';render();window.scrollTo({top:0,behavior:'smooth'});
    }else if(action==='dex-v14-page'){
      state.dexV14Page=Math.max(0,(state.dexV14Page||0)+Number(b.dataset.value));refreshResults();app.querySelector('#dex-v14-results')?.scrollIntoView({behavior:'smooth',block:'start'});
    }else if(action==='dex-v14-filter'){
      state.dexFilter=b.dataset.value;state.dexV14Page=0;render();
    }
  },true);
  app.addEventListener('input',e=>{if(e.target?.id==='dex-v14-search'){state.dexV14Search=e.target.value;state.dexV14Page=0;refreshResults();}},true);
  app.addEventListener('change',e=>{
    if(e.target?.id==='dex-v14-type'){state.dexV14Type=e.target.value;state.dexV14Page=0;refreshResults();}
    if(e.target?.id==='active-campaign')state.dexV14SelectedId=null;
  },true);
  // Se o usuário selecionou outra campanha, nunca manter um detalhe da campanha anterior.
  const originalRefresh=refresh;
  refresh=async function(){
    const response=await originalRefresh();
    if(state.dexV14SelectedId&&!isValidSelected())state.dexV14SelectedId=null;
    return response;
  };
})();
