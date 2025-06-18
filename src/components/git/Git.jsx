import { useState, useCallback, useEffect, useMemo } from "react";
import styles from "./Git.module.css";
import Loading from "./loading/Loading";
import NotFound from "../notFound/NotFound";

const CACHE_KEY = "github-repos-cache";
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
const RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRIES = 3;

export default function Git() {
  const DEFAULT_USER = "torvalds";
  const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes
  const [username, setUsername] = useState(DEFAULT_USER);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(DEFAULT_USER);
  // Filter states
  const [languageFilter, setLanguageFilter] = useState("");
  const [minStars, setMinStars] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all"); // all, fork, original, archived
  const [sortBy, setSortBy] = useState("stars"); // stars, name, updated, created
  const [hasIssues, setHasIssues] = useState(false);
  const [licenseFilter, setLicenseFilter] = useState("");
  // Refresh counter to force fetch
  const [refresh, setRefresh] = useState(0);

  // Function to check if image loads successfully
  const checkImage = useCallback(async (url, retries = 0) => {
    try {
      const response = await fetch(url);
      if (!response.ok && retries < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return checkImage(url, retries + 1);
      }
      return response.ok;
    } catch {
      if (retries < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return checkImage(url, retries + 1);
      }
      return false;
    }
  }, []);

  // Mouse move effect for cards
  useEffect(() => {
    const cards = document.querySelectorAll(`.${styles.repoCard}`);

    const handleMouseMove = (event, card) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / card.offsetWidth) * 100;
      const y = ((event.clientY - rect.top) / card.offsetHeight) * 100;
      card.style.setProperty("--mouse-x", `${x}%`);
      card.style.setProperty("--mouse-y", `${y}%`);
    };

    const handleMouseLeave = (card) => {
      card.style.setProperty("--mouse-x", "50%");
      card.style.setProperty("--mouse-y", "50%");
    };

    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => handleMouseMove(e, card));
      card.addEventListener("mouseleave", () => handleMouseLeave(card));
    });

    return () => {
      cards.forEach((card) => {
        card.removeEventListener("mousemove", (e) => handleMouseMove(e, card));
        card.removeEventListener("mouseleave", () => handleMouseLeave(card));
      });
    };
  }, [repos]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Only trigger fetch if username is different or there was an error
    if (searchQuery !== username || error) {
      setUsername(searchQuery);
      setLoading(true);
      setError(null);
      setRefresh((r) => r + 1);
    }
  };

  // Clear search and reset to default user
  const handleClear = () => {
    setUsername(DEFAULT_USER);
    setSearchQuery(DEFAULT_USER);
    setError(null);
    setRefresh((r) => r + 1);
    // Remove only the cache for the current username
    localStorage.removeItem(`github-repos-cache-${username}`);
  };

  useEffect(() => {
    const cacheKey = `github-repos-cache-${username}`;
    const fetchRepos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check per-username cache
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setRepos(data);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem(cacheKey);
          }
        }

        // Fetch all pages of repos (pagination)
        let allRepos = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const response = await fetch(
            `https://api.github.com/users/${username}/repos?sort=updated&per_page=100&page=${page}`,
          );
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error("User not found");
            }
            throw new Error("Failed to fetch repositories");
          }
          const data = await response.json();
          allRepos = allRepos.concat(data);
          if (data.length < 100) {
            hasMore = false;
          } else {
            page++;
          }
        }

        // Fetch social image for each repo with retry logic
        const reposWithImages = await Promise.all(
          allRepos.map(async (repo) => {
            try {
              const socialImageUrl = `https://opengraph.githubassets.com/1/${repo.full_name}`;
              const imageExists = await checkImage(socialImageUrl);
              return {
                ...repo,
                socialImageUrl: imageExists ? socialImageUrl : null,
              };
            } catch (error) {
              console.error(
                `Failed to fetch social image for ${repo.name}:`,
                error,
              );
              return { ...repo, socialImageUrl: null };
            }
          }),
        );

        // Update per-username cache
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: reposWithImages,
            timestamp: Date.now(),
          }),
        );

        setRepos(reposWithImages);
      } catch (error) {
        setError(error.message);
        setRepos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [username, checkImage, CACHE_DURATION, refresh]);

  // Get unique languages for filter dropdown
  const languages = useMemo(() => {
    const set = new Set();
    repos.forEach((repo) => {
      if (repo.language) set.add(repo.language);
    });
    return Array.from(set).sort();
  }, [repos]);

  // Get unique licenses for filter dropdown
  const licenses = useMemo(() => {
    const set = new Set();
    repos.forEach((repo) => {
      if (
        repo.license &&
        repo.license.spdx_id &&
        repo.license.spdx_id !== "NOASSERTION"
      )
        set.add(repo.license.spdx_id);
    });
    return Array.from(set).sort();
  }, [repos]);

  // Filtered repos based on all filters
  const filteredRepos = useMemo(() => {
    let result = repos.filter((repo) => {
      const matchesLanguage = languageFilter
        ? repo.language === languageFilter
        : true;
      const matchesStars = repo.stargazers_count >= minStars;
      const matchesType =
        typeFilter === "all"
          ? true
          : typeFilter === "fork"
            ? repo.fork
            : typeFilter === "original"
              ? !repo.fork
              : typeFilter === "archived"
                ? repo.archived
                : true;
      const matchesIssues = hasIssues ? repo.open_issues_count > 0 : true;
      const matchesLicense = licenseFilter
        ? repo.license && repo.license.spdx_id === licenseFilter
        : true;
      return (
        matchesLanguage &&
        matchesStars &&
        matchesType &&
        matchesIssues &&
        matchesLicense
      );
    });
    // Sorting
    switch (sortBy) {
      case "stars":
        result = result.sort((a, b) => b.stargazers_count - a.stargazers_count);
        break;
      case "name":
        result = result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "updated":
        result = result.sort(
          (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
        );
        break;
      case "created":
        result = result.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        break;
      default:
        break;
    }
    return result;
  }, [
    repos,
    languageFilter,
    minStars,
    typeFilter,
    hasIssues,
    licenseFilter,
    sortBy,
  ]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>GitHub Projects</h1>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter GitHub username..."
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClear}
              >
                Clear
              </button>
            )}
          </form>
          <div className={styles.errorMsg}>
            {error === "User not found"
              ? "User not found. Please check the username and try again."
              : "Failed to fetch repositories. Please try again later."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>GitHub Projects</h1>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter GitHub username..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
            >
              Clear
            </button>
          )}
        </form>
        <p className={styles.viewingUser}>
          Viewing repositories for: {username}
        </p>
        {/* Filter Controls */}
        <div className={styles.filterBar}>
          <div className={styles.modernFilterGroup}>
            <span className={styles.filterLabel}>
              <svg
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                style={{ verticalAlign: "middle", marginRight: 4 }}
              >
                <path
                  d="M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.382a1 1 0 0 1-.293.707l-5.414 5.414A1 1 0 0 0 15 14.414V19a1 1 0 0 1-1.447.894l-4-2A1 1 0 0 1 9 17v-2.586a1 1 0 0 0-.293-.707L3.293 8.09A1 1 0 0 1 3 7.382V5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Language
            </span>
            <div className={styles.modernSelectWrapper}>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className={styles.modernSelect}
              >
                <option value="">All</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>&#9662;</span>
            </div>
          </div>
          <div className={styles.modernFilterGroup}>
            <span className={styles.filterLabel}>
              <svg
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                style={{ verticalAlign: "middle", marginRight: 4 }}
              >
                <path
                  d="M12 8v8m0 0-3-3m3 3 3-3M5 12a7 7 0 1 0 14 0 7 7 0 0 0-14 0Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Min Stars
            </span>
            <input
              type="number"
              min={0}
              value={minStars}
              onChange={(e) => setMinStars(Number(e.target.value))}
              className={styles.modernInput}
              placeholder="0"
            />
          </div>
          <div className={styles.modernFilterGroup}>
            <span className={styles.filterLabel}>Type</span>
            <div className={styles.modernSelectWrapper}>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={styles.modernSelect}
              >
                <option value="all">All</option>
                <option value="original">Original</option>
                <option value="fork">Forks</option>
                <option value="archived">Archived</option>
              </select>
              <span className={styles.selectArrow}>&#9662;</span>
            </div>
          </div>
          <div className={styles.modernFilterGroup}>
            <span className={styles.filterLabel}>Sort By</span>
            <div className={styles.modernSelectWrapper}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.modernSelect}
              >
                <option value="stars">Stars</option>
                <option value="name">Name</option>
                <option value="updated">Last Updated</option>
                <option value="created">Created Date</option>
              </select>
              <span className={styles.selectArrow}>&#9662;</span>
            </div>
          </div>
          <div className={styles.modernFilterGroup}>
            <label
              className={styles.filterLabel}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <input
                type="checkbox"
                checked={hasIssues}
                onChange={(e) => setHasIssues(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Has Issues
            </label>
          </div>
          <div className={styles.modernFilterGroup}>
            <span className={styles.filterLabel}>License</span>
            <div className={styles.modernSelectWrapper}>
              <select
                value={licenseFilter}
                onChange={(e) => setLicenseFilter(e.target.value)}
                className={styles.modernSelect}
              >
                <option value="">All</option>
                {licenses.map((license) => (
                  <option key={license} value={license}>
                    {license}
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>&#9662;</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.reposGrid}>
        {filteredRepos.length === 0 ? (
          <div className={styles.emptyFilterMsg}>
            No repositories match the selected filters.
          </div>
        ) : (
          filteredRepos.map((repo) => (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.repoCard}
            >
              <div className={styles.repoContent}>
                {repo.socialImageUrl && (
                  <div className={styles.repoImageContainer}>
                    <img
                      src={repo.socialImageUrl}
                      alt={`${repo.name} preview`}
                      className={styles.repoImage}
                      loading="lazy"
                    />
                  </div>
                )}
                <div className={styles.repoInfo}>
                  <h2 className={styles.repoName}>{repo.name}</h2>
                  {repo.description && (
                    <p className={styles.repoDescription}>{repo.description}</p>
                  )}
                  <div className={styles.repoMeta}>
                    {repo.language && (
                      <span className={styles.repoLanguage}>
                        <span
                          className={styles.languageDot}
                          style={{
                            backgroundColor: getLanguageColor(repo.language),
                          }}
                        />
                        {repo.language}
                      </span>
                    )}
                    {repo.stargazers_count > 0 && (
                      <span className={styles.repoStars}>
                        ★ {repo.stargazers_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

// GitHub language colors
function getLanguageColor(language) {
  const colors = {
    JavaScript: "#f1e05a",
    TypeScript: "#2b7489",
    Python: "#3572A5",
    HTML: "#e34c26",
    CSS: "#563d7c",
    PHP: "#4F5D95",
    Shell: "#89e051",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Go: "#00ADD8",
    Ruby: "#701516",
    Rust: "#dea584",
    Kotlin: "#A97BFF",
    Swift: "#ffac45",
    Dart: "#00B4AB",
    Scala: "#c22d40",
    ObjectiveC: "#438eff",
    Vue: "#41b883",
    Svelte: "#ff3e00",
    "Jupyter Notebook": "#DA5B0B",
    Markdown: "#083fa1",
    Dockerfile: "#384d54",
    Perl: "#0298c3",
    Lua: "#000080",
    CSharp: "#178600",
    Elixir: "#6e4a7e",
    Haskell: "#5e5086",
    CoffeeScript: "#244776",
    PowerShell: "#012456",
    Groovy: "#e69f56",
    Assembly: "#6E4C13",
    Other: "#8e8e8e",
  };
  return colors[language] || colors.Other;
}
