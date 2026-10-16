'use strict';
/* EvoLink v13 - Visual corrigido para a ficha de informações do Pokémon.
 * Cria uma visualização mobile limpa e parecida com a referência enviada,
 * sem apagar dados existentes e mantendo o editor bruto acessível. */
(() => {
  if (typeof app === 'undefined' || typeof state === 'undefined' ||
      typeof renderDashboard !== 'function' || typeof activeCampaign !== 'function') {
    console.warn('EvoLink v13: base do EvoLink não encontrada.');
    return;
  }

  const TYPE_ORDER = ['Normal','Fogo','Água','Grama','Elétrico','Gelo','Lutador','Veneno','Terra','Voador','Psíquico','Inseto','Pedra','Fantasma','Dragão','Sombrio','Aço','Fada'];
  const TYPE_ICONS = {
    'Normal':'○','Fogo':'🔥','Água':'💧','Grama':'🌿','Elétrico':'⚡','Gelo':'❄️','Lutador':'✊','Veneno':'☣️',
    'Terra':'⛰️','Voador':'🕊️','Psíquico':'🔮','Inseto':'🐞','Pedra':'🪨','Fantasma':'👻','Dragão':'🐉','Sombrio':'🌙','Aço':'⬡','Fada':'✦'
  };
  const TYPE_CHART = {
    'Normal':   {weak:['Lutador'], immune:['Fantasma']},
    'Fogo':     {weak:['Água','Terra','Pedra'], resist:['Fogo','Grama','Gelo','Inseto','Aço','Fada']},
    'Água':     {weak:['Elétrico','Grama'], resist:['Fogo','Água','Gelo','Aço']},
    'Grama':    {weak:['Fogo','Gelo','Veneno','Voador','Inseto'], resist:['Água','Grama','Elétrico','Terra']},
    'Elétrico': {weak:['Terra'], resist:['Elétrico','Voador','Aço']},
    'Gelo':     {weak:['Fogo','Lutador','Pedra','Aço'], resist:['Gelo']},
    'Lutador':  {weak:['Voador','Psíquico','Fada'], resist:['Inseto','Pedra','Sombrio']},
    'Veneno':   {weak:['Terra','Psíquico'], resist:['Grama','Lutador','Veneno','Inseto','Fada']},
    'Terra':    {weak:['Água','Grama','Gelo'], resist:['Veneno','Pedra'], immune:['Elétrico']},
    'Voador':   {weak:['Elétrico','Gelo','Pedra'], resist:['Grama','Lutador','Inseto'], immune:['Terra']},
    'Psíquico': {weak:['Inseto','Fantasma','Sombrio'], resist:['Lutador','Psíquico']},
    'Inseto':   {weak:['Fogo','Voador','Pedra'], resist:['Grama','Lutador','Terra']},
    'Pedra':    {weak:['Água','Grama','Lutador','Terra','Aço'], resist:['Normal','Fogo','Veneno','Voador']},
    'Fantasma': {weak:['Fantasma','Sombrio'], resist:['Veneno','Inseto'], immune:['Normal','Lutador']},
    'Dragão':   {weak:['Gelo','Dragão','Fada'], resist:['Fogo','Água','Grama','Elétrico']},
    'Sombrio':  {weak:['Lutador','Inseto','Fada'], resist:['Fantasma','Sombrio'], immune:['Psíquico']},
    'Aço':      {weak:['Fogo','Lutador','Terra'], resist:['Normal','Grama','Gelo','Voador','Psíquico','Inseto','Pedra','Dragão','Aço','Fada'], immune:['Veneno']},
    'Fada':     {weak:['Veneno','Aço'], resist:['Lutador','Inseto','Sombrio'], immune:['Dragão']}
  };

  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const escId = safe;
  const four = n => String(Number(n || 0)).padStart(4, '0');
  const num = v => Number(v) || 0;
  const speciesById = () => new Map((state.species || []).map(sp => [sp.id, sp]));
  const speciesByNumber = () => new Map((state.species || []).filter(sp => sp.campaignId === currentCampaign()?.id && !sp.unknown).map(sp => [Number(sp.number), sp]));
  const currentSpecies = () => (state.species || []).find(sp => sp.id === state.editingSpeciesId && sp.campaignId === currentCampaign()?.id && !sp.unknown);
  const currentCampaign = () => activeCampaign && activeCampaign();

  function unique(arr) { return [...new Set((arr || []).filter(Boolean))]; }
  function fmt(value, fallback = '—') {
    return value == null || value === '' ? fallback : String(value);
  }
  function pct(v) {
    const n = Math.max(0, Math.min(100, Number(v) || 0));
    return `${n}%`;
  }
  function typePill(type, extra='') {
    if (!type) return '';
    return `<span class="evo-v13-pill type" data-type="${safe(type)}"><b>${safe(TYPE_ICONS[type] || '•')}</b><span>${safe(type.toUpperCase())}</span></span>`;
  }
  function chip(text, extra='') {
    return `<span class="evo-v13-chip ${extra}">${safe(text)}</span>`;
  }
  function section(title, body, extra='') {
    return `<section class="evo-v13-card ${extra}"><h3 class="evo-v13-section-title">${safe(title)}</h3>${body}</section>`;
  }
  function getArt(sp) {
    const shiny = !!state.dexV13Shiny;
    return (shiny ? (sp?.images?.shiny || sp?.images?.normal) : (sp?.images?.normal || sp?.images?.shiny || '')) || '';
  }

  function getAbilities(sp) {
    const a = sp?.abilities || {};
    const rows = [];
    if (a.primary) rows.push({ name: a.primary, note: '' });
    if (a.secondary) rows.push({ name: a.secondary, note: '' });
    if (a.hidden) rows.push({ name: a.hidden, note: 'Habilidade Oculta' });
    return rows;
  }

  function getStats(sp) {
    const s = sp?.stats || {};
    const rows = [
      ['PS', s.hp], ['Ataque', s.attack], ['Defesa', s.defense],
      ['Ataque Especial', s.spAttack], ['Defesa Especial', s.spDefense], ['Velocidade', s.speed]
    ];
    const total = rows.reduce((sum, [,v]) => sum + (Number(v) || 0), 0);
    return { rows, total };
  }

  function statScale(v) {
    const value = Number(v) || 0;
    return Math.max(16, Math.min(100, Math.round((value / 180) * 100)));
  }

  function evolutionChain(sp) {
    if (!sp) return [];
    const map = speciesByNumber();
    let current = sp;
    const seen = new Set();
    while (current?.evolvesFrom != null && map.get(Number(current.evolvesFrom)) && !seen.has(current.id)) {
      seen.add(current.id);
      current = map.get(Number(current.evolvesFrom));
    }
    const chain = [];
    const used = new Set();
    let node = current;
    while (node && !used.has(node.id)) {
      used.add(node.id);
      chain.push(node);
      if (node.evolvesTo == null) break;
      const next = map.get(Number(node.evolvesTo));
      if (!next) break;
      node = next;
    }
    return chain;
  }

  function computeEffectiveness(type1, type2) {
    const all = TYPE_ORDER;
    const results = new Map(all.map(t => [t, 1]));
    for (const defType of [type1, type2].filter(Boolean)) {
      const meta = TYPE_CHART[defType] || {};
      for (const t of meta.weak || []) results.set(t, (results.get(t) ?? 1) * 2);
      for (const t of meta.resist || []) results.set(t, (results.get(t) ?? 1) * 0.5);
      for (const t of meta.immune || []) results.set(t, 0);
    }
    const groups = { weak4: [], weak2: [], normal: [], resist2: [], resist4: [], immune: [] };
    for (const type of all) {
      const value = results.get(type);
      if (value === 4) groups.weak4.push(type);
      else if (value === 2) groups.weak2.push(type);
      else if (value === 1) groups.normal.push(type);
      else if (value === 0.5) groups.resist2.push(type);
      else if (value === 0.25) groups.resist4.push(type);
      else if (value === 0) groups.immune.push(type);
      else if (value > 2) groups.weak4.push(type);
      else if (value < 0.5 && value > 0) groups.resist4.push(type);
    }
    return groups;
  }

  function envList(sp) {
    const out = [];
    for (const value of [sp?.environments, sp?.environment, sp?.habitats, sp?.locations]) {
      if (Array.isArray(value)) out.push(...value);
      else if (typeof value === 'string' && value.trim()) out.push(...value.split(','));
    }
    return unique(out.map(x => String(x || '').trim()));
  }

  function getGender(sp) {
    if (sp?.genderRateText) return sp.genderRateText;
    if (sp?.genderRatioText) return sp.genderRatioText;
    if (sp?.genderDistributionText) return sp.genderDistributionText;
    const male = sp?.genderRatioMale ?? sp?.maleRatio ?? sp?.genderMale;
    const female = sp?.genderRatioFemale ?? sp?.femaleRatio ?? sp?.genderFemale;
    if (male != null || female != null) return { male: Number(male || 0), female: Number(female || 0) };
    return null;
  }

  function getEggGroups(sp) {
    return unique([].concat(sp?.eggGroups || [], sp?.eggGroup || []));
  }

  function getMoves(sp) {
    const raw = sp?.moves || sp?.movements || sp?.learnset || sp?.attacks || {};
    const pickArray = (...candidates) => {
      for (const c of candidates) if (Array.isArray(c) && c.length) return c;
      return [];
    };
    const level = pickArray(Array.isArray(raw) ? raw : null, raw.levelUp, raw.level, raw.byLevel, sp?.learnset, sp?.levelUpMoves, sp?.movesByLevel, sp?.learnLevelMoves, sp?.movementsByLevel);
    const tm = pickArray(raw.tm, raw.tmhm, raw.tmHm, raw.machine, sp?.tmMoves, sp?.machineMoves, sp?.movesByTM);

    const normalizeLevel = (entry) => {
      if (typeof entry === 'string') return { level: '—', name: entry, type: '', category: '', power: '', accuracy: '', cooldown: '' };
      if (!entry || typeof entry !== 'object') return null;
      return {
        level: entry.level ?? entry.lvl ?? entry.nivel ?? '—',
        plus: entry.plus ?? entry.plusLevel ?? entry.plusLvl ?? '',
        name: entry.name ?? entry.move ?? entry.movimento ?? 'Movimento',
        type: entry.type ?? entry.tipo ?? '',
        category: entry.category ?? entry.classe ?? entry.kind ?? '',
        power: entry.power ?? entry.damage ?? entry.poder ?? '',
        accuracy: entry.accuracy ?? entry.precision ?? entry.prec ?? '',
        cooldown: entry.cooldown ?? entry.cd ?? entry.pp ?? ''
      };
    };
    const normalizeTM = (entry) => {
      if (typeof entry === 'string') return { label: entry, type: '', category: '' };
      if (!entry || typeof entry !== 'object') return null;
      return {
        label: entry.code ? `${entry.code} • ${entry.name || entry.move || 'Movimento'}` : (entry.name || entry.move || entry.movimento || 'Movimento'),
        type: entry.type ?? entry.tipo ?? '',
        category: entry.category ?? entry.classe ?? ''
      };
    };
    return {
      level: level.map(normalizeLevel).filter(Boolean),
      tm: tm.map(normalizeTM).filter(Boolean)
    };
  }

  function gallerySection(sp) {
    const imgs = [
      { key: 'Normal', url: sp?.images?.normal || '' },
      { key: 'Shiny', url: sp?.images?.shiny || '' },
      { key: 'Fêmea', url: sp?.images?.femaleNormal || sp?.images?.female || '' },
      { key: 'Fêmea shiny', url: sp?.images?.femaleShiny || '' }
    ].filter(x => x.url);
    if (!imgs.length) return `<div class="evo-v13-empty">Nenhuma imagem cadastrada.</div>`;
    return `<div class="evo-v13-gallery">${imgs.map(img => `<figure class="evo-v13-gallery-item"><div class="evo-v13-gallery-art"><img src="${safe(img.url)}" alt="${safe(sp.name)} ${safe(img.key)}"></div><figcaption>${safe(img.key)}</figcaption></figure>`).join('')}</div>`;
  }

  function teamsSection(sp) {
    const campaign = currentCampaign();
    const speciesCaps = (state.captured || []).filter(cap => cap.campaignId === campaign?.id && cap.speciesId === sp.id);
    if (!speciesCaps.length) return `<div class="evo-v13-empty">Nenhum treinador recebeu este Pokémon ainda.</div>`;
    const members = new Map((campaign?.members || []).map(m => [m.id, m]));
    return `<div class="evo-v13-team-list">${speciesCaps.map(cap => {
      const owner = members.get(cap.ownerId);
      const ownerName = owner?.trainer?.name || owner?.name || 'Treinador';
      return `<article class="evo-v13-team-row"><div><strong>${safe(cap.nickname || sp.name)}</strong><small>${safe(ownerName)} • Nível ${safe(cap.level)}${cap.shiny ? ' • ✨ Shiny' : ''}</small></div><span class="evo-v13-badge">${cap.inTeam ? 'Equipe ativa' : 'Armazenado'}</span></article>`;
    }).join('')}</div>`;
  }

  function infoSection(sp) {
    const abilityRows = getAbilities(sp);
    const { rows: stats, total } = getStats(sp);
    const chain = evolutionChain(sp);
    const fx = computeEffectiveness(sp.type1, sp.type2);
    const envs = envList(sp);
    const gender = getGender(sp);
    const eggGroups = getEggGroups(sp);
    const description = sp.description || 'Descrição ainda não cadastrada para esta espécie.';
    const infoBlocks = [
      `<div class="evo-v13-type-row">${typePill(sp.type1)}${typePill(sp.type2)}</div>`,
      `<div class="evo-v13-note-box">${safe(description)}</div>`,
      `<div class="evo-v13-mini-grid"><div class="evo-v13-mini-box"><strong>${safe(fmt(sp.weightKg != null ? `${sp.weightKg} kg` : '', '—'))}</strong><span>Peso</span></div><div class="evo-v13-mini-box"><strong>${safe(fmt(sp.heightM != null ? `${sp.heightM} m` : '', '—'))}</strong><span>Altura</span></div></div>`
    ].join('');

    const abilities = section('Habilidades', abilityRows.length ? abilityRows.map(a => `<div class="evo-v13-bar-list-item"><span>${safe(a.name)}</span>${a.note?`<small>${safe(a.note)}</small>`:''}</div>`).join('') : '<div class="evo-v13-empty">Nenhuma habilidade cadastrada.</div>');

    const attr = section('Atributos', `
      <div class="evo-v13-tabs-lite"><button type="button" class="is-active">Atributos base</button><button type="button" disabled>Mín</button><button type="button" disabled>Máx</button></div>
      <div class="evo-v13-stats">${stats.map(([label,val]) => `<div class="evo-v13-stat-row"><span>${safe(label)}</span><div class="evo-v13-stat-bar"><i style="width:${pct(statScale(val))}"></i><b>${safe(fmt(val))}</b></div></div>`).join('')}
      <div class="evo-v13-total-row"><span>Total</span><strong>${safe(fmt(total || '—'))}</strong></div></div>`);

    const evo = section('Cadeia evolutiva', chain.length ? `<div class="evo-v13-evo-chain">${chain.map((node, idx) => {
      const img = state.dexV13Shiny ? (node.images?.shiny || node.images?.normal || '') : (node.images?.normal || node.images?.shiny || '');
      const next = chain[idx + 1];
      const method = next?.evolutionMethod || node?.evolutionMethod || '';
      const publicKnown = state.user?.role === 'mestre' || (node.unknown !== true && dexStatus(node, currentCampaign(), state.user.id) !== 'unknown');
      return `<div class="evo-v13-evo-wrap"><button type="button" class="evo-v13-evo-card ${node.id === sp.id ? 'current' : ''}" data-action="dex-v13-jump" data-value="${escId(node.id)}" ${!publicKnown?'disabled':''}><div class="evo-v13-evo-art">${publicKnown && img ? `<img src="${safe(img)}" alt="">` : '◉'}</div><div class="evo-v13-evo-no">#${four(node.number)}</div><div class="evo-v13-evo-name">${publicKnown?safe(node.name):'????'}</div><div class="evo-v13-evo-types">${publicKnown?typePill(node.type1)+typePill(node.type2):chip('Não descoberto')}</div></button>${next ? `<div class="evo-v13-evo-arrow">→<small>${publicKnown?safe(method || 'Evolui'):'Evolução'}</small></div>` : ''}</div>`;
    }).join('')}</div>` : '<div class="evo-v13-empty">Sem evolução cadastrada.</div>');

    const typeRows = section('Relações de tipo', `
      ${fx.weak4.length ? `<div class="evo-v13-rel-group"><div class="evo-v13-rel-head"><span>4x de dano</span><small>Muito fraco contra…</small></div><div class="evo-v13-chip-list">${fx.weak4.map(t => typePill(t)).join('')}</div></div>` : ''}
      ${fx.weak2.length ? `<div class="evo-v13-rel-group"><div class="evo-v13-rel-head"><span>2x de dano</span><small>Fraco contra…</small></div><div class="evo-v13-chip-list">${fx.weak2.map(t => typePill(t)).join('')}</div></div>` : ''}
      <div class="evo-v13-rel-group"><div class="evo-v13-rel-head"><span>1x de dano</span><small>Dano normal de…</small></div><div class="evo-v13-chip-list">${fx.normal.map(t => typePill(t)).join('')}</div></div>
      ${fx.resist2.length ? `<div class="evo-v13-rel-group"><div class="evo-v13-rel-head"><span>1/2x de dano</span><small>Resistente contra…</small></div><div class="evo-v13-chip-list">${fx.resist2.map(t => typePill(t)).join('')}</div></div>` : ''}
      ${fx.resist4.length ? `<div class="evo-v13-rel-group"><div class="evo-v13-rel-head"><span>1/4x de dano</span><small>Muito resistente contra…</small></div><div class="evo-v13-chip-list">${fx.resist4.map(t => typePill(t)).join('')}</div></div>` : ''}
      ${fx.immune.length ? `<div class="evo-v13-rel-group"><div class="evo-v13-rel-head"><span>0x de dano</span><small>Imune a…</small></div><div class="evo-v13-chip-list">${fx.immune.map(t => typePill(t)).join('')}</div></div>` : ''}
    `);

    const repro = section('Reprodução', `
      <div class="evo-v13-gender-bar">${gender == null ? '<div class="full">Distribuição de gênero não cadastrada</div>' : typeof gender === 'string' ? `<div class="full">${safe(gender)}</div>` : `<div class="male" style="width:${pct(gender.male)}">♂ ${safe(gender.male)}%</div><div class="female" style="width:${pct(gender.female)}">♀ ${safe(gender.female)}%</div>`}</div>
      <div class="evo-v13-chip-list">${eggGroups.length ? eggGroups.map(g => chip(g)).join('') : chip('Sem grupo de ovo')}</div>
      <div class="evo-v13-mini-grid"><div class="evo-v13-mini-box"><strong>${safe(fmt(sp.hatchCycles ?? sp.eggCycles, '—'))}</strong><span>Ciclos de chocagem</span></div><div class="evo-v13-mini-box"><strong>${safe(fmt(sp.baseHappiness ?? sp.friendship, '—'))}</strong><span>Felicidade base</span></div></div>
    `);

    const locale = section('Localizações', envs.length ? `<div class="evo-v13-chip-list">${envs.map(v => chip(v)).join('')}</div>` : '<div class="evo-v13-empty">Localizações/ambientes ainda não cadastrados.</div>');
    const ev = sp?.evYield || {};
    const evRows = [ ['hp','PS'], ['attack','Ataque'], ['defense','Defesa'], ['spAttack','Ataque Especial'], ['spDefense','Defesa Especial'], ['speed','Velocidade'] ].filter(([key])=>Number(ev[key]) > 0);
    const training = section('Treinamento', evRows.length? `<div class="evo-v13-chip-list">${evRows.map(([key,label])=>chip('+'+ev[key]+' EV • '+label)).join('')}</div>`:'<div class="evo-v13-empty">EVs concedidos ainda não cadastrados.</div>');

    return `<div class="evo-v13-stack">${section('Informações', infoBlocks)}${abilities}${attr}${evo}${typeRows}${training}${repro}${locale}</div>`;
  }

  function movesSection(sp) {
    const moves = getMoves(sp);
    const tab = state.dexV13MoveMode || 'level';
    const list = tab === 'tm' ? moves.tm : moves.level;
    return `
      <section class="evo-v13-card">
        <div class="evo-v13-move-switch">
          <button type="button" class="${tab === 'level' ? 'is-active' : ''}" data-action="dex-v13-movemode" data-value="level">Subir de nível</button>
          <button type="button" class="${tab === 'tm' ? 'is-active' : ''}" data-action="dex-v13-movemode" data-value="tm">MT</button>
        </div>
        ${tab === 'level' ? `
          <div class="evo-v13-move-table">
            <div class="evo-v13-move-head"><span>Nível</span><span>Movimento</span><span>Poder</span><span>Prec.</span><span>CD</span></div>
            ${list.length ? list.map(m => `<article class="evo-v13-move-row"><div class="lvl">${safe(fmt(m.plus ? `${m.level} (${m.plus})` : m.level))}</div><div class="name"><strong>${safe(m.name)}</strong><div class="tags">${typePill(m.type || 'Normal')}${chip((m.category || 'Status').toUpperCase(),'move-kind')}</div></div><div>${safe(fmt(m.power))}</div><div>${safe(fmt(m.accuracy))}</div><div>${safe(fmt(m.cooldown))}</div></article>`).join('') : '<div class="evo-v13-empty">Nenhum movimento de nível cadastrado.</div>'}
          </div>` : `
          <div class="evo-v13-chip-list">${list.length ? list.map(m => `<div class="evo-v13-tm-item"><strong>${safe(m.label)}</strong><div>${typePill(m.type || 'Normal')}${m.category ? chip(m.category) : ''}</div></div>`).join('') : '<div class="evo-v13-empty">Nenhum MT cadastrado.</div>'}</div>`}
      </section>`;
  }

  function detailPage(spOverride = null, isReadOnly = false) {
    const sp = spOverride || currentSpecies();
    if (!sp) return `<section class="evo-v13-page"><div class="evo-v13-card"><p>Pokémon não encontrado.</p><button type="button" class="btn secondary full" data-action="dex-v13-back">← Voltar</button></div></section>`;
    const art = getArt(sp);
    const tab = state.dexV13Tab || 'informacoes';
    const content = tab === 'informacoes' ? infoSection(sp) : tab === 'movimentos' ? movesSection(sp) : tab === 'galeria' ? gallerySection(sp) : teamsSection(sp);
    return `<section class="evo-v13-page">
      <div class="evo-v13-detail-header">
        <button type="button" class="evo-v13-back" data-action="dex-v13-back" aria-label="Voltar">←</button>
        <div class="evo-v13-head-main"><small>#${four(sp.number)}</small><h1>${safe(sp.name)}</h1><p>${safe(sp.category || 'Pokémon')}</p></div>
        <button type="button" class="evo-v13-thumb-toggle ${state.dexV13Shiny ? 'selected' : ''}" data-action="dex-v13-shiny">${state.dexV13Shiny ? '✨' : '◌'}</button>
      </div>
      <div class="evo-v13-hero">
        <div class="evo-v13-hero-art">${art ? `<img src="${safe(art)}" alt="${safe(sp.name)}">` : '<span>◉</span>'}</div>
        <div class="evo-v13-hero-text"><div class="evo-v13-hero-no">#${four(sp.number)}</div><h2>${safe(sp.name)}</h2><div class="evo-v13-hero-cat">${safe(sp.category || 'Pokémon')}</div><div class="evo-v13-hero-icons"><span>✓</span><span>✦</span><span>•</span><span>♡</span><span>☆</span></div></div>
      </div>
      <div class="evo-v13-tabbar"><button type="button" class="${tab === 'informacoes' ? 'active' : ''}" data-action="dex-v13-tab" data-value="informacoes">Informações</button><button type="button" class="${tab === 'movimentos' ? 'active' : ''}" data-action="dex-v13-tab" data-value="movimentos">Movimentos</button><button type="button" class="${tab === 'galeria' ? 'active' : ''}" data-action="dex-v13-tab" data-value="galeria">Galeria</button><button type="button" class="${tab === 'equipes' ? 'active' : ''}" data-action="dex-v13-tab" data-value="equipes">Equipes</button></div>
      <div class="evo-v13-actions">${isReadOnly ? '' : '<button type="button" class="btn secondary" data-action="dex-v13-edit-raw">✏️ Editar ficha original</button>'}<button type="button" class="btn blue" data-action="dex-v13-back">← Lista</button></div>
      ${content}
    </section>`;
  }

  // A Pokédex dos jogadores usa esta visualização sem os controles do Mestre.
  window.EvoLinkDexV13 = { renderDetail: (sp, options = {}) => detailPage(sp, options.readOnly === true) };

  const previousRender = renderDashboard;
  renderDashboard = function() {
    const isMaster = state.user?.role === 'mestre';
    const shouldShow = isMaster && state.view === 'editar-pokemon' && !!state.editingSpeciesId && state.dexV12ListMode === false && !state.dexV13RawEdit;
    if (shouldShow) state.view = 'inicio';
    try { previousRender(); }
    finally { if (shouldShow) state.view = 'editar-pokemon'; }
    if (!shouldShow) return;
    const main = app.querySelector('.dashboard-screen');
    if (!main) return;
    const topbar = main.querySelector('.topbar');
    main.innerHTML = (topbar ? topbar.outerHTML : '') + detailPage();
    main.classList.add('evo-v13-screen');
    app.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));
    const nav = app.querySelector('.bottom-nav .nav-item[data-value="editar-pokemon"]');
    if (nav) { nav.classList.add('active'); nav.setAttribute('aria-current', 'page'); }
  };

  app.addEventListener('click', e => {
    const b = e.target.closest?.('[data-action]');
    if (!b || state.user?.role !== 'mestre') return;
    const action = b.dataset.action;
    if (!action.startsWith('dex-v13-')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (action === 'dex-v13-back') {
      state.dexV13RawEdit = false;
      state.dexV12ListMode = true;
      state.view = 'editar-pokemon';
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'dex-v13-tab') {
      state.dexV13Tab = b.dataset.value || 'informacoes';
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'dex-v13-shiny') {
      state.dexV13Shiny = !state.dexV13Shiny;
      render();
    } else if (action === 'dex-v13-edit-raw') {
      state.dexV13RawEdit = true;
      state.view = 'editar-pokemon';
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'dex-v13-movemode') {
      state.dexV13MoveMode = b.dataset.value || 'level';
      render();
    } else if (action === 'dex-v13-jump') {
      state.editingSpeciesId = b.dataset.value;
      state.dexV13Tab = 'informacoes';
      state.dexV13RawEdit = false;
      state.view = 'editar-pokemon';
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, true);

  const previousRequest = request;
  request = async function(method, path, data) {
    const result = await previousRequest(method, path, data);
    if (method === 'POST' && /\/species\/[a-f\d-]+\/update$/i.test(String(path))) {
      state.dexV13RawEdit = false;
      state.dexV13Tab = 'informacoes';
    }
    return result;
  };
})();
