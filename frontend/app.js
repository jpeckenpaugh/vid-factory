(() => {
  const app = document.querySelector('#app');
  const notice = document.querySelector('#notice');
  const state = { view: 'projects', selected: null, applications: [], companies: [] };
  const labels = { applications: 'Application', companies: 'Company', projects: 'Content Project' };

  const escape = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const api = async (path, options = {}) => {
    const response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = Array.isArray(data?.detail) ? data.detail.map(item => item.msg).join('; ') : data?.detail;
      throw new Error(detail || `Request failed (${response.status})`);
    }
    return data;
  };
  const showNotice = (message, kind = 'success') => {
    notice.innerHTML = `<div class="alert alert-${kind} alert-dismissible fade show" role="alert">${escape(message)}<button type="button" class="btn-close" data-dismiss-notice aria-label="Close"></button></div>`;
  };
  const setNav = () => document.querySelectorAll('[data-view]').forEach(link => link.classList.toggle('active', link.dataset.view === state.view));
  const optionList = (items, selectedId, placeholder) => `<option value="">${placeholder}</option>${items.map(item => `<option value="${item.id}" ${Number(selectedId) === item.id ? 'selected' : ''}>${escape(item.name)}</option>`).join('')}`;

  async function loadCatalogs() {
    [state.applications, state.companies] = await Promise.all([api('/api/applications'), api('/api/companies')]);
  }

  function catalogForm(kind, record = {}) {
    const verb = record.id ? 'Save changes' : `Add ${labels[kind].toLowerCase()}`;
    return `<form data-form="catalog" data-kind="${kind}" data-id="${record.id || ''}" class="card shadow-sm mb-4"><div class="card-body"><h2 class="h5 mb-3">${record.id ? `Edit ${labels[kind]}` : `New ${labels[kind]}`}</h2><label class="form-label" for="catalog-name">Name</label><input id="catalog-name" class="form-control" name="name" value="${escape(record.name)}" required autofocus><div class="d-flex gap-2 mt-3"><button class="btn btn-primary">${verb}</button>${record.id ? '<button class="btn btn-outline-secondary" type="button" data-action="back-list">Cancel</button>' : ''}</div></div></form>`;
  }
  function catalogList(kind, records) {
    const singular = labels[kind];
    return `<div class="d-flex justify-content-between align-items-center mb-4"><div><h1 class="h2 mb-1">${kind[0].toUpperCase() + kind.slice(1)}</h1><p class="text-body-secondary mb-0">Reference records available to content projects.</p></div><button class="btn btn-primary" data-action="new-catalog" data-kind="${kind}">Add ${singular}</button></div>${records.length ? `<div class="list-group shadow-sm">${records.map(record => `<div class="list-group-item d-flex justify-content-between align-items-center gap-3"><div><a href="#" class="fw-semibold link-body-emphasis" data-action="open-catalog" data-kind="${kind}" data-id="${record.id}">${escape(record.name)}</a><div class="small text-body-secondary">Updated ${escape(record.updated_at)}</div></div><div class="btn-group"><button class="btn btn-sm btn-outline-secondary" data-action="edit-catalog" data-kind="${kind}" data-id="${record.id}">Edit</button><button class="btn btn-sm btn-outline-danger" data-action="delete-catalog" data-kind="${kind}" data-id="${record.id}">Delete</button></div></div>`).join('')}</div>` : `<div class="empty-state bg-white rounded p-5 text-center"><p class="mb-0">No ${kind} yet. Add one to get started.</p></div>`}`;
  }
  function catalogDetail(kind, record) {
    return `<div class="d-flex justify-content-between align-items-center mb-4"><div><button class="btn btn-link p-0 mb-2" data-action="back-list">← Back to ${kind}</button><h1 class="h2 mb-0">${escape(record.name)}</h1></div><div class="btn-group"><button class="btn btn-outline-secondary" data-action="edit-catalog" data-kind="${kind}" data-id="${record.id}">Edit</button><button class="btn btn-outline-danger" data-action="delete-catalog" data-kind="${kind}" data-id="${record.id}">Delete</button></div></div><dl class="row card shadow-sm p-3"><dt class="col-sm-3">Created</dt><dd class="col-sm-9">${escape(record.created_at)}</dd><dt class="col-sm-3">Last updated</dt><dd class="col-sm-9 mb-0">${escape(record.updated_at)}</dd></dl>`;
  }
  function projectForm(project = {}) {
    return `<form data-form="project" data-id="${project.id || ''}" class="card shadow-sm mb-4"><div class="card-body"><h2 class="h5 mb-3">${project.id ? 'Edit content project' : 'New content project'}</h2><div class="mb-3"><label class="form-label" for="project-title">Title</label><input id="project-title" class="form-control" name="title" value="${escape(project.title)}" required autofocus></div><div class="mb-3"><label class="form-label" for="project-description">Description <span class="text-body-secondary">(optional)</span></label><textarea id="project-description" class="form-control" name="description" rows="3">${escape(project.description)}</textarea></div><div class="row"><div class="col-md-6 mb-3"><label class="form-label" for="project-application">Application <span class="text-body-secondary">(optional)</span></label><select id="project-application" class="form-select" name="application_id">${optionList(state.applications, project.application_id, 'No application')}</select></div><div class="col-md-6 mb-3"><label class="form-label" for="project-company">Company <span class="text-body-secondary">(optional)</span></label><select id="project-company" class="form-select" name="company_id">${optionList(state.companies, project.company_id, 'No company')}</select></div></div><div class="d-flex gap-2"><button class="btn btn-primary">${project.id ? 'Save changes' : 'Create project'}</button><button class="btn btn-outline-secondary" type="button" data-action="back-list">Cancel</button></div></div></form>`;
  }
  function projectList(records) {
    return `<div class="d-flex justify-content-between align-items-center mb-4"><div><h1 class="h2 mb-1">Content Projects</h1><p class="text-body-secondary mb-0">Capture ideas and retain one draft script or prompt per project.</p></div><button class="btn btn-primary" data-action="new-project">Add project</button></div>${records.length ? `<div class="row g-3">${records.map(project => `<div class="col-md-6"><article class="card record-card shadow-sm h-100"><div class="card-body d-flex flex-column"><h2 class="h5"><a class="link-body-emphasis" href="#" data-action="open-project" data-id="${project.id}">${escape(project.title)}</a></h2>${project.description ? `<p class="text-body-secondary">${escape(project.description)}</p>` : ''}<p class="small mb-3">${project.application_name ? `<span class="badge text-bg-light border me-1">${escape(project.application_name)}</span>` : ''}${project.company_name ? `<span class="badge text-bg-light border">${escape(project.company_name)}</span>` : ''}</p><div class="mt-auto d-flex justify-content-between align-items-center"><span class="small text-body-secondary">${project.draft ? 'Draft saved' : 'No draft yet'}</span><button class="btn btn-sm btn-outline-primary" data-action="open-project" data-id="${project.id}">Open</button></div></div></article></div>`).join('')}</div>` : `<div class="empty-state bg-white rounded p-5 text-center"><p class="mb-3">No content projects yet.</p><button class="btn btn-primary" data-action="new-project">Create your first project</button></div>`}`;
  }
  function projectDetail(project) {
    const draft = project.draft || {};
    return `<div class="d-flex justify-content-between align-items-center mb-4"><div><button class="btn btn-link p-0 mb-2" data-action="back-list">← Back to projects</button><h1 class="h2 mb-0">${escape(project.title)}</h1></div><div class="btn-group"><button class="btn btn-outline-secondary" data-action="edit-project" data-id="${project.id}">Edit</button><button class="btn btn-outline-danger" data-action="delete-project" data-id="${project.id}">Delete</button></div></div><section class="card shadow-sm mb-4"><div class="card-body"><h2 class="h5">Project details</h2><p>${escape(project.description || 'No description provided.')}</p><dl class="row mb-0"><dt class="col-sm-3">Application</dt><dd class="col-sm-9">${escape(project.application_name || 'None')}</dd><dt class="col-sm-3">Company</dt><dd class="col-sm-9 mb-0">${escape(project.company_name || 'None')}</dd></dl></div></section><section class="card shadow-sm"><div class="card-body"><h2 class="h5">Draft ${project.draft ? `<span class="badge text-bg-secondary text-uppercase">${escape(draft.draft_type)}</span>` : ''}</h2>${project.draft ? `<p class="draft-body border rounded bg-body-tertiary p-3">${escape(draft.body)}</p>` : '<p class="text-body-secondary">No draft saved yet.</p>'}<form data-form="draft" data-id="${project.id}"><div class="mb-3"><label class="form-label" for="draft-type">Draft type</label><select id="draft-type" class="form-select" name="draft_type"><option value="script" ${draft.draft_type === 'script' ? 'selected' : ''}>Script</option><option value="prompt" ${draft.draft_type === 'prompt' ? 'selected' : ''}>Prompt</option></select></div><div class="mb-3"><label class="form-label" for="draft-body">Draft text</label><textarea id="draft-body" class="form-control" name="body" rows="8" required>${escape(draft.body)}</textarea></div><button class="btn btn-primary">${project.draft ? 'Save draft changes' : 'Save draft'}</button></form></div></section>`;
  }
  async function render() {
    setNav(); app.innerHTML = '<div class="text-body-secondary">Loading…</div>';
    try {
      if (state.view === 'catalog-form') return void (app.innerHTML = catalogForm(state.kind, state.record));
      if (state.view === 'project-form') { await loadCatalogs(); return void (app.innerHTML = projectForm(state.record)); }
      if (state.view === 'catalog-detail') { state.record = await api(`/api/${state.kind}/${state.selected}`); return void (app.innerHTML = catalogDetail(state.kind, state.record)); }
      if (state.view === 'project-detail') { state.record = await api(`/api/projects/${state.selected}`); return void (app.innerHTML = projectDetail(state.record)); }
      if (state.view === 'projects') {
        const projects = await api('/api/projects');
        const details = await Promise.all(projects.map(project => api(`/api/projects/${project.id}`)));
        return void (app.innerHTML = projectList(details));
      }
      app.innerHTML = catalogList(state.view, await api(`/api/${state.view}`));
    } catch (error) { app.innerHTML = `<div class="alert alert-danger">${escape(error.message)}</div>`; }
  }
  function go(view, options = {}) { Object.assign(state, { view, selected: null, record: null }, options); render(); }
  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-action], [data-view], [data-dismiss-notice]'); if (!target) return;
    event.preventDefault();
    if (target.dataset.dismissNotice !== undefined) return void (notice.innerHTML = '');
    if (target.dataset.view) return go(target.dataset.view);
    const { action, id, kind } = target.dataset;
    if (action === 'back-list') return go(['project-form', 'project-detail'].includes(state.view) ? 'projects' : state.kind);
    if (action === 'new-catalog') return go('catalog-form', { kind });
    if (action === 'open-catalog') return go('catalog-detail', { kind, selected: id });
    if (action === 'edit-catalog') { const record = await api(`/api/${kind}/${id}`); return go('catalog-form', { kind, record }); }
    if (action === 'delete-catalog' && confirm(`Delete this ${labels[kind].toLowerCase()}?`)) { try { await api(`/api/${kind}/${id}`, { method: 'DELETE' }); showNotice(`${labels[kind]} deleted.`); go(kind); } catch (error) { showNotice(error.message, 'danger'); } return; }
    if (action === 'new-project') return go('project-form');
    if (action === 'open-project') return go('project-detail', { selected: id });
    if (action === 'edit-project') { const record = await api(`/api/projects/${id}`); return go('project-form', { record }); }
    if (action === 'delete-project' && confirm('Delete this content project and its draft?')) { try { await api(`/api/projects/${id}`, { method: 'DELETE' }); showNotice('Content project deleted.'); go('projects'); } catch (error) { showNotice(error.message, 'danger'); } }
  });
  document.addEventListener('submit', async event => {
    const form = event.target; if (!form.matches('[data-form]')) return; event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      if (form.dataset.form === 'catalog') { const kind = form.dataset.kind; const id = form.dataset.id; await api(`/api/${kind}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify({ name: values.name }) }); showNotice(`${labels[kind]} ${id ? 'updated' : 'created'}.`); return go(kind); }
      if (form.dataset.form === 'project') { const id = form.dataset.id; const payload = { title: values.title, description: values.description, application_id: values.application_id ? Number(values.application_id) : null, company_id: values.company_id ? Number(values.company_id) : null }; const project = await api(`/api/projects${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); showNotice(`Content project ${id ? 'updated' : 'created'}.`); return go('project-detail', { selected: project.id }); }
      const draft = await api(`/api/projects/${form.dataset.id}/draft`, { method: 'PUT', body: JSON.stringify(values) }); showNotice(`${draft.draft_type === 'script' ? 'Script' : 'Prompt'} draft saved.`); go('project-detail', { selected: form.dataset.id });
    } catch (error) { showNotice(error.message, 'danger'); }
  });
  const initial = location.hash.slice(1); if (['projects', 'applications', 'companies'].includes(initial)) state.view = initial;
  render();
})();
