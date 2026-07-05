const storageKey = "balai-crm-store-v4";
const app = document.querySelector("#app");

const countries = ["Finland", "Sweden", "Norway", "Indonesia", "Malaysia", "Philippines", "Singapore", "Others"];
const services = [
  "Market Opportunity Assessment",
  "Market Entry & Partner Development",
  "SEA Market Representation",
  "Trade Fair & Event Representation",
  "Cultural & Market Localization",
  "Internationalization Consulting"
];
const dealStages = ["New lead", "Qualified", "Proposal sent", "Follow-up", "Client", "Lost"];
const priorities = ["High", "Medium", "Low"];

const navItems = [
  ["Search", "search"],
  ["Home", "home"],
  ["Contacts", "contacts"],
  ["My day", "day"],
  ["Comms", "comms"],
  ["Sales", "sales"],
  ["Marketing", "marketing"],
  ["Automation", "automation"],
  ["Reports", "reports"]
];

let store = loadStore();
const state = {
  view: "home",
  query: "",
  country: "All",
  stage: "All",
  selectedContactId: "",
  selectedCompanyId: "",
  selectedDealId: "",
  contactMode: "people",
  modal: null,
  editId: null,
  prefillService: "",
  prefillCompanyId: "",
  moreOpen: false,
  notice: ""
};

function emptyStore() {
  return {
    contacts: [],
    companies: [],
    deals: [],
    tasks: [],
    automations: [
      { id: makeId(), title: "Create reminder after new lead", active: true },
      { id: makeId(), title: "Flag high-value deals over EUR 15,000", active: true },
      { id: makeId(), title: "Warn when follow-up date is missed", active: true }
    ],
    settings: { createdAt: new Date().toISOString() }
  };
}

function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (parsed && Array.isArray(parsed.contacts) && Array.isArray(parsed.companies)) {
      return normalizeStore(parsed);
    }
  } catch {
    return emptyStore();
  }
  return emptyStore();
}

function normalizeStore(next) {
  return {
    contacts: (next.contacts || []).map((contact) => ({
      ...contact,
      country: contact.country || "Finland",
      status: contact.status || "Lead",
      priority: contact.priority || "Medium"
    })),
    companies: (next.companies || []).map((company) => ({
      ...company,
      country: company.country || "Finland",
      priority: company.priority || "Medium"
    })),
    deals: next.deals || [],
    tasks: next.tasks || [],
    automations: next.automations || emptyStore().automations,
    settings: next.settings || {}
  };
}

function persist(message = "Saved") {
  try {
    localStorage.setItem(storageKey, JSON.stringify(store));
    flash(message);
  } catch {
    flash("Storage full. Export your data now.");
  }
}

function flash(message) {
  state.notice = message;
  render();
  setTimeout(() => {
    if (state.notice === message) {
      state.notice = "";
      render();
    }
  }, 1800);
}

function totals() {
  const pipeline = store.deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const openDeals = store.deals.filter((deal) => !["Client", "Lost"].includes(deal.stage)).length;
  const overdueTasks = store.tasks.filter((task) => task.dueDate && task.dueDate < today() && !task.done).length;
  return {
    pipeline,
    openDeals,
    overdueTasks,
    contacts: store.contacts.length,
    companies: store.companies.length
  };
}

function selectedContact() {
  return store.contacts.find((contact) => contact.id === state.selectedContactId) || store.contacts[0] || null;
}

function selectedCompany() {
  return store.companies.find((company) => company.id === state.selectedCompanyId) || store.companies[0] || null;
}

function selectedDeal() {
  return store.deals.find((deal) => deal.id === state.selectedDealId) || null;
}

function filteredContacts() {
  const query = state.query.trim().toLowerCase();
  return store.contacts.filter((contact) => {
    const company = companyName(contact.companyId);
    const haystack = [
      contact.firstName,
      contact.lastName,
      contact.email,
      contact.phone,
      contact.country,
      contact.role,
      contact.priority,
      company,
      contact.notes
    ]
      .join(" ")
      .toLowerCase();
    const countryMatch = state.country === "All" || contact.country === state.country;
    return countryMatch && haystack.includes(query);
  });
}

function filteredCompanies() {
  const query = state.query.trim().toLowerCase();
  return store.companies.filter((company) => {
    const haystack = [company.name, company.country, company.segment, company.priority, company.website, company.notes]
      .join(" ")
      .toLowerCase();
    const countryMatch = state.country === "All" || company.country === state.country;
    return countryMatch && haystack.includes(query);
  });
}

function filteredDeals() {
  const query = state.query.trim().toLowerCase();
  return store.deals.filter((deal) => {
    const haystack = [
      deal.title,
      deal.country,
      deal.service,
      deal.stage,
      companyName(deal.companyId),
      contactName(deal.contactId),
      deal.notes
    ]
      .join(" ")
      .toLowerCase();
    const countryMatch = state.country === "All" || deal.country === state.country;
    const stageMatch = state.stage === "All" || deal.stage === state.stage;
    return countryMatch && stageMatch && haystack.includes(query);
  });
}

function render() {
  app.innerHTML = `
    <main class="crm-shell workspace-shell" aria-label="BALAI Customer Relationship Management">
      ${renderSidebar()}
      <section class="workspace-page">${renderView()}</section>
      ${renderModal()}
      <input id="pictureInput" class="hidden-input" type="file" accept="image/*" />
      <input id="importInput" class="hidden-input" type="file" accept="application/json,.json" />
      ${state.notice ? `<div class="toast">${state.notice}</div>` : ""}
    </main>
  `;
  bindEvents();
}

