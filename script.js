// =============================================================
// Shared: navbar burger toggle + footer year (runs on every page)
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initFooterYear();
  initContactForm();
  initProjectsGallery();
});

function initNavbar() {
  const burger = document.querySelector(".navbar-burger");
  const menu = document.getElementById("mainNavbar");
  if (!burger || !menu) return;

  burger.addEventListener("click", () => {
    const expanded = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!expanded));
    burger.classList.toggle("is-active");
    menu.classList.toggle("is-active");
  });
}

function initFooterYear() {
  const footerYear = document.getElementById("footerYear");
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
}

// =============================================================
// About page: Contact form with PH phone RegEx validation
// =============================================================
function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const nameInput = document.getElementById("contactName");
  const emailInput = document.getElementById("contactEmail");
  const phoneInput = document.getElementById("contactPhone");
  const messageInput = document.getElementById("contactMessage");

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const phoneError = document.getElementById("phoneError");
  const messageError = document.getElementById("messageError");

  const notification = document.getElementById("formNotification");
  const notificationText = document.getElementById("formNotificationText");
  const closeNotification = document.getElementById("closeNotification");

  // Matches PH mobile numbers: 09XXXXXXXXX or +639XXXXXXXXX
  // (spaces and dashes are stripped before testing)
  const PH_PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(input, errorEl, hasError) {
    errorEl.hidden = !hasError;
    input.classList.toggle("is-danger", hasError);
    input.setAttribute("aria-invalid", String(hasError));
  }

  function validateForm() {
    let isValid = true;

    const checks = [
      [nameInput, nameError, nameInput.value.trim() !== ""],
      [emailInput, emailError, EMAIL_REGEX.test(emailInput.value.trim())],
      [phoneInput, phoneError, PH_PHONE_REGEX.test(phoneInput.value.replace(/[\s-]/g, ""))],
      [messageInput, messageError, messageInput.value.trim() !== ""],
    ];

    checks.forEach(([input, errorEl, passed]) => {
      setFieldError(input, errorEl, !passed);
      if (!passed) isValid = false;
    });

    return isValid;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    notification.hidden = true;

    if (!validateForm()) {
      const firstInvalid = form.querySelector(".is-danger");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    notificationText.textContent =
      `Thanks, ${nameInput.value.trim()}! Your message has been sent. I'll get back to you soon.`;
    notification.hidden = false;
    form.reset();

    // Clear any lingering error styling after a successful submit
    [nameInput, emailInput, phoneInput, messageInput].forEach((input) => {
      input.classList.remove("is-danger");
      input.removeAttribute("aria-invalid");
    });
  });

  if (closeNotification) {
    closeNotification.addEventListener("click", () => {
      notification.hidden = true;
    });
  }
}

