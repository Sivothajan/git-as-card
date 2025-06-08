import { useState, useCallback, useEffect } from "react";
import styles from "./Git.module.css";
import Loading from "../loading/Loading";
import NotFound from "../NotFound/NotFound";

const CACHE_KEY = "github-repos-cache";
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
const RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRIES = 3;

export default function Git() {
  const [username, setUsername] = useState("sivothajan");
  const [repos, setRepos] = useState(() => {
    // Try to load from cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

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

    setUsername(searchQuery);
    setLoading(true);
    setError(null);
    localStorage.removeItem(CACHE_KEY); // Clear cache when searching new user
  };

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("User not found");
          }
          throw new Error("Failed to fetch repositories");
        }

        const data = await response.json();

        // Filter out forks and repos with same name as username, then sort by stars
        const filteredRepos = data
          .filter(
            (repo) =>
              !repo.fork &&
              repo.name.toLowerCase() !== repo.owner.login.toLowerCase(),
          )
          .sort((a, b) => b.stargazers_count - a.stargazers_count);

        // Fetch social image for each repo with retry logic
        const reposWithImages = await Promise.all(
          filteredRepos.map(async (repo) => {
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

        // Update cache
        localStorage.setItem(
          CACHE_KEY,
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

    // Cleanup cache on unmount if it's expired
    return () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp >= CACHE_DURATION) {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    };
  }, [username, checkImage]);

  if (loading) return <Loading />;
  if (error) return <NotFound />;

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
        </form>
        {username !== "sivothajan" && (
          <p className={styles.viewingUser}>
            Viewing repositories for: {username}
          </p>
        )}
      </div>

      <div className={styles.reposGrid}>
        {repos.map((repo) => (
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
        ))}
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
  };
  return colors[language] || "#8e8e8e";
}