function renderSidebar() {
  return `
    <aside class="sidebar" aria-label="Main navigation">
      <button class="brand-mark logo-mark" type="button" data-action="nav" data-view="home" title="BALAI CRM">
        <img src="./assets/balai-logo.png" alt="BALAI" />
      </button>
      <button class="quick-add" aria-label="Add contact" data-action="open-modal" data-modal="contact">+</button>
      <nav class="nav-list">
        ${navItems
          .map(
            ([label, key]) => `
              <button class="nav-item ${state.view === key ? "active" : ""}" type="button" data-action="nav" data-view="${key}">
                ${navIcon(key)}
                <span>${label}</span>
              </button>
            `
          )
          .join("")}
      </nav>
      <button class="help-button" type="button" data-action="help" aria-label="Help">?</button>
      <div class="user-avatar">AM</div>
    </aside>
  `;
}

function renderView() {
  const views = {
    home: renderHome,
    search: renderSearch,
    contacts: renderContacts,
    day: renderDay,
    comms: renderComms,
    sales: renderSales,
    marketing: renderMarketing,
    automation: renderAutomation,
    reports: renderReports
  };
  return (views[state.view] || renderHome)();
}

function header(title, subtitle, actions = "") {
  return `
    <header class="workspace-header">
      <div>
        <p class="eyebrow">BALAI CRM</p>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="workspace-actions">
        ${actions}
        <button type="button" data-action="export">${navIcon("download")} Export</button>
        <button type="button" data-action="import">${navIcon("upload")} Import</button>
      </div>
    </header>
  `;
}

function renderHome() {
  const t = totals();
  return `
    ${header(
      "Welcome to BALAI",
      "Your relationship map for companies, people, deals, and follow-ups.",
      `<button type="button" data-action="open-modal" data-modal="company">${navIcon("plus")} Add company</button>
       <button type="button" data-action="open-modal" data-modal="deal">${navIcon("sales")} Add deal</button>`
    )}
    <section class="home-system-layout">
      <article class="relationship-system">
        <div class="orbit-ring orbit-high"></div>
        <div class="orbit-ring orbit-medium"></div>
        <div class="orbit-ring orbit-low"></div>
        <div class="system-core">
          <img src="./assets/balai-logo.png" alt="BALAI" />
          <span>BALAI CRM</span>
          <strong>Relationship Center</strong>
        </div>
        ${store.companies.length ? companyPlanets() : `<div class="empty-orbit">${emptyHint("Add companies to build your relationship system.")}<button type="button" data-action="open-modal" data-modal="company">Add company</button></div>`}
      </article>
      <aside class="system-summary">
        ${metric("Companies", t.companies, "Company profiles")}
        ${metric("People", t.contacts, "Linked contacts")}
        ${metric("Open deals", t.openDeals, "Active opportunities")}
        ${metric("Pipeline", formatMoney(t.pipeline), "Total deal value")}
        <article class="workspace-card">
          <div class="card-heading">
            <h2>Data Safety</h2>
            <button type="button" data-action="export">Backup now</button>
          </div>
          <p class="insight-line">Your records stay saved in this browser after every edit.</p>
          <p class="insight-line">Use Export regularly so important contacts are not trapped on one device.</p>
        </article>
      </aside>
    </section>
  `;
}

function companyPlanets() {
  const companies = [...store.companies]
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.name.localeCompare(b.name))
    .slice(0, 14);
  return companies.map((company, index) => companyPlanet(company, index, companies.length)).join("");
}

function companyPlanet(company, index, total) {
  const radius = companyOrbitRadius(company.priority);
  const angle = total === 1 ? -90 : -90 + (index * 360) / total;
  const size = companyPlanetSize(company.priority);
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;
  const contacts = store.contacts.filter((contact) => contact.companyId === company.id).length;
  return `
    <button
      class="company-planet ${priorityClass(company.priority)}"
      type="button"
      data-action="open-company"
      data-id="${company.id}"
      style="--planet-x:${x}px; --planet-y:${y}px; --planet-size:${size}px;"
      title="${escapeHtml(company.name)}"
    >
      <span>${companyInitials(company)}</span>
      <strong>${escapeHtml(company.name || "Unnamed company")}</strong>
      <small>${company.priority || "Medium"} / ${contacts} people</small>
    </button>
  `;
}

function renderSearch() {
  const results = [...filteredCompanies(), ...filteredContacts(), ...filteredDeals()];
  return `
    ${header("Search", "Search across companies, contacts, deals, markets, and notes.")}
    ${searchControls()}
    <section class="workspace-grid search-results">
      ${
        results.length
          ? results.map(renderSearchItem).join("")
          : emptyCard("No results yet", "Add companies, contacts, or deals to make search useful.")
      }
    </section>
  `;
}