// =============================================================
// Projects page: fetch from the GitHub REST API, search, sort,
// paginate, and bookmark — every card is built with DOM methods.
// =============================================================
function initProjectsGallery() {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  const GITHUB_USERNAME = "JanDexter";

  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const directionSelect = document.getElementById("directionSelect");
  const typeSelect = document.getElementById("typeSelect");
  const perPageSelect = document.getElementById("perPageSelect");
  const bookmarkedOnly = document.getElementById("bookmarkedOnly");
  const refreshBtn = document.getElementById("refreshBtn");

  const spinner = document.getElementById("loadingSpinner");
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  const emptyMessage = document.getElementById("emptyMessage");
  const resultsCount = document.getElementById("resultsCount");
  const dataSourceText = document.getElementById("dataSourceText");

  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const pageIndicator = document.getElementById("pageIndicator");

  const BOOKMARKS_KEY = "portfolio_bookmarked_repos";

  // GitHub's language colours, used for the dot on each card
  const LANGUAGE_COLORS = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
    Python: "#3572a5",
    Dart: "#00b4ab",
    Rust: "#dea584",
    Java: "#b07219",
    Kotlin: "#a97bff",
    Swift: "#f05138",
    Go: "#00add8",
    Ruby: "#701516",
    PHP: "#4f5d95",
    C: "#555555",
    "C++": "#f34b7d",
    "C#": "#178600",
    Shell: "#89e051",
    Vue: "#41b883",
  };

  let currentPage = 1;
  let currentRepos = []; // repos for the current page, as returned by the API
  let hasNextPage = false;

  // ---------- localStorage bookmarks ----------
  function getBookmarks() {
    try {
      const stored = JSON.parse(localStorage.getItem(BOOKMARKS_KEY));
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  function saveBookmarks(ids) {
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(ids));
    } catch {
      /* storage may be unavailable (private mode) — bookmarks just won't persist */
    }
  }

  function toggleBookmark(repoId) {
    const bookmarks = getBookmarks();
    const index = bookmarks.indexOf(repoId);
    if (index === -1) {
      bookmarks.push(repoId);
    } else {
      bookmarks.splice(index, 1);
    }
    saveBookmarks(bookmarks);
  }

  // ---------- small DOM helpers ----------
  function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function makeIcon(iconClass) {
    const span = document.createElement("span");
    span.className = "icon is-small";
    span.setAttribute("aria-hidden", "true");
    const i = document.createElement("i");
    i.className = iconClass;
    span.appendChild(i);
    return span;
  }

  // A chip like "★ 12". Text is set with textContent, so API data is never
  // injected into the page as markup.
  function makeChip(iconClass, label, title) {
    const chip = document.createElement("span");
    chip.className = "meta-chip";
    if (title) chip.title = title;
    chip.appendChild(makeIcon(iconClass));
    const text = document.createElement("span");
    text.textContent = label;
    chip.appendChild(text);
    return chip;
  }

  function makeLanguageChip(language) {
    const chip = document.createElement("span");
    chip.className = "meta-chip";
    const dot = document.createElement("span");
    dot.className = "lang-dot";
    if (language && LANGUAGE_COLORS[language]) {
      dot.style.backgroundColor = LANGUAGE_COLORS[language];
    }
    const text = document.createElement("span");
    text.textContent = language || "Not specified";
    chip.append(dot, text);
    return chip;
  }

  // ---------- card creation (no hardcoded gallery HTML) ----------
  function createProjectCard(repo) {
    const isBookmarked = getBookmarks().includes(repo.id);

    const card = document.createElement("article");
    card.className = "project-card";

    // Title + bookmark button
    const top = document.createElement("div");
    top.className = "project-card__top";

    const title = document.createElement("h3");
    title.className = "project-card__title";
    title.textContent = repo.name;

    const bookmarkBtn = document.createElement("button");
    bookmarkBtn.type = "button";
    bookmarkBtn.className = "bookmark-btn" + (isBookmarked ? " is-bookmarked" : "");
    bookmarkBtn.setAttribute("aria-pressed", String(isBookmarked));
    bookmarkBtn.setAttribute(
      "aria-label",
      isBookmarked ? `Remove ${repo.name} from bookmarks` : `Bookmark ${repo.name}`
    );
    bookmarkBtn.innerHTML = `<i class="fa-${isBookmarked ? "solid" : "regular"} fa-star"></i>`;
    bookmarkBtn.addEventListener("click", () => {
      toggleBookmark(repo.id);
      renderRepos(currentRepos);
    });

    top.append(title, bookmarkBtn);

    // Description
    const description = document.createElement("p");
    description.className = "project-card__desc";
    if (repo.description) {
      description.textContent = repo.description;
    } else {
      description.textContent = "No description provided.";
      description.classList.add("is-empty");
    }

    // Meta chips: language, stars, forks
    const meta = document.createElement("div");
    meta.className = "project-meta";
    meta.append(
      makeLanguageChip(repo.language),
      makeChip("fa-regular fa-star", String(repo.stargazers_count), "Stars"),
      makeChip("fa-solid fa-code-branch", String(repo.forks_count), "Forks")
    );

    // Footer: last-updated + link out
    const footer = document.createElement("div");
    footer.className = "project-card__footer";

    const updated = document.createElement("span");
    updated.className = "updated-label";
    updated.textContent = `Updated ${formatDate(repo.updated_at)}`;

    const link = document.createElement("a");
    link.href = repo.html_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "button is-small is-primary is-light";
    link.setAttribute("aria-label", `View ${repo.name} on GitHub`);
    link.appendChild(makeIcon("fa-brands fa-github"));
    const linkText = document.createElement("span");
    linkText.textContent = "View";
    link.appendChild(linkText);

    footer.append(updated, link);

    card.append(top, description, meta, footer);
    return card;
  }

  // Shimmer placeholders shown in the grid while a request is in flight
  function showSkeletons(count) {
    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const skeleton = document.createElement("div");
      skeleton.className = "skeleton-card";
      skeleton.setAttribute("aria-hidden", "true");
      ["is-title", "", "is-short"].forEach((modifier) => {
        const line = document.createElement("div");
        line.className = `skeleton-line ${modifier}`.trim();
        skeleton.appendChild(line);
      });
      fragment.appendChild(skeleton);
    }
    grid.appendChild(fragment);
  }

  // ---------- rendering + client-side partial search ----------
  function renderRepos(repos) {
    grid.innerHTML = "";

    const query = searchInput.value.trim().toLowerCase();
    const onlyBookmarked = bookmarkedOnly.checked;
    const bookmarks = getBookmarks();

    // Partial, case-insensitive match on the repository name
    const filtered = repos.filter((repo) => {
      const matchesSearch = repo.name.toLowerCase().includes(query);
      const matchesBookmark = !onlyBookmarked || bookmarks.includes(repo.id);
      return matchesSearch && matchesBookmark;
    });

    emptyMessage.hidden = filtered.length !== 0;

    const fragment = document.createDocumentFragment();
    filtered.forEach((repo) => fragment.appendChild(createProjectCard(repo)));
    grid.appendChild(fragment);

    updateResultsCount(filtered.length, repos.length);
  }

  function updateResultsCount(shown, total) {
    if (total === 0) {
      resultsCount.textContent = "No repositories to show.";
      return;
    }
    const noun = shown === 1 ? "repository" : "repositories";
    resultsCount.textContent =
      shown === total
        ? `Showing ${total} ${noun} on page ${currentPage}`
        : `Showing ${shown} of ${total} ${noun} on page ${currentPage}`;
  }

  function updatePaginationControls() {
    pageIndicator.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = !hasNextPage;
  }

  function setDataSource(isFallback) {
    dataSourceText.textContent = isFallback ? "Offline sample data" : "GitHub REST API";
  }

  // ---------- fetch (async/await + try/catch) ----------
  async function fetchRepos() {
    const perPage = perPageSelect.value;

    spinner.hidden = false;
    errorMessage.hidden = true;
    emptyMessage.hidden = true;
    grid.setAttribute("aria-busy", "true");
    resultsCount.textContent = "Loading repositories…";
    showSkeletons(Number(perPage));

    // Query params driven by the controls: sort, direction, type, per_page, page
    const params = new URLSearchParams({
      sort: sortSelect.value,
      direction: directionSelect.value,
      type: typeSelect.value,
      per_page: perPage,
      page: String(currentPage),
    });

    const url =
      `https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}/repos?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/vnd.github+json" },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`GitHub user "${GITHUB_USERNAME}" was not found.`);
        }
        if (response.status === 403) {
          throw new Error("GitHub's API rate limit was reached (60 requests per hour).");
        }
        throw new Error(`GitHub's API returned an error (status ${response.status}).`);
      }

      const repos = await response.json();

      currentRepos = repos;
      hasNextPage = repos.length === Number(perPage);
      setDataSource(false);
      renderRepos(currentRepos);
      updatePaginationControls();
    } catch (error) {
      showFallback(error, Number(perPage));
    } finally {
      spinner.hidden = true;
      grid.removeAttribute("aria-busy");
    }
  }

  // Graceful degradation: render the bundled sample list with a friendly note
  function showFallback(error, perPage) {
    let page = currentPage;
    let paged = paginateMockRepos(
      MOCK_REPOS, sortSelect.value, directionSelect.value, perPage, page
    );

    // If we landed past the end of the mock data (e.g. after paging forward
    // on live data that no longer exists), snap back to page 1 instead of
    // showing an empty grid.
    if (paged.length === 0 && page > 1) {
      page = 1;
      currentPage = 1;
      paged = paginateMockRepos(
        MOCK_REPOS, sortSelect.value, directionSelect.value, perPage, page
      );
    }

    currentRepos = paged;
    hasNextPage = page * perPage < MOCK_REPOS.length;
    setDataSource(true);
    renderRepos(currentRepos);
    updatePaginationControls();

    errorText.textContent =
      error instanceof TypeError
        ? "Couldn't reach GitHub, so sample projects are shown instead. Check your connection and hit Refresh."
        : `${error.message || "Something went wrong while loading projects."} Showing sample projects instead.`;
    errorMessage.hidden = false;
  }

  function resetToFirstPageAndFetch() {
    currentPage = 1;
    fetchRepos();
  }

  // ---------- events ----------
  // Search and the bookmark filter work on already-fetched data (no refetch)
  searchInput.addEventListener("input", () => renderRepos(currentRepos));
  bookmarkedOnly.addEventListener("change", () => renderRepos(currentRepos));

  // These change the API request itself, so they refetch from page 1
  sortSelect.addEventListener("change", resetToFirstPageAndFetch);
  directionSelect.addEventListener("change", resetToFirstPageAndFetch);
  typeSelect.addEventListener("change", resetToFirstPageAndFetch);
  perPageSelect.addEventListener("change", resetToFirstPageAndFetch);
  refreshBtn.addEventListener("click", resetToFirstPageAndFetch);

  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      fetchRepos();
    }
  });

  nextPageBtn.addEventListener("click", () => {
    if (hasNextPage) {
      currentPage += 1;
      fetchRepos();
    }
  });

  fetchRepos();
}


