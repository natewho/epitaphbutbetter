const STATUS = document.getElementById("status");
const REFRESH_BUTTON = document.getElementById("refresh");
const SEARCH_INPUT = document.getElementById("search");
const CATEGORY_SELECT = document.getElementById("category");
const SORT_SELECT = document.getElementById("sort");
const SUMMARY_SECTION = document.getElementById("summary");
const OPINIONS_SECTION = document.getElementById("opinions");

const CATEGORY_RULES = [
  {
    name: "Section 220 demands",
    keywords: ["section 220", "books and records", "220 demand", "stockholder demand"],
  },
  {
    name: "Assignment for the benefit of creditors",
    keywords: ["assignment for the benefit of creditors", "abc", "assignee"],
  },
  {
    name: "Fiduciary duties",
    keywords: ["fiduciary", "duty of loyalty", "duty of care", "entire fairness"],
  },
  {
    name: "M&A / deal litigation",
    keywords: ["merger", "acquisition", "deal", "sale process", "go-shop"],
  },
  {
    name: "Appraisal",
    keywords: ["appraisal", "fair value", "262", "valuation"],
  },
  {
    name: "Arbitration & alternative dispute resolution",
    keywords: ["arbitration", "alternative dispute", "adr", "mediation"],
  },
  {
    name: "Discovery & spoliation",
    keywords: ["discovery", "spoliation", "privilege", "protective order"],
  },
  {
    name: "Injunctions & expedited proceedings",
    keywords: ["injunction", "temporary restraining", "expedited"],
  },
  {
    name: "Corporate governance",
    keywords: ["bylaws", "charter", "governance", "board", "stockholder vote"],
  },
];

const SOURCE_ENDPOINTS = [
  "https://r.jina.ai/https://courts.delaware.gov/opinions/",
  "https://r.jina.ai/http://courts.delaware.gov/opinions/",
  "https://courts.delaware.gov/opinions/",
];

const SAMPLE_OPINIONS = [
  {
    title: "In re Example Holdings, Inc.",
    date: "2024-11-02",
    link: "https://courts.delaware.gov/opinions/",
    summary:
      "The court addresses a stockholder's Section 220 demand and clarifies what constitutes a proper purpose for books-and-records inspections.",
    source: "Sample",
  },
  {
    title: "Smith v. Blue River Advisors",
    date: "2024-10-18",
    link: "https://courts.delaware.gov/opinions/",
    summary:
      "Opinion discussing fiduciary duty claims arising from an accelerated sale process and the standards for expedited injunctive relief.",
    source: "Sample",
  },
  {
    title: "Assignment for the Benefit of Creditors of Redwood Logistics",
    date: "2024-10-04",
    link: "https://courts.delaware.gov/opinions/",
    summary:
      "The court analyzes the responsibilities of an assignee and the scope of creditor objections in an ABC proceeding.",
    source: "Sample",
  },
];

let opinions = [];

function normalize(text) {
  return text.toLowerCase();
}

function detectCategory(opinion) {
  const haystack = normalize(`${opinion.title} ${opinion.summary || ""}`);
  const matched = CATEGORY_RULES.filter((rule) =>
    rule.keywords.some((keyword) => haystack.includes(keyword))
  ).map((rule) => rule.name);
  return matched.length ? matched : ["Other"];
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function parseDateFromText(text) {
  const matches = text.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/i
  );
  if (!matches) return "";
  const candidate = matches[0];
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return candidate;
  return parsed.toISOString().split("T")[0];
}

function extractFromDocument(doc) {
  const anchors = Array.from(doc.querySelectorAll("a"));
  const seen = new Set();
  const items = [];

  anchors.forEach((anchor) => {
    const href = anchor.getAttribute("href") || "";
    const text = anchor.textContent.trim();
    if (!text || text.length < 6) return;
    if (!href.includes("opinions")) return;

    const absolute = anchor.href || href;
    const key = `${text}-${absolute}`;
    if (seen.has(key)) return;

    const contextText = anchor.parentElement?.textContent || text;
    const date = parseDateFromText(contextText);
    const summary = contextText.replace(text, "").replace(/\s+/g, " ").trim();

    items.push({
      title: text,
      date,
      link: absolute,
      summary: summary || "Opinion listed on the Delaware Courts website.",
      source: "Delaware Courts",
    });
    seen.add(key);
  });

  return items;
}