function renderContacts() {
  const contact = selectedContact();
  const company = selectedCompany();
  const isCompanies = state.contactMode === "companies";
  return `
    ${header(
      "Contacts",
      "Switch between people and company profiles.",
      `<button type="button" data-action="open-modal" data-modal="company">${navIcon("home")} Add company</button>
       <button type="button" data-action="open-modal" data-modal="contact">${navIcon("plus")} Add contact</button>`
    )}
    <section class="contacts-layout">
      <aside class="people-panel crm-panel">
        <header class="panel-header compact">
          <div><p class="eyebrow">${isCompanies ? "Companies" : "People"}</p><h1>Contacts</h1></div>
          <button title="${isCompanies ? "Add company" : "Add contact"}" type="button" data-action="open-modal" data-modal="${isCompanies ? "company" : "contact"}">${navIcon("plus")}</button>
        </header>
        <div class="contact-tabs">
          <button class="${state.contactMode === "people" ? "active" : ""}" type="button" data-action="set-contact-mode" data-mode="people">People</button>
          <button class="${state.contactMode === "companies" ? "active" : ""}" type="button" data-action="set-contact-mode" data-mode="companies">Companies</button>
        </div>
        ${inlineSearch(isCompanies ? "Search companies" : "Search people")}
        <div class="market-filter">${countryButtons()}</div>
        <div class="contact-list">
          ${
            isCompanies
              ? filteredCompanies().length
                ? filteredCompanies().map(companyRow).join("")
                : emptyHint("No companies yet. Add your first company profile.")
              : filteredContacts().length
                ? filteredContacts().map(contactRow).join("")
                : emptyHint("No people yet. Add your first real contact.")
          }
        </div>
      </aside>
      <section class="contact-stage crm-panel">
        ${isCompanies ? company ? companyDetail(company) : emptyCompanyStage() : contact ? contactDetail(contact) : emptyContactStage()}
      </section>
      <aside class="info-panel crm-panel">
        ${isCompanies ? company ? companyInfoPanel(company) : emptySideInfo("Company info") : contact ? infoPanel(contact) : emptySideInfo("Contact info")}
      </aside>
    </section>
  `;
}

function renderDay() {
  const tasks = [...store.tasks].sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  return `
    ${header(
      "My Day",
      "Follow-ups and reminders so no lead disappears.",
      `<button type="button" data-action="open-modal" data-modal="task">${navIcon("plus")} Add task</button>`
    )}
    <section class="workspace-grid two-column">
      <article class="workspace-card">
        <div class="card-heading"><h2>Tasks</h2><button type="button" data-action="open-modal" data-modal="task">Add</button></div>
        ${tasks.length ? tasks.map(taskRow).join("") : emptyHint("No reminders yet. Add follow-up dates for real CRM discipline.")}
      </article>
      <article class="workspace-card">
        <h2>Follow-up Rules</h2>
        <p class="insight-line">Every deal should have a next follow-up date.</p>
        <p class="insight-line">High priority leads should never sit untouched for a week.</p>
        <p class="insight-line">Export your data after major updates.</p>
      </article>
    </section>
  `;
}

function renderComms() {
  return `
    ${header("Comms", "A simple communication hub for call, email, and WhatsApp notes.")}
    <section class="workspace-grid two-column">
      <article class="workspace-card">
        <div class="card-heading"><h2>Contact List</h2><button type="button" data-action="nav" data-view="contacts">Open contacts</button></div>
        ${store.contacts.length ? store.contacts.map(contactMini).join("") : emptyHint("No contacts to message yet.")}
      </article>
      <article class="workspace-card">
        <h2>Message Notes</h2>
        <p class="insight-line">Use contact notes for now. Dedicated message history can be added next.</p>
      </article>
    </section>
  `;
}

