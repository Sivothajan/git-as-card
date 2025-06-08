import styles from "./NotFound.module.css";

const NotFound = ({ message }) => {
  return (
    <div className={styles.notFound}>
      <div className={styles.notFoundContent}>
        <h2>No Results Found</h2>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default NotFound;
