'use strict';
/** EvoLink v32 — Localizações simples, sem alteração retroativa no banco de dados.
 * O editor pode selecionar múltiplos habitats; a Pokédex os apresenta por categoria.
 * As permissões Mestre/Jogador e as espécies desconhecidas permanecem inalteradas.
 */
(() => {
  const SIMPLE_LOCATIONS = Object.freeze([
    'Floresta', 'Rio', 'Lago', 'Praia', 'Mar', 'Caverna', 'Montanha',
    'Campo', 'Deserto', 'Pântano', 'Neve', 'Cidade', 'Ruínas', 'Vulcão', 'Ilha', 'Outros'
  ]);
  const normalize = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const classify = value => {
    const text = normalize(value);
    if (!text) return '';
    const exact = SIMPLE_LOCATIONS.find(v => normalize(v) === text);
    if (exact) return exact;
    const tests = [
      ['Floresta', /florest|bosqu|mata\b|matas\b|selva|jungle|forest|woodland|arvore|tree/],
      ['Rio', /\brio\b|\brios\b|riacho|ribeirao|corrego|cachoeir|river|stream|creek/],
      ['Lago', /lago|lagoa|laguna|\blake\b|pond/],
      ['Praia', /praia|litoral|costeir|beach|shore|coast/],
      ['Mar', /\bmar\b|\bmares\b|oceano|marinh|recife|coral|ocean|\bsea\b/],
      ['Caverna', /cavern|gruta|subterr|caverna|\bmina\b|\bminas\b|\bcave\b|underground/],
      ['Montanha', /montanh|serra\b|\bserras\b|cordilheira|\bpico\b|montes\b|\bmonte\b|penhasc|rochos|mountain|cliff|peak/],
      ['Campo', /\bcampo\b|\bcampos\b|pradaria|savana|planicie|pastagem|pasto|gramado|fazenda|grassland|meadow|plain|farm/],
      ['Deserto', /desert|\bduna\b|\bdunas\b|arid|areial|\bsand\b/],
      ['Pântano', /pantano|brejo|charco|mangue|lama[cç]|swamp|marsh|bog/],
      ['Neve', /neve|nevado|glacial|geleira|tundra|polar|\bgelo\b|\bsnow\b|\bice\b|frozen/],
      ['Cidade', /cidad|vilarejo|aldeia|urbano|metropol|\bvila\b|\bru(a|as)\b|\bcity\b|\btown\b|\bvillage\b/],
      ['Ruínas', /ruina|templo|castelo|abandonad|ancient|ruins|temple/],
      ['Vulcão', /vulc|magma|\blava\b|volcano/],
      ['Ilha', /\bilha\b|\bilhas\b|\bisland\b/]
    ];
    for (const [label, pattern] of tests) if (pattern.test(text)) return label;
    return 'Outros';
  };
  function simplify(value) {
    const values = [];
    const visit = v => {
      if (Array.isArray(v)) {v.forEach(visit); return;}
      if (v === undefined || v === null) return;
      if (typeof v === 'object') { if (typeof v.name === 'string') visit(v.name);return; }
      // Separa categorias cadastradas juntas: "Floresta, Rio" e "Praia e Mar".
      for (const part of String(v).split(/\s*[,;|/]\s*|\s+e\s+/i)) {
        const label = classify(part);
        if (label && !values.includes(label)) values.push(label);
      }
    };
    visit(value);
    return values;
  }
  const fields = ['environments','environment','habitats','locations','location'];
  const expose = (value, original) => Array.isArray(original) ? value : value.join(', ');
  function simplifySpecies(sp) {
    if (!sp || sp.unknown) return sp;
    for (const key of fields) {
      if (!Object.prototype.hasOwnProperty.call(sp,key) || !sp[key]) continue;
      const changed = simplify(sp[key]);
      if (changed.length) sp[key] = expose(changed, sp[key]);
    }
    return sp;
  }
  // Utilitário público apenas para verificar a taxonomia e sem expor dados de usuários.
  window.EvoLinkSimpleLocations = {options:SIMPLE_LOCATIONS.slice(), classify, simplify};
  if (typeof app === 'undefined' || typeof state === 'undefined' || typeof renderDashboard !== 'function') return;
  function htmlSafe(s) {
    return String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function simplifyPageSpecies() {
    for (const sp of state.species || []) simplifySpecies(sp);
  }
  // O app e as extensões anteriores chamam renderDashboard após carregar/salvar.
  // Não mexemos diretamente no banco: as fichas existentes são apenas exibidas com nomes curtos.
  const beforeRender = renderDashboard;
  renderDashboard = function(...args) {
    simplifyPageSpecies();
    const result = beforeRender.apply(this, args);
    if (state.user?.role === 'mestre') enhanceEditor();
    return result;
  };
  if (typeof request === 'function') {
    const beforeRequest = request;
    request = async function(method, url, data, ...rest) {
      if (method === 'POST' && /^\/api\/campaigns\/[^/]+\/species(?:\/[^/]+\/update|\/import)?$/.test(url) && data && typeof data === 'object') {
        const patchSpecies = sp => {
          const out = {...sp};
          for (const key of fields) if (Object.prototype.hasOwnProperty.call(out,key) && out[key]) {
            const changed = simplify(out[key]);
            if (changed.length) out[key] = expose(changed,out[key]);
          }
          return out;
        };
        data = url.endsWith('/import') && Array.isArray(data.species)
          ? {...data,species:data.species.map(patchSpecies)}
          : patchSpecies(data);
      }
      return beforeRequest.call(this,method,url,data,...rest);
    };
  }
  function enhanceEditor() {
    // Evolink v11/v21 pode representar localização em um input de texto ou textarea.
    // Reaproveitar o campo existente preserva a lógica de salvamento do site.
    const main = app.querySelector('.dashboard-screen');
    if (!main) return;
    const candidates = main.querySelectorAll('input[name],textarea[name]');
    for (const input of candidates) {
      if (!fields.includes(input.name) || input.type === 'hidden' || input.type === 'file' || input.closest('[data-evo32-picker]')) continue;
      if (!input.form || input.dataset.evo32Ready) continue;
      input.dataset.evo32Ready = '1';
      const chosen = simplify(input.value);
      input.value = chosen.join(', ');
      input.classList.add('evo32-original-field');
      const group = document.createElement('div');
      group.className = 'evo32-picker';
      group.dataset.evo32Picker = input.name;
      const head = document.createElement('p');
      head.textContent = 'Onde encontrar? Selecione um ou mais locais:';
      head.className = 'evo32-help';
      const chips = document.createElement('div');
      chips.className = 'evo32-options';
      for (const location of SIMPLE_LOCATIONS) {
        const label = document.createElement('label');
        label.className = 'evo32-option';
        const box = document.createElement('input');
        box.type = 'checkbox'; box.value = location; box.checked = chosen.includes(location);
        box.dataset.evo32Location = '1';
        box.setAttribute('aria-label',location);
        const caption = document.createElement('span');
        caption.textContent = location;
        label.append(box,caption);chips.append(label);
      }
      group.append(head,chips);
      input.insertAdjacentElement('afterend',group);
      const sync = () => {
        input.value = [...group.querySelectorAll('input[data-evo32-location]:checked')].map(x=>x.value).join(', ');
      };
      group.addEventListener('change',sync);
    }
  }
  // Se outro componente exibir espécies antes da primeira navegação, a próxima renderização já simplifica.
  simplifyPageSpecies();
  enhanceEditor();
})();
