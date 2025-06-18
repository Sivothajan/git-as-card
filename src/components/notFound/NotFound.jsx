import styles from "./NotFound.module.css";
import { Link } from "react-router-dom";

const NotFound = ({ message }) => {
  const is404 = !message || message.includes("404");
  return (
    <div className={styles.notFound}>
      <div className={styles.notFoundContent}>
        <h2>{is404 ? "404 - Page Not Found" : "No Results Found"}</h2>
        {message && <p>{message}</p>}
        <Link to="/" className={styles.homeLink}>
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
