# Preliminary Milestone — Personal Portfolio

A three-page personal portfolio site (Home/Hero, About Me, Projects/Gallery)
built with semantic HTML5, Bulma, CSS Grid/Flexbox, and vanilla JavaScript.
The Projects page pulls live repository data from the GitHub REST API.

## Pages

- `home.html` — Hero section with intro and CTAs
- `about.html` — Bio, skills, education/experience, and a contact form
- `projects.html` — Live GitHub repo gallery with search, filters, and pagination
- `index.html` — Redirects to `home.html`

## Features

**Semantic & Accessible HTML**
- Landmark elements (`header`, `nav`, `main`, `section`, `footer`) on every page
- Form fields use correct input types (`email`, `tel`, `search`) with `required`
- All images include descriptive `alt` text
- Valid HTML5, no deprecated tags

**Modern CSS Layout**
- Mobile-first responsive design with breakpoints at `600px` and `1024px`
- CSS Grid powers the projects gallery (`.projects-grid`)
- Flexbox powers the navbar and footer layouts
- CSS custom properties for colors, spacing, radius, and shadows (`style.css`)

**DOM & Interactivity**
- Client-side partial search filters project cards by name
- Project cards are generated entirely via JavaScript DOM methods — no
  hardcoded gallery markup in the HTML

**Fetch & Async**
- `GET https://api.github.com/users/{username}/repos` with `sort`, `direction`,
  `type`, `per_page`, and `page` query params
- Animated loading spinner while data is being fetched
- `try/catch` error handling with a friendly, user-facing error message
- Fetched data rendered into styled cards (name, description, language,
  stars, forks, last updated, link to repo)

**Bonus**
- Pagination (Previous/Next) using the API's `page` param
- Bookmarking projects, persisted in `localStorage`, with a "bookmarked only" filter
- Contact form on the About page validates PH mobile numbers via RegEx
  (`^(?:\+63|0)9\d{9}$`) and shows a success notification on valid submit

## Setup

No build step required — everything is static HTML/CSS/JS.

1. Clone the repo
2. Open `index.html` (or `home.html`) directly in a browser, or serve the
   folder with any static server, e.g.:
   ```bash
   python3 -m http.server 8000
   ```
3. In `script.js`, update the `GITHUB_USERNAME` constant to your own GitHub
   username so the Projects page fetches your repositories.

## Tech

- [Bulma](https://bulma.io/) (CSS framework, via CDN)
- [Font Awesome](https://fontawesome.com/) (icons, via CDN)
- Vanilla JavaScript (no frameworks)
- [GitHub REST API](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)