// =============================================================
// Fallback if the Github API is unreachable or rate-limited. This is a static list of repos to display.
// =============================================================
const MOCK_REPOS = [
  {
    id: -1,
    name: "high-concurrency-event-platform",
    description:
      "Event platform architected to sustain 10,000 concurrent users in k6 load testing by pairing Aurora Serverless v2 with RDS Proxy, SQS, and ElastiCache, all on AWS CDK.",
    html_url: "https://github.com/JanDexter/high-concurrency-event-platform",
    language: "TypeScript",
    stargazers_count: 4,
    forks_count: 1,
    created_at: "2025-11-02T00:00:00Z",
    pushed_at: "2026-08-20T00:00:00Z",
    updated_at: "2026-08-20T00:00:00Z",
  },
  {
    id: -2,
    name: "audio-intrusion-hybrid-paradigm",
    description:
      "Thesis project: an end-to-end on-device ML pipeline for audio intrusion detection using TESPAR feature extraction, an INT8-quantized CNN, a cascading heuristic gate, and FedAvg federated learning across ESP32 nodes.",
    html_url: "https://github.com/JanDexter/audio-intrusion-hybrid-paradigm",
    language: "Python",
    stargazers_count: 7,
    forks_count: 2,
    created_at: "2025-06-15T00:00:00Z",
    pushed_at: "2026-07-10T00:00:00Z",
    updated_at: "2026-07-10T00:00:00Z",
  },
  {
    id: -3,
    name: "circuitverse-mcp",
    description:
      "An MCP server that lets AI tools build and design circuits, outputting CircuitVerse-compatible files.",
    html_url: "https://github.com/JanDexter/circuitverse-mcp",
    language: "TypeScript",
    stargazers_count: 12,
    forks_count: 3,
    created_at: "2025-09-01T00:00:00Z",
    pushed_at: "2026-06-18T00:00:00Z",
    updated_at: "2026-06-18T00:00:00Z",
  },
  {
    id: -4,
    name: "papyr",
    description:
      "An all-in-one desktop application for researchers built in Rust, featuring note-taking, a citation manager, a LaTeX editor, and real-time collaboration with bidirectional lookup.",
    html_url: "https://github.com/JanDexter/papyr",
    language: "Rust",
    stargazers_count: 9,
    forks_count: 2,
    created_at: "2025-03-20T00:00:00Z",
    pushed_at: "2026-05-05T00:00:00Z",
    updated_at: "2026-05-05T00:00:00Z",
  },
  {
    id: -5,
    name: "decus",
    description:
      "A scalable badge issuance and on-chain verification system for gamified microcredentials, built with Flutter and the Sui Web3 ecosystem. 2nd place at the YGG Pilipinas & Sui Foundation Hackathon.",
    html_url: "https://github.com/JanDexter/decus",
    language: "Dart",
    stargazers_count: 15,
    forks_count: 4,
    created_at: "2024-11-08T00:00:00Z",
    pushed_at: "2025-01-12T00:00:00Z",
    updated_at: "2025-01-12T00:00:00Z",
  },
];
// =============================================================
// Pagination for mock repos
// =============================================================
function paginateMockRepos(repos, sort, direction, perPage, page) {
  const sortKey = { updated: "updated_at", created: "created_at", pushed: "pushed_at", full_name: "name" }[sort] || "updated_at";

  const sorted = [...repos].sort((a, b) => {
    const av = sortKey === "name" ? a[sortKey].toLowerCase() : a[sortKey];
    const bv = sortKey === "name" ? b[sortKey].toLowerCase() : b[sortKey];
    if (av < bv) return direction === "asc" ? -1 : 1;
    if (av > bv) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const start = (page - 1) * perPage;
  return sorted.slice(start, start + perPage);
}
