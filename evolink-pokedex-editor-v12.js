'use strict';
/* EvoLink v12 - Lista visual de especies no painel do Mestre.
 * A edicao detalhada continua na tela ja instalada (v11).
 * Nao altera o banco de dados, os personagens ou o armazenamento. */
(() => {
  if (typeof app === 'undefined' || typeof state === 'undefined' ||
      typeof renderDashboard !== 'function' || typeof activeCampaign !== 'function') {
    console.warn('EvoLink v12: os componentes principais ainda nao estao disponiveis.');
    return;
  }

  const colorTypes = ['Normal','Fogo','Água','Grama','Elétrico','Gelo','Lutador','Veneno',
    'Terra','Voador','Psíquico','Inseto','Pedra','Fantasma','Dragão','Sombrio','Aço','Fada'];
  const pageSize = 30;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byNumber = (a, b) => Number(a.number) - Number(b.number) || a.name.localeCompare(b.name,'pt-BR');
  const fourDigits = num => String(num ?? 0).padStart(4,'0');
  const filteredCampaign = () => {
    const camp = activeCampaign();
    return (state.species || []).filter(sp => sp.campaignId === camp?.id && !sp.unknown).sort(byNumber);
  };

  function filteredSpecies() {
    const query = String(state.dexV12Query || '').toLocaleLowerCase('pt-BR').trim();
    const filterType = state.dexV12Filter || 'Todos';
    return filteredCampaign().filter(sp => {
      const text = `${sp.number} ${fourDigits(sp.number)} ${sp.name} ${sp.type1 || ''} ${sp.type2 || ''}`.toLocaleLowerCase('pt-BR');
      return (!query || text.includes(query)) &&
        (filterType === 'Todos' || sp.type1 === filterType || sp.type2 === filterType);
    });
  }

  function typePill(type) {
    if (!type) return '';
    return `<span class="dex-v12-type-pill" data-type="${safe(type)}">${safe(type)}</span>`;
  }

  function speciesCard(sp) {
    const shiny = state.dexV12Shiny === true;
    const url = (shiny && sp.images?.shiny) || sp.images?.normal || '';
    const kind = sp.category || 'Pokémon';
    return `<button type="button" class="dex-v12-card" data-action="dex-v12-open" data-value="${safe(sp.id)}"
      data-type="${safe(sp.type1 || 'Normal')}" aria-label="Editar ${safe(sp.name)}, número ${fourDigits(sp.number)}">
      <span class="dex-v12-card-content">
        <span class="dex-v12-card-top">
          <span class="dex-v12-number">#${fourDigits(sp.number)}</span>
          <span class="dex-v12-name">${safe(sp.name)}</span>
          <span class="dex-v12-card-check" aria-label="Pokémon cadastrado">✓</span>
        </span>
        <span class="dex-v12-category">${safe(kind)}</span>
        <span class="dex-v12-types">${typePill(sp.type1)}${typePill(sp.type2)}</span>
        <span class="dex-v12-edit-caption">Toque para editar a ficha <span aria-hidden="true">›</span></span>
      </span>
      <span class="dex-v12-image-circle">
        ${url ? `<img class="dex-v12-image" src="${safe(url)}" alt="" loading="lazy">` : '<span class="dex-v12-art-placeholder" aria-hidden="true">◉</span>'}
      </span>
    </button>`;
  }

  function listResults() {
    const all = filteredSpecies();
    const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
    state.dexV12Page = Math.min(pageCount - 1, Math.max(0, state.dexV12Page || 0));
    const from = state.dexV12Page * pageSize;
    const chunk = all.slice(from, from + pageSize);
    return `<div class="dex-v12-count" role="status">${all.length} Pokémon encontrados — página ${state.dexV12Page+1} de ${pageCount}</div>
      <div class="dex-v12-list">${chunk.length ? chunk.map(speciesCard).join('') :
        `<div class="dex-v12-empty"><strong>Nenhum Pokémon encontrado</strong><p>Tente pesquisar outro nome, número ou tipo.</p></div>`}</div>
      ${pageCount > 1 ? `<div class="dex-v12-pager">
        <button type="button" class="btn secondary tiny" data-action="dex-v12-page" data-value="-1" ${state.dexV12Page === 0 ? 'disabled' : ''}>← Anterior</button>
        <span>${state.dexV12Page+1} / ${pageCount}</span>
        <button type="button" class="btn secondary tiny" data-action="dex-v12-page" data-value="1" ${state.dexV12Page === pageCount-1 ? 'disabled' : ''}>Próxima →</button>
      </div>` : ''}`;
  }

  function listPage() {
    const campaign = activeCampaign();
    const all = filteredCampaign();
    return `<section class="dex-v12-page">
      <header class="dex-v12-header">
        <div class="dex-v12-header-title">
          <span class="dex-v12-kicker">EDITOR DO MESTRE</span>
          <h1>Pokédex</h1>
          <p>Escolha um Pokémon para abrir sua ficha de edição.</p>
        </div>
        <button type="button" class="dex-v12-shiny ${state.dexV12Shiny ? 'selected' : ''}" data-action="dex-v12-shiny"
          aria-pressed="${state.dexV12Shiny === true}" aria-label="Alternar imagens normal e shiny" title="Alternar normal/shiny">
          <span aria-hidden="true">✦</span><small>${state.dexV12Shiny ? 'Shiny' : 'Normal'}</small>
        </button>
      </header>
      ${campaignPicker()}
      ${!campaign ? '<div class="dex-v12-empty"><strong>Escolha uma campanha</strong><p>Crie uma campanha para cadastrar e editar Pokémon.</p></div>' :
        `${all.length ? `<div class="dex-v12-filters">
          <label class="field"><span>Pesquisar Pokémon</span><input id="dex-v12-query" type="search" autocomplete="off" placeholder="Nome ou número da Pokédex..." value="${safe(state.dexV12Query || '')}"></label>
          <label class="field"><span>Filtrar por tipo</span><select id="dex-v12-type">
            ${['Todos', ...colorTypes].map(type => `<option value="${safe(type)}" ${state.dexV12Filter === type ? 'selected' : ''}>${safe(type === 'Todos' ? 'Todos os tipos' : type)}</option>`).join('')}
          </select></label>
        </div>` : ''}
        <div id="dex-v12-results">${all.length ? listResults() :
          '<div class="dex-v12-empty"><strong>Pokédex vazia</strong><p>Use a aba Cadastro para adicionar sua primeira espécie.</p></div>'}</div>
        <div class="dex-v12-create"><button type="button" class="btn secondary full" data-action="dex-v12-cadastro">＋ Cadastrar novo Pokémon</button></div>`}
    </section>`;
  }

  function refreshList() {
    const results = app.querySelector('#dex-v12-results');
    if (results) results.innerHTML = listResults();
  }

  // A renderizacao da v11 continua responsavel pela ficha de edicao completa.
  const previousRender = renderDashboard;
  renderDashboard = function () {
    const isMaster = state.user?.role === 'mestre';
    const isEditor = isMaster && state.view === 'editar-pokemon';
    const showList = isEditor && state.dexV12ListMode !== false;
    if (showList) state.view = 'inicio';
    try { previousRender(); }
    finally { if (showList) state.view = 'editar-pokemon'; }
    if (!isMaster) return;
    const main = app.querySelector('.dashboard-screen');
    const nav = app.querySelector('.bottom-nav');
    if (showList && main) {
      const topbar = main.querySelector('.topbar');
      if (topbar) main.innerHTML = topbar.outerHTML + listPage();
      main.classList.add('dex-v12-screen');
      nav?.querySelector('button[data-value="inicio"]')?.classList.remove('active');
      const editNav = nav?.querySelector('button[data-value="editar-pokemon"]');
      if (editNav) { editNav.classList.add('active'); editNav.setAttribute('aria-current','page'); }
    } else if (isEditor && main) {
      // A edicao continua nas quatro abas ja existentes da v11.
      const header = main.querySelector('.topbar');
      const panel = main.querySelector('#evo-v11-form-holder');
      if (header && panel && !main.querySelector('[data-action="dex-v12-back"]')) {
        const back = document.createElement('button');
        back.type = 'button'; back.className = 'btn secondary full dex-v12-back';
        back.dataset.action = 'dex-v12-back';
        back.textContent = '← Voltar para a lista da Pokédex';
        header.after(back);
      }
    }
  };

  // Captura antes dos ouvintes anteriores: a v11 pode interceptar edicoes da aba Cadastro.
  document.addEventListener('click', e => {
    const target = e.target.closest?.('[data-action]');
    if (!target) return;
    if (target.dataset.action === 'nav' && target.dataset.value === 'editar-pokemon') {
      state.dexV12ListMode = true;
      state.dexV12Page = 0;
    }
    if (target.dataset.action === 'edit-species' && state.user?.role === 'mestre') {
      state.dexV12ListMode = false;
    }
    // O listener da edicao v11 e anterior ao nosso. Tratar o voltar aqui,
    // no document, antes dele, garante retorno a lista em vez de Cadastro.
    if (target.dataset.action === 'evo-editor-back' && state.user?.role === 'mestre') {
      e.preventDefault();e.stopImmediatePropagation();
      state.dexV12ListMode = true;
      state.editingSpeciesId = null;
      state.evoEditorReturnId = null;
      state.view = 'editar-pokemon';
      render();window.scrollTo({top:0,behavior:'smooth'});
    }
  }, true);

  app.addEventListener('click', e => {
    const button = e.target.closest?.('[data-action]');
    if (!button || state.user?.role !== 'mestre') return;
    const action = button.dataset.action;
    if (!['dex-v12-open','dex-v12-back','dex-v12-cadastro','dex-v12-shiny','dex-v12-page','evo-editor-back'].includes(action)) return;
    e.preventDefault();e.stopImmediatePropagation();
    if (action === 'dex-v12-open') {
      const chosen = filteredCampaign().find(sp => sp.id === button.dataset.value);
      if (!chosen) return notice('Pokémon não encontrado nesta campanha.',true);
      state.editingSpeciesId = chosen.id;
      state.evoEditorReturnId = chosen.id;
      state.evoEditorTab = 'informacoes';
      state.dexV12ListMode = false;
      state.view = 'editar-pokemon';
      render(); window.scrollTo({top:0,behavior:'smooth'});
    } else if (action === 'dex-v12-back' || action === 'evo-editor-back') {
      state.dexV12ListMode = true;
      state.editingSpeciesId = null;
      state.evoEditorReturnId = null;
      state.view = 'editar-pokemon';
      render(); window.scrollTo({top:0,behavior:'smooth'});
    } else if (action === 'dex-v12-cadastro') {
      state.dexV12ListMode = true;
      state.editingSpeciesId = null;
      state.evoEditorReturnId = null;
      state.view = 'cadastro';
      render(); window.scrollTo({top:0,behavior:'smooth'});
    } else if (action === 'dex-v12-shiny') {
      state.dexV12Shiny = !state.dexV12Shiny;
      render();
    } else if (action === 'dex-v12-page') {
      state.dexV12Page = Math.max(0,(state.dexV12Page||0) + Number(button.dataset.value));
      refreshList();
      app.querySelector('#dex-v12-results')?.scrollIntoView({block:'start',behavior:'smooth'});
    }
  }, true);

  app.addEventListener('input', e => {
    if (e.target?.id === 'dex-v12-query') {
      state.dexV12Query = e.target.value;
      state.dexV12Page = 0;
      refreshList();
    }
  }, true);
  app.addEventListener('change', e => {
    if (e.target?.id === 'dex-v12-type') {
      state.dexV12Filter = e.target.value;
      state.dexV12Page = 0;
      refreshList();
    }
    if (e.target?.id === 'active-campaign' && state.view === 'editar-pokemon') {
      state.dexV12ListMode = true;
      state.dexV12Page = 0;
    }
  }, true);

  // Depois que o servidor confirmou o salvamento, voltar a lista.
  const previousRequest = request;
  request = async function(method,path,data) {
    const result = await previousRequest(method,path,data);
    if (state.view === 'editar-pokemon' && method === 'POST' &&
        /\/species\/[a-f\d-]+\/update$/.test(String(path))) {
      state.dexV12ListMode = true;
    }
    return result;
  };
})();
