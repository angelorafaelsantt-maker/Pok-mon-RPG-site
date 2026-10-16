'use strict';
/* EvoLink - Ataques v7. Catálogo oficial obtido pelo servidor da PokéAPI (dados no Railway).
 * Conteúdo criado por adaptação: nenhum dano oficial é preenchido. */
(() => {
  const entriesPerPage=24;
  let official=[];
  let custom=[];
  let search='',typeFilter='Todos',categoryFilter='Todos',page=0,editing=null;
  let loading=null;
  const TYPES=['Normal','Fogo','Água','Grama','Elétrico','Gelo','Lutador','Veneno','Terra','Voador','Psíquico','Inseto','Pedra','Fantasma','Dragão','Sombrio','Aço','Fada'];
  const CLASSES=['Físico','Especial','Status'];
  const safe=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]));
  const active=()=>state.campaigns.find(c=>c.id===state.selectedCampaignId)||state.campaigns[0];
  function combined(){
    const campaign=active();
    const overrides=(state.moves||[]).filter(x=>x.campaignId===campaign?.id);
    const keyed=new Map(overrides.filter(x=>x.officialId!=null).map(x=>[Number(x.officialId),x]));
    const rows=official.map(x=>{
      const o=keyed.get(x.officialId);
      return o?{...x,...o,key:'o:'+x.officialId,overrideId:o.id,official:true}:{...x,key:'o:'+x.officialId,official:true};
    });
    for(const x of overrides)if(x.officialId==null)rows.push({...x,key:'c:'+x.id,overrideId:x.id,official:false});
    return rows;
  }
  function renderResults(){
    const matches=combined().filter(x=>{
      const q=search.toLocaleLowerCase('pt-BR');
      return (!q||x.name.toLocaleLowerCase('pt-BR').includes(q))&&
        (typeFilter==='Todos'||x.type===typeFilter)&&
        (categoryFilter==='Todos'||x.category===categoryFilter);
    });
    const pages=Math.max(1,Math.ceil(matches.length/entriesPerPage));
    page=Math.min(pages-1,Math.max(0,page));
    const cards=matches.slice(page*entriesPerPage,(page+1)*entriesPerPage).map(x=>`<article class="list-card" style="margin:9px 0;padding:12px">
      <div class="row"><h3>${safe(x.name)}</h3>${state.user?.role==='mestre'?`<button class="btn tiny secondary" type="button" data-action="move-edit" data-key="${safe(x.key)}">Editar</button>`:''}</div>
      <div class="row" style="justify-content:flex-start;gap:6px"><span class="type ${safe(x.type)}">${safe(x.type)}</span><span class="badge">${safe(x.category)}</span><span class="badge">${x.official?'Oficial':'Criado'}</span></div>
      <p><strong>Dano no RPG:</strong> ${x.damage?safe(x.damage):'<i>Não definido</i>'} • <strong>PP:</strong> ${x.pp==null?'—':safe(x.pp)} • <strong>Precisão:</strong> ${x.accuracy==null?'—':safe(x.accuracy)+'%'}</p>
      ${x.effect?`<p><strong>Efeito:</strong> ${safe(x.effect)}</p>`:''}
      ${x.notes&&state.user?.role==='mestre'?`<details><summary>Notas do Mestre</summary><p>${safe(x.notes)}</p></details>`:''}
      ${x.overrideId&&state.user?.role==='mestre'?`<button class="btn tiny ghost" data-action="move-delete" data-id="${safe(x.overrideId)}" data-official="${x.official}" type="button">${x.official?'Restaurar padrão':'Excluir ataque'}</button>`:''}
    </article>`).join('')||'<p class="note">Nenhum ataque encontrado. Tente outra busca.</p>';
    return `<p class="subtle">${matches.length} ataques • página ${page+1} de ${pages}</p>${cards}
      ${pages>1?`<div class="row"><button class="btn tiny secondary" data-action="move-page" data-value="-1" ${page===0?'disabled':''}>Anterior</button><span>${page+1}/${pages}</span><button class="btn tiny secondary" data-action="move-page" data-value="1" ${page>=pages-1?'disabled':''}>Próxima</button></div>`:''}`;
  }
  function input(name,label,v='',more=''){return `<label class="field"><span>${label}</span><input name="${name}" value="${safe(v)}" ${more}></label>`;}
  function options(list,value){return list.map(t=>`<option value="${safe(t)}" ${t===value?'selected':''}>${safe(t)}</option>`).join('');}
  function moveForm(entry){
    const m=entry||{};
    return `<section class="paper dashboard-paper"><h2 class="paper-title">${entry?'EDITAR ATAQUE':'CRIAR ATAQUE ORIGINAL'}</h2>
      <form id="move-form" class="form-stack">
        ${input('name','Nome do ataque',m.name||'',`required minlength="2" maxlength="80" ${entry?.official?'readonly':''}`)}
        <div class="spec-form-two"><label class="field"><span>Tipo</span><select name="type">${options(TYPES,m.type||'Normal')}</select></label><label class="field"><span>Categoria</span><select name="category">${options(CLASSES,m.category||'Físico')}</select></label></div>
        <div class="spec-form-two">${input('pp','PP (opcional)',m.pp??'','type="number" min="0" max="99"')}${input('accuracy','Precisão % (opcional)',m.accuracy??'','type="number" min="0" max="100"')}</div>
        ${input('damage','Dano adaptado para o RPG',m.damage||'','maxlength="120" placeholder="Deixe vazio; exemplo futuro: 2d6+3"')}
        <label class="field"><span>Efeito ou mecânica no RPG</span><textarea name="effect" rows="3" maxlength="650">${safe(m.effect||'')}</textarea></label>
        <label class="field"><span>Observações privadas do Mestre</span><textarea name="notes" rows="2" maxlength="650">${safe(m.notes||'')}</textarea></label>
        <button class="btn blue full" type="submit">${entry?'Salvar alterações':'Cadastrar ataque'}</button>
        ${entry?'<button class="btn secondary full" type="button" data-action="move-cancel">Cancelar edição</button>':''}
      </form></section>`;
  }
  function pageHTML(){
    const master=state.user?.role==='mestre';
    const current=editing?combined().find(x=>x.key===editing):null;
    return `<section class="hero-welcome"><span class="badge gold">⚔️ BIBLIOTECA DE GOLPES</span><h1>Ataques Pokémon</h1>
      <p>${official.length} golpes oficiais • dano em branco até o Mestre adaptar ao RPG.</p></section>
      ${master&&active()?moveForm(current):''}
      <div class="section-title"><h2>📚 Ataques disponíveis</h2></div>
      ${input('attackSearch','Buscar ataque',search,'id="attack-search" type="search" placeholder="Thunderbolt, Surf, Tackle..."')}
      <div class="spec-form-two" style="margin-top:8px"><label class="field"><span>Tipo</span><select id="attack-type">${options(['Todos',...TYPES],typeFilter)}</select></label><label class="field"><span>Categoria</span><select id="attack-category">${options(['Todos',...CLASSES],categoryFilter)}</select></label></div>
      <div id="attack-results">${renderResults()}</div>`;
  }
  function refreshList(){const node=app.querySelector('#attack-results');if(node)node.innerHTML=renderResults();}
  async function loadOfficial(){
    if(official.length||loading)return loading;
    loading=fetch('/api/moves/catalog',{credentials:'same-origin'}).then(async r=>{
      if(!r.ok)throw new Error('Catálogo indisponível. Recarregue a página.');
      const j=await r.json();
      official=j.moves.map(([officialId,name,type,category,pp,accuracy])=>({officialId,name,type,category,pp,accuracy,damage:'',effect:'',notes:''}));
      if(state.view==='ataques')render();
    }).catch(err=>notice(err.message,true)).finally(()=>{loading=null;});
    return loading;
  }
  const before=renderDashboard;
  renderDashboard=function(){
    const attacks=state.view==='ataques';
    if(attacks)state.view='inicio';
    try{before();}finally{if(attacks)state.view='ataques';}
    const nav=app.querySelector('.bottom-nav');
    const anchor=nav?.querySelector('button[data-value="pokedex"]');
    if(anchor){
      const b=document.createElement('button');b.type='button';b.className='nav-item'+(attacks?' active':'');b.dataset.action='nav';b.dataset.value='ataques';b.setAttribute('aria-current',attacks?'page':'false');b.innerHTML='<span aria-hidden="true">⚔️</span><span>Ataques</span>';anchor.after(b);
      nav.style.gridTemplateColumns='repeat(5,minmax(0,1fr))';nav.style.gridTemplateRows='repeat(2,auto)';
    }
    const main=app.querySelector('.dashboard-screen');if(main)main.style.paddingBottom='190px';
    if(attacks&&main){
      const top=main.querySelector('.topbar');if(top)main.innerHTML=top.outerHTML+pageHTML();
      if(!official.length)loadOfficial();
    }else if(main){
      const fields=Array.from(main.querySelectorAll('#capture-form input[name^="move"],#evo-team-pokemon-form input[name^="move"]'));
      if(fields.length){const list=document.createElement('datalist');list.id='attack-native-suggestions';main.appendChild(list);
        for(const field of fields){field.setAttribute('list',list.id);field.setAttribute('autocomplete','off');field.placeholder='Escolha ou digite um golpe';}
      }
    }
  };
  function suggestions(query=''){
    const node=app.querySelector('#attack-native-suggestions');if(!node)return;
    if(!official.length){loadOfficial();return;}
    const q=query.toLowerCase().trim();
    const options=combined().filter(x=>!q||x.name.toLowerCase().includes(q)).slice(0,60);
    node.innerHTML=options.map(x=>`<option value="${safe(x.name)}"></option>`).join('');
  }
  app.addEventListener('focusin',e=>{if(e.target?.matches?.('[list="attack-native-suggestions"]'))suggestions(e.target.value);},true);
  app.addEventListener('input',e=>{
    if(e.target?.id==='attack-search'){search=e.target.value;page=0;refreshList();}
    if(e.target?.matches?.('[list="attack-native-suggestions"]'))suggestions(e.target.value);
  },true);
  app.addEventListener('change',e=>{if(e.target?.id==='attack-type'){typeFilter=e.target.value;page=0;refreshList();}if(e.target?.id==='attack-category'){categoryFilter=e.target.value;page=0;refreshList();}},true);
  app.addEventListener('click',async e=>{
    const b=e.target.closest('[data-action]'),action=b?.dataset.action;
    if(!action?.startsWith('move-'))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(action==='move-page'){page=Math.max(0,page+Number(b.dataset.value));refreshList();return;}
    if(action==='move-edit'){editing=b.dataset.key;render();app.querySelector('#move-form')?.scrollIntoView({block:'start',behavior:'smooth'});return;}
    if(action==='move-cancel'){editing=null;render();return;}
    if(action==='move-delete'){
      if(!confirm(b.dataset.official==='true'?'Restaurar ataque oficial?':'Excluir ataque criado?'))return;
      try{await request('DELETE',`/api/campaigns/${active().id}/moves/${b.dataset.id}`);editing=null;await refresh();notice('Ataque atualizado.');}catch(err){notice(err.message,true);}
    }
  },true);
  app.addEventListener('submit',async e=>{
    if(e.target?.id!=='move-form')return;
    e.preventDefault();e.stopImmediatePropagation();
    const c=active();if(!c)return notice('Selecione uma campanha.',true);
    const form=e.target,btn=form.querySelector('[type=submit]');
    const m=editing?combined().find(x=>x.key===editing):null;
    const data=Object.fromEntries(new FormData(form));data.officialId=m?.official?m.officialId:null;
    try{
      state.busy=true;btn.disabled=true;
      const base=`/api/campaigns/${c.id}/moves`;
      await request('POST',m?.overrideId?`${base}/${m.overrideId}/update`:base,data);
      editing=null;await refresh();notice('Ataque salvo nesta campanha!');
    }catch(err){notice(err.message,true);}finally{state.busy=false;btn.disabled=false;}
  },true);
})();