function renderSales() {
  return `
    ${header(
      "Sales",
      "Pipeline stages for market-entry and representation work.",
      `<button type="button" data-action="open-modal" data-modal="deal">${navIcon("plus")} Add deal</button>`
    )}
    ${dealFilters()}
    <section class="pipeline-board">
      ${dealStages
        .map(
          (stage) => `
            <article class="workspace-card pipeline-column">
              <div class="card-heading">
                <h2>${stage}</h2>
                <span>${formatMoney(sumDeals(stage))}</span>
              </div>
              ${filteredDeals().filter((deal) => deal.stage === stage).length ? filteredDeals().filter((deal) => deal.stage === stage).map(dealCard).join("") : emptyHint("No deals")}
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderMarketing() {
  return `
    ${header("Marketing", "BALAI service offers and market positioning.")}
    <section class="workspace-grid three-column">
      ${services
        .map(
          (service) => `
            <article class="workspace-card campaign-card">
              <span class="priority-pill medium">Service</span>
              <h2>${service}</h2>
              <p>Create deals around this offer, attach companies, and track follow-up.</p>
              <button type="button" data-action="open-modal" data-modal="deal" data-service="${service}">Create deal</button>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderAutomation() {
  return `
    ${header("Automation", "Local helper rules for reminders and data hygiene.")}
    <section class="workspace-card">
      ${store.automations
        .map(
          (rule) => `
            <div class="automation-row">
              <span><strong>${rule.title}</strong><small>${rule.active ? "Active" : "Paused"}</small></span>
              <button class="toggle ${rule.active ? "on" : ""}" type="button" data-action="toggle-automation" data-id="${rule.id}"><i></i></button>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function renderReports() {
  const t = totals();
  return `
    ${header("Reports", "Exportable business overview for BALAI CRM.")}
    <section class="workspace-grid metrics-grid">
      ${metric("Companies", t.companies, "Total")}
      ${metric("Contacts", t.contacts, "Total")}
      ${metric("Deals", store.deals.length, "Total")}
      ${metric("Pipeline", formatMoney(t.pipeline), "Total")}
    </section>
    <section class="workspace-grid two-column">
      <article class="workspace-card">
        <h2>Country Breakdown</h2>
        ${countries.map(countryBar).join("")}
      </article>
      <article class="workspace-card">
        <h2>Backup</h2>
        <p>Your browser is the working database. Export often.</p>
        <button type="button" data-action="export">Export JSON backup</button>
      </article>
    </section>
  `;
}

function contactDetail(contact) {
  return `
    <header class="stage-toolbar"><div class="segmented">${["Lead", "Client"].map((status) => `<button class="${contact.status === status ? "active" : ""}" type="button" data-action="set-contact-status" data-status="${status}">${status}<span class="${status.toLowerCase()}-dot"></span></button>`).join("")}</div></header>
    <section class="hero-contact">
      ${avatar(contact, "profile-photo")}
      <p class="account-label">${contact.country || "No country"} / ${companyName(contact.companyId) || "No company"}</p>
      <h2>${contactName(contact.id)}</h2>
      <p>${contact.email || "No email yet"}</p>
      <div class="deal-strip">
        <span>${contact.priority || "Medium"} priority</span>
        <span>${contact.role || "No role yet"}</span>
      </div>
      <div class="action-row">
        ${["Call", "Text", "Email", "Tag", "Note"].map((action) => `<button class="action-button" type="button" data-action="contact-action" data-label="${action}"><span>${actionIcon(action)}</span>${action}</button>`).join("")}
        <div class="more-wrap">
          <button class="action-button" type="button" data-action="toggle-more"><span>${actionIcon("More")}</span>More</button>
          ${state.moreOpen ? `<div class="more-menu"><button type="button" data-action="edit-contact">Edit</button><button type="button" data-action="add-picture">Add picture</button><button type="button" data-action="delete-contact">Delete</button></div>` : ""}
        </div>
      </div>
    </section>
    <section class="activity">
      <article class="activity-card next-step-card"><div><h4>Next follow-up</h4><p>${contact.followUpDate || "No date set"}</p><button type="button" data-action="open-modal" data-modal="task">Create reminder</button></div><span class="card-icon">${navIcon("task")}</span></article>
      <article class="activity-card"><div><h4>Notes</h4><p>${contact.notes || "No notes yet"}</p></div><span class="card-icon">${navIcon("message")}</span></article>
    </section>
  `;
}

function companyDetail(company) {
  const people = store.contacts.filter((contact) => contact.companyId === company.id);
  const deals = store.deals.filter((deal) => deal.companyId === company.id);
  const pipeline = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  return `
    <header class="stage-toolbar">
      <div class="segmented">${priorities.map((priority) => `<button class="${company.priority === priority ? "active" : ""}" type="button" data-action="set-company-priority" data-priority="${priority}">${priority}<span class="${priority.toLowerCase()}-dot"></span></button>`).join("")}</div>
    </header>
    <section class="hero-contact company-hero">
      <span class="profile-photo company-photo">${companyInitials(company)}</span>
      <p class="account-label">${company.country || "No country"} / ${company.segment || "Company"}</p>
      <h2>${escapeHtml(company.name || "Unnamed company")}</h2>
      <p>${company.website || "No website yet"}</p>
      <div class="deal-strip">
        <span>${company.priority || "Medium"} priority</span>
        <span>${people.length} people</span>
        <span>${deals.length} deals</span>
        <span>${formatMoney(pipeline)}</span>
      </div>
      <div class="action-row">
        <button class="action-button" type="button" data-action="edit-selected-company"><span>${navIcon("home")}</span>Edit</button>
        <button class="action-button" type="button" data-action="open-modal" data-modal="contact" data-company-id="${company.id}"><span>${navIcon("contacts")}</span>Add person</button>
        <button class="action-button" type="button" data-action="open-modal" data-modal="deal" data-company-id="${company.id}"><span>${navIcon("sales")}</span>Add deal</button>
        <button class="action-button" type="button" data-action="delete-company"><span>${actionIcon("More")}</span>Delete</button>
      </div>
    </section>
    <section class="activity">
      <article class="activity-card next-step-card"><div><h4>Company notes</h4><p>${company.notes || "No notes yet"}</p><button type="button" data-action="edit-selected-company">Edit company profile</button></div><span class="card-icon">${navIcon("task")}</span></article>
      <article class="activity-card company-linked-card"><div><h4>Linked people</h4>${people.length ? people.map((contact) => `<button class="link-row" type="button" data-action="open-contact" data-id="${contact.id}">${contactName(contact.id)}<small>${contact.role || contact.email || "No role yet"}</small></button>`).join("") : `<p>No people linked yet.</p>`}</div><span class="card-icon">${navIcon("contacts")}</span></article>
      <article class="activity-card company-linked-card"><div><h4>Linked deals</h4>${deals.length ? deals.map((deal) => `<button class="link-row" type="button" data-action="edit-deal" data-id="${deal.id}">${escapeHtml(deal.title)}<small>${deal.stage} / ${formatMoney(deal.value)}</small></button>`).join("") : `<p>No deals linked yet.</p>`}</div><span class="card-icon">${navIcon("sales")}</span></article>
    </section>
  `;
}

function infoPanel(contact) {
  return `
    <header class="info-header"><span>${navIcon("info")}</span><div><h2>Contact info</h2><p>${contactName(contact.id)}</p></div></header>
    ${infoSection("General", [["First Name", contact.firstName], ["Last Name", contact.lastName], ["Company", companyName(contact.companyId) || "Not linked"], ["Country", contact.country], ["Status", contact.status]])}
    ${infoSection("Details", [["Role", contact.role || "-"], ["Priority", contact.priority], ["Phone", contact.phone || "-"], ["Email", contact.email || "-"], ["Follow-up", contact.followUpDate || "-"]])}
  `;
}

function companyInfoPanel(company) {
  const people = store.contacts.filter((contact) => contact.companyId === company.id).length;
  const deals = store.deals.filter((deal) => deal.companyId === company.id).length;
  return `
    <header class="info-header"><span>${navIcon("info")}</span><div><h2>Company info</h2><p>${escapeHtml(company.name || "Unnamed company")}</p></div></header>
    ${infoSection("General", [["Company Name", company.name], ["Company Type", company.segment || "-"], ["Country", company.country], ["Priority", company.priority]])}
    ${infoSection("Relationship", [["Linked People", people], ["Linked Deals", deals], ["Website", company.website || "-"], ["Notes", company.notes || "-"]])}
  `;
}

function emptyContactStage() {
  return `<section class="empty-stage">${emptyCard("No contact selected", "Add a real contact to begin.", "contact")}</section>`;
}

function emptyCompanyStage() {
  return `<section class="empty-stage">${emptyCard("No company selected", "Add a company profile to begin.", "company")}</section>`;
}

function emptySideInfo(title = "Contact info") {
  return `<header class="info-header"><span>${navIcon("info")}</span><div><h2>${title}</h2><p>Empty</p></div></header>`;
}

function searchControls() {
  return `
    <section class="workspace-card search-page-card">
      <label class="search-box page-search">${navIcon("search")}<input id="pageSearchInput" type="search" placeholder="Search BALAI CRM" value="${escapeHtml(state.query)}" /></label>
      <div class="filter-row">${countryButtons()}</div>
    </section>
  `;
}

function dealFilters() {
  return `<section class="workspace-card search-page-card"><div class="filter-row">${countryButtons()}${["All", ...dealStages].map((stage) => `<button class="${state.stage === stage ? "active" : ""}" type="button" data-action="set-stage-filter" data-stage="${stage}">${stage}</button>`).join("")}</div></section>`;
}

function inlineSearch(placeholder) {
  return `<label class="search-box">${navIcon("search")}<input id="searchInput" type="search" placeholder="${placeholder}" value="${escapeHtml(state.query)}" /></label>`;
}

function countryButtons() {
  return ["All", ...countries].map((country) => `<button class="${state.country === country ? "active" : ""}" type="button" data-action="set-country" data-country="${country}">${country}</button>`).join("");
}

function contactRow(contact) {
  return `
    <button class="contact-row ${state.selectedContactId === contact.id ? "selected" : ""}" type="button" data-action="open-contact" data-id="${contact.id}">
      ${avatar(contact, "mini-avatar")}
      <span class="contact-copy"><strong>${contactName(contact.id)}</strong><small>${companyName(contact.companyId) || "No company"}</small><small>${contact.country || "No country"} / ${contact.priority}</small></span>
      <span class="row-meta"><span class="status-pill ${contact.status.toLowerCase()}">${contact.status}</span><span class="priority-pill ${contact.priority.toLowerCase()}">${contact.priority}</span></span>
    </button>
  `;
}

function companyRow(company) {
  const people = store.contacts.filter((contact) => contact.companyId === company.id).length;
  const deals = store.deals.filter((deal) => deal.companyId === company.id).length;
  return `
    <button class="contact-row company-row ${state.selectedCompanyId === company.id ? "selected" : ""}" type="button" data-action="open-company" data-id="${company.id}">
      <span class="mini-avatar company-avatar">${companyInitials(company)}</span>
      <span class="contact-copy"><strong>${escapeHtml(company.name || "Unnamed company")}</strong><small>${company.segment || "Company"} / ${company.country || "No country"}</small><small>${people} people / ${deals} deals</small></span>
      <span class="row-meta"><span class="priority-pill ${priorityClass(company.priority)}">${company.priority || "Medium"}</span></span>
    </button>
  `;
}

function contactMini(contact) {
  return `<button class="compact-contact" type="button" data-action="open-contact" data-id="${contact.id}">${avatar(contact, "tiny-avatar")}<span><strong>${contactName(contact.id)}</strong><small>${companyName(contact.companyId) || "No company"} / ${contact.country}</small></span><b>${contact.priority}</b></button>`;
}

function taskRow(task) {
  return `<button class="task-row" type="button" data-action="toggle-task" data-id="${task.id}"><span class="task-check ${task.done ? "done" : ""}"></span><span><strong>${task.title}</strong><small>${task.dueDate || "No date"} / ${contactName(task.contactId) || companyName(task.companyId) || "General"}</small></span></button>`;
}

function dealCard(deal) {
  return `<button class="pipeline-card" type="button" data-action="edit-deal" data-id="${deal.id}"><strong>${deal.title}</strong><span>${companyName(deal.companyId) || "No company"}</span><small>${deal.country} / ${deal.service}</small><b>${formatMoney(deal.value)}</b></button>`;
}

function renderSearchItem(item) {
  const type = item.stage ? "Deal" : item.companyId ? "Contact" : "Company";
  const title = type === "Deal" ? item.title : type === "Contact" ? contactName(item.id) : item.name;
  const detail = type === "Deal" ? `${item.stage} / ${formatMoney(item.value)}` : type === "Contact" ? `${companyName(item.companyId) || "No company"} / ${item.country}` : `${item.country} / ${item.segment || "Company"}`;
  const action = type === "Deal" ? "edit-deal" : type === "Contact" ? "open-contact" : "open-company";
  return `<article class="workspace-card result-card"><div class="card-heading"><div><h2>${title}</h2><p>${type}</p></div></div><p>${detail}</p><button type="button" data-action="${action}" data-id="${item.id}">Open</button></article>`;
}

function quickStart(title, text, modal) {
  return `<article class="workspace-card campaign-card"><h2>${title}</h2><p>${text}</p><button type="button" data-action="open-modal" data-modal="${modal}">Add ${title.slice(0, -1)}</button></article>`;
}

function metric(label, value, detail) {
  return `<article class="workspace-card metric-panel"><span>${label}</span><strong>${value}</strong><p>${detail}</p></article>`;
}

function emptyHint(text) {
  return `<p class="empty-state">${text}</p>`;
}

function emptyCard(title, text, modal = "") {
  return `<article class="workspace-card"><h2>${title}</h2><p>${text}</p>${modal ? `<button type="button" data-action="open-modal" data-modal="${modal}">Add ${modal}</button>` : ""}</article>`;
}

function countryBar(country) {
  const value = store.deals.filter((deal) => deal.country === country).reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const width = totals().pipeline ? Math.max(5, Math.round((value / totals().pipeline) * 100)) : 5;
  return `<div class="report-bar"><span>${country}</span><div><i style="width:${width}%"></i></div><strong>${formatMoney(value)}</strong></div>`;
}

function renderModal() {
  if (!state.modal) return "";
  const modalMap = { contact: contactForm, company: companyForm, deal: dealForm, task: taskForm };
  return `<div class="modal-backdrop" role="dialog" aria-modal="true">${(modalMap[state.modal] || contactForm)()}</div>`;
}

function contactForm() {
  const contact = state.editId ? store.contacts.find((item) => item.id === state.editId) : {};
  return formShell(state.editId ? "Edit contact" : "Add contact", "contactForm", `
    ${input("firstName", "First name", contact.firstName)}
    ${input("lastName", "Last name", contact.lastName)}
    ${select("companyId", "Company", contact.companyId || state.prefillCompanyId, [["", "No company"], ...store.companies.map((company) => [company.id, company.name])])}
    ${input("role", "Role", contact.role)}
    ${input("email", "Email", contact.email)}
    ${input("phone", "Phone", contact.phone)}
    ${select("country", "Country", contact.country, countries)}
    ${select("status", "Status", contact.status, ["Lead", "Client"])}
    ${select("priority", "Priority", contact.priority, priorities)}
    ${input("followUpDate", "Follow-up date", contact.followUpDate, "date")}
    ${textarea("notes", "Notes", contact.notes)}
  `);
}

function companyForm() {
  const company = state.editId ? store.companies.find((item) => item.id === state.editId) : {};
  return formShell(state.editId ? "Edit company" : "Add company", "companyForm", `
    ${input("name", "Company name", company.name)}
    ${select("country", "Country", company.country, countries)}
    ${input("segment", "Company type", company.segment)}
    ${select("priority", "Priority", company.priority, priorities)}
    ${input("website", "Website", company.website)}
    ${textarea("notes", "Notes", company.notes)}
  `);
}

function dealForm() {
  const deal = state.editId ? store.deals.find((item) => item.id === state.editId) : {};
  return formShell(state.editId ? "Edit deal" : "Add deal", "dealForm", `
    ${input("title", "Deal title", deal.title)}
    ${select("companyId", "Company", deal.companyId || state.prefillCompanyId, [["", "No company"], ...store.companies.map((company) => [company.id, company.name])])}
    ${select("contactId", "Contact", deal.contactId, [["", "No contact"], ...store.contacts.map((contact) => [contact.id, contactName(contact.id)])])}
    ${select("country", "Country", deal.country, countries)}
    ${select("service", "Service", deal.service || state.prefillService, services)}
    ${select("stage", "Stage", deal.stage, dealStages)}
    ${input("value", "Value EUR", deal.value, "number")}
    ${input("followUpDate", "Follow-up date", deal.followUpDate, "date")}
    ${textarea("notes", "Notes", deal.notes)}
  `);
}

function taskForm() {
  const task = state.editId ? store.tasks.find((item) => item.id === state.editId) : {};
  return formShell(state.editId ? "Edit task" : "Add task", "taskForm", `
    ${input("title", "Task", task.title)}
    ${select("contactId", "Contact", task.contactId, [["", "No contact"], ...store.contacts.map((contact) => [contact.id, contactName(contact.id)])])}
    ${select("companyId", "Company", task.companyId, [["", "No company"], ...store.companies.map((company) => [company.id, company.name])])}
    ${input("dueDate", "Due date", task.dueDate, "date")}
  `);
}

function formShell(title, id, fields) {
  return `<form class="edit-modal" id="${id}"><header><div><p class="eyebrow">BALAI CRM</p><h2>${title}</h2></div><button type="button" data-action="close-modal">x</button></header><div class="form-grid">${fields}</div><footer><button type="button" data-action="close-modal">Cancel</button><button type="submit">Save</button></footer></form>`;
}

function input(name, label, value = "", type = "text") {
  return `<label><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value || "")}" /></label>`;
}

function textarea(name, label, value = "") {
  return `<label class="wide"><span>${label}</span><textarea name="${name}">${escapeHtml(value || "")}</textarea></label>`;
}

function select(name, label, value = "", options = []) {
  return `<label><span>${label}</span><select name="${name}">${options.map((option) => {
    const pair = Array.isArray(option) ? option : [option, option];
    return `<option value="${escapeHtml(pair[0])}" ${pair[0] === value ? "selected" : ""}>${pair[1]}</option>`;
  }).join("")}</select></label>`;
}

function bindEvents() {
  document.querySelectorAll("[data-action]").forEach((element) => element.addEventListener("click", handleAction));
  document.querySelectorAll("#searchInput,#pageSearchInput").forEach((inputEl) => {
    inputEl.addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });
  });
  document.querySelector("#contactForm")?.addEventListener("submit", saveContact);
  document.querySelector("#companyForm")?.addEventListener("submit", saveCompany);
  document.querySelector("#dealForm")?.addEventListener("submit", saveDeal);
  document.querySelector("#taskForm")?.addEventListener("submit", saveTask);
  document.querySelector("#pictureInput")?.addEventListener("change", savePicture);
  document.querySelector("#importInput")?.addEventListener("change", importData);
}

function handleAction(event) {
  const el = event.currentTarget;
  const action = el.dataset.action;
  if (action === "nav") {
    state.view = el.dataset.view;
    state.moreOpen = false;
    render();
  } else if (action === "open-modal") {
    state.modal = el.dataset.modal;
    state.editId = null;
    state.prefillService = el.dataset.service || "";
    state.prefillCompanyId = el.dataset.companyId || "";
    render();
  } else if (action === "close-modal") {
    state.modal = null;
    state.editId = null;
    state.prefillService = "";
    state.prefillCompanyId = "";
    render();
  } else if (action === "set-country") {
    state.country = el.dataset.country;
    render();
  } else if (action === "set-stage-filter") {
    state.stage = el.dataset.stage;
    render();
  } else if (action === "set-contact-mode") {
    state.contactMode = el.dataset.mode;
    state.moreOpen = false;
    render();
  } else if (action === "open-contact") {
    state.selectedContactId = el.dataset.id;
    state.contactMode = "people";
    state.view = "contacts";
    render();
  } else if (action === "open-company") {
    state.selectedCompanyId = el.dataset.id;
    state.contactMode = "companies";
    state.view = "contacts";
    state.moreOpen = false;
    render();
  } else if (action === "toggle-more") {
    state.moreOpen = !state.moreOpen;
    render();
  } else if (action === "edit-contact") {
    state.modal = "contact";
    state.editId = state.selectedContactId;
    state.moreOpen = false;
    render();
  } else if (action === "delete-contact") {
    deleteContact();
  } else if (action === "add-picture") {
    state.moreOpen = false;
    render();
    setTimeout(() => document.querySelector("#pictureInput")?.click(), 0);
  } else if (action === "set-contact-status") {
    updateContact(state.selectedContactId, { status: el.dataset.status });
  } else if (action === "set-company-priority") {
    updateCompany(state.selectedCompanyId || selectedCompany()?.id, { priority: el.dataset.priority });
  } else if (action === "edit-company") {
    state.modal = "company";
    state.editId = el.dataset.id;
    render();
  } else if (action === "edit-selected-company") {
    state.modal = "company";
    state.editId = state.selectedCompanyId || selectedCompany()?.id || "";
    render();
  } else if (action === "delete-company") {
    deleteCompany();
  } else if (action === "edit-deal") {
    state.modal = "deal";
    state.editId = el.dataset.id;
    render();
  } else if (action === "toggle-task") {
    store.tasks = store.tasks.map((task) => task.id === el.dataset.id ? { ...task, done: !task.done } : task);
    persist("Task updated");
  } else if (action === "toggle-automation") {
    store.automations = store.automations.map((rule) => rule.id === el.dataset.id ? { ...rule, active: !rule.active } : rule);
    persist("Automation updated");
  } else if (action === "export") {
    exportData();
  } else if (action === "import") {
    document.querySelector("#importInput")?.click();
  } else if (action === "contact-action") {
    flash(`${el.dataset.label} action ready`);
  } else if (action === "help") {
    flash("Start with Companies, then Contacts, then Deals.");
  }
}

function saveContact(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const existing = store.contacts.find((item) => item.id === state.editId);
  const next = {
    ...(existing || {}),
    id: existing?.id || makeId(),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    companyId: data.companyId,
    role: data.role.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    country: data.country,
    status: data.status || "Lead",
    priority: data.priority || "Medium",
    followUpDate: data.followUpDate,
    notes: data.notes.trim(),
    image: existing?.image || "",
    color: existing?.color || randomColor()
  };
  store.contacts = existing ? store.contacts.map((item) => item.id === existing.id ? next : item) : [next, ...store.contacts];
  state.selectedContactId = next.id;
  state.contactMode = "people";
  state.view = "contacts";
  closeAndPersist("Contact saved");
}

function saveCompany(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const existing = store.companies.find((item) => item.id === state.editId);
  const next = {
    ...(existing || {}),
    id: existing?.id || makeId(),
    name: data.name.trim(),
    country: data.country,
    segment: data.segment.trim(),
    priority: data.priority || "Medium",
    website: data.website.trim(),
    notes: data.notes.trim()
  };
  store.companies = existing ? store.companies.map((item) => item.id === existing.id ? next : item) : [next, ...store.companies];
  state.selectedCompanyId = next.id;
  state.contactMode = "companies";
  state.view = "contacts";
  closeAndPersist("Company saved");
}

function saveDeal(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const existing = store.deals.find((item) => item.id === state.editId);
  const next = {
    ...(existing || {}),
    id: existing?.id || makeId(),
    title: data.title.trim(),
    companyId: data.companyId,
    contactId: data.contactId,
    country: data.country,
    service: data.service,
    stage: data.stage || "New lead",
    value: Number(data.value || 0),
    followUpDate: data.followUpDate,
    notes: data.notes.trim()
  };
  store.deals = existing ? store.deals.map((item) => item.id === existing.id ? next : item) : [next, ...store.deals];
  state.view = "sales";
  closeAndPersist("Deal saved");
}

function saveTask(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const existing = store.tasks.find((item) => item.id === state.editId);
  const next = {
    ...(existing || {}),
    id: existing?.id || makeId(),
    title: data.title.trim(),
    contactId: data.contactId,
    companyId: data.companyId,
    dueDate: data.dueDate,
    done: existing?.done || false
  };
  store.tasks = existing ? store.tasks.map((item) => item.id === existing.id ? next : item) : [next, ...store.tasks];
  state.view = "day";
  closeAndPersist("Task saved");
}

function closeAndPersist(message) {
  state.modal = null;
  state.editId = null;
  state.prefillService = "";
  state.prefillCompanyId = "";
  persist(message);
}

function savePicture(event) {
  const file = event.target.files?.[0];
  if (!file || !state.selectedContactId) return;
  const reader = new FileReader();
  reader.onload = () => updateContact(state.selectedContactId, { image: String(reader.result) }, "Picture added");
  reader.readAsDataURL(file);
}

function updateContact(id, patch, message = "Contact updated") {
  store.contacts = store.contacts.map((contact) => contact.id === id ? { ...contact, ...patch } : contact);
  persist(message);
}

function updateCompany(id, patch, message = "Company updated") {
  if (!id) return;
  store.companies = store.companies.map((company) => company.id === id ? { ...company, ...patch } : company);
  state.selectedCompanyId = id;
  persist(message);
}

function deleteContact() {
  const contact = store.contacts.find((item) => item.id === state.selectedContactId);
  if (!contact || !confirm(`Delete ${contactName(contact.id)}?`)) return;
  store.contacts = store.contacts.filter((item) => item.id !== contact.id);
  store.deals = store.deals.map((deal) => deal.contactId === contact.id ? { ...deal, contactId: "" } : deal);
  store.tasks = store.tasks.map((task) => task.contactId === contact.id ? { ...task, contactId: "" } : task);
  state.selectedContactId = store.contacts[0]?.id || "";
  state.moreOpen = false;
  persist("Contact deleted");
}

function deleteCompany() {
  const company = selectedCompany();
  if (!company || !confirm(`Delete ${company.name || "this company"}? Linked people and deals will stay, but the company link will be cleared.`)) return;
  store.companies = store.companies.filter((item) => item.id !== company.id);
  store.contacts = store.contacts.map((contact) => contact.companyId === company.id ? { ...contact, companyId: "" } : contact);
  store.deals = store.deals.map((deal) => deal.companyId === company.id ? { ...deal, companyId: "" } : deal);
  state.selectedCompanyId = store.companies[0]?.id || "";
  persist("Company deleted");
}

function exportData() {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `balai-crm-backup-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  flash("Backup exported");
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      store = normalizeStore(JSON.parse(String(reader.result)));
      persist("Backup imported");
    } catch {
      flash("Import failed");
    }
  };
  reader.readAsText(file);
}

function infoSection(title, rows) {
  return `<section class="info-section"><h3>${title}</h3>${rows.map(([label, value]) => `<dl><dt>${label}</dt><dd>${escapeHtml(value || "-")}</dd></dl>`).join("")}</section>`;
}

function avatar(contact, className) {
  if (contact.image) return `<span class="${className} avatar-image"><img src="${contact.image}" alt="${escapeHtml(contactName(contact.id))}" /></span>`;
  return `<span class="${className}" style="--avatar-color:${contact.color || "#afd0f1"}">${initials(contact)}</span>`;
}

function companyName(id) {
  return store.companies.find((company) => company.id === id)?.name || "";
}

function companyInitials(company) {
  return String(company?.name || "BA")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "BA";
}

function contactName(id) {
  const contact = store.contacts.find((item) => item.id === id);
  if (!contact) return "";
  return `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unnamed contact";
}

function priorityRank(priority = "Medium") {
  return { High: 0, Medium: 1, Low: 2 }[priority] ?? 1;
}

function priorityClass(priority = "Medium") {
  return String(priority || "Medium").toLowerCase();
}

function companyOrbitRadius(priority = "Medium") {
  return { High: 145, Medium: 215, Low: 285 }[priority] || 215;
}

function companyPlanetSize(priority = "Medium") {
  return { High: 92, Medium: 78, Low: 66 }[priority] || 78;
}

function sumDeals(stage) {
  return filteredDeals().filter((deal) => deal.stage === stage).reduce((sum, deal) => sum + Number(deal.value || 0), 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initials(contact) {
  return `${contact.firstName?.[0] || ""}${contact.lastName?.[0] || ""}`.toUpperCase() || "BA";
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function randomColor() {
  const colors = ["#f1a7b8", "#b5d7a8", "#afd0f1", "#ccbdf0", "#f1c9a7", "#d9e8b8"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function formatMoney(value) {
  return `EUR ${Number(value || 0).toLocaleString("en-US")}`;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function navIcon(key) {
  const icons = {
    search: `<svg viewBox="0 0 24 24"><path d="m21 21-4.2-4.2m2-5.3a7.3 7.3 0 1 1-14.6 0 7.3 7.3 0 0 1 14.6 0Z"/></svg>`,
    home: `<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
    contacts: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/></svg>`,
    day: `<svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="5" width="18" height="16" rx="2"/></svg>`,
    comms: `<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>`,
    sales: `<svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H15a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    marketing: `<svg viewBox="0 0 24 24"><path d="M3 11v3a2 2 0 0 0 2 2h3l8 4V5L8 9H5a2 2 0 0 0-2 2Z"/></svg>`,
    automation: `<svg viewBox="0 0 24 24"><path d="m13 2-8 12h7l-1 8 8-12h-7Z"/></svg>`,
    reports: `<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
    plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    download: `<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`,
    upload: `<svg viewBox="0 0 24 24"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></svg>`,
    task: `<svg viewBox="0 0 24 24"><path d="M9 11l2 2 4-5"/><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/></svg>`,
    message: `<svg viewBox="0 0 24 24"><path d="M21 14a4 4 0 0 1-4 4H9l-6 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>`,
    info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`
  };
  return icons[key] || icons.plus;
}

function actionIcon(action) {
  const icons = {
    Call: `<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>`,
    Text: navIcon("comms"),
    Email: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
    Tag: `<svg viewBox="0 0 24 24"><path d="M20 13 11 22 2 13V4h9l9 9Z"/><path d="M7.5 8.5h.01"/></svg>`,
    Note: navIcon("task"),
    More: `<svg viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>`
  };
  return icons[action] || navIcon("plus");
}

render();