async function fetchOpinions() {
  STATUS.textContent = "Fetching latest opinions...";

  for (const endpoint of SOURCE_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { method: "GET" });
      if (!response.ok) throw new Error(`Bad status ${response.status}`);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const extracted = extractFromDocument(doc);
      if (extracted.length) {
        STATUS.textContent = `Loaded ${extracted.length} opinions from the Delaware Courts site.`;
        return extracted;
      }
    } catch (error) {
      console.warn("Fetch failed", endpoint, error);
    }
  }

  STATUS.textContent = "Unable to reach the court site. Showing sample opinions.";
  return SAMPLE_OPINIONS;
}

function enrichOpinions(items) {
  return items.map((item) => {
    const categories = detectCategory(item);
    return {
      ...item,
      categories,
    };
  });
}

function updateCategoryOptions(items) {
  const categories = new Set(["All categories"]);
  items.forEach((opinion) => opinion.categories.forEach((cat) => categories.add(cat)));

  CATEGORY_SELECT.innerHTML = "";
  Array.from(categories)
    .sort()
    .forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      CATEGORY_SELECT.appendChild(option);
    });
}

function filterOpinions(items) {
  const query = normalize(SEARCH_INPUT.value.trim());
  const selectedCategory = CATEGORY_SELECT.value;

  return items.filter((item) => {
    const matchesQuery = !query
      ? true
      : normalize(`${item.title} ${item.summary} ${item.categories.join(" ")}`).includes(query);
    const matchesCategory =
      selectedCategory === "All categories" || item.categories.includes(selectedCategory);
    return matchesQuery && matchesCategory;
  });
}

function sortOpinions(items) {
  const sort = SORT_SELECT.value;
  const sorted = [...items];

  if (sort === "title-asc") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    sorted.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return sort === "date-asc" ? dateA - dateB : dateB - dateA;
    });
  }

  return sorted;
}

function renderSummary(items) {
  const total = items.length;
  const uniqueCategories = new Set();
  const recent = items
    .map((item) => item.date)
    .filter(Boolean)
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a)[0];

  items.forEach((item) => item.categories.forEach((cat) => uniqueCategories.add(cat)));

  SUMMARY_SECTION.innerHTML = `
    <div class="summary-card">
      <h3>${total} opinions tracked</h3>
      <p>Automatically summarized and categorized from the court's latest postings.</p>
    </div>
    <div class="summary-card">
      <h3>${uniqueCategories.size} practice areas</h3>
      <p>Categories include Section 220 demands, ABCs, fiduciary duty disputes, and more.</p>
    </div>
    <div class="summary-card">
      <h3>${recent ? formatDate(recent) : "No dates parsed yet"}</h3>
      <p>Most recent opinion date detected from the feed.</p>
    </div>
  `;
}

function renderOpinions(items) {
  OPINIONS_SECTION.innerHTML = "";

  if (!items.length) {
    OPINIONS_SECTION.innerHTML = `<p class="status">No opinions match your filters yet.</p>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "opinion-card";

    card.innerHTML = `
      <div class="opinion-header">
        <div class="opinion-title">${item.title}</div>
        <div class="opinion-meta">${formatDate(item.date)} • ${item.source}</div>
      </div>
      <div class="badges">
        ${item.categories.map((cat) => `<span class="badge">${cat}</span>`).join("")}
      </div>
      <p class="opinion-summary">${item.summary}</p>
      <div class="opinion-actions">
        <a href="${item.link}" target="_blank" rel="noreferrer">View opinion</a>
      </div>
    `;

    OPINIONS_SECTION.appendChild(card);
  });
}

function updateView() {
  const filtered = filterOpinions(opinions);
  const sorted = sortOpinions(filtered);
  renderSummary(opinions);
  renderOpinions(sorted);
}

async function init() {
  opinions = enrichOpinions(await fetchOpinions());
  updateCategoryOptions(opinions);
  updateView();
}

REFRESH_BUTTON.addEventListener("click", init);
SEARCH_INPUT.addEventListener("input", updateView);
CATEGORY_SELECT.addEventListener("change", updateView);
SORT_SELECT.addEventListener("change", updateView);

init();
