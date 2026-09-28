import styles from "./Skeleton.module.css";

export const Skeleton = ({ height = 16, width = "100%", radius = 4 }: { height?: number | string; width?: number | string; radius?: number }) => (
  <span className={styles.skeleton} style={{ height, width, borderRadius: radius }} aria-hidden="true" />
);

export const SkeletonGrid = ({ count = 3, height = 280 }: { count?: number; height?: number }) => (
  <div className={styles.grid}>
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} height={height} radius={8} />
    ))}
  </div>
);
