import './Skeleton.css';

export function SkeletonBlock({ width, height, className = '', style = {} }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

export function DetailSkeleton() {
  return (
    <div className="skeleton-detail">
      <div className="skeleton-row">
        <SkeletonBlock width="60px" height="30px" />
        <SkeletonBlock width="60px" height="14px" />
        <SkeletonBlock width="80px" height="14px" />
      </div>
      <div className="skeleton-detail-layout">
        <div className="skeleton-detail-main">
          <SkeletonBlock className="skeleton-title" />
          <div className="skeleton-row">
            <SkeletonBlock className="skeleton-tag" />
            <SkeletonBlock className="skeleton-tag" />
            <SkeletonBlock className="skeleton-tag" />
          </div>
          <SkeletonBlock className="skeleton-image" />
          <div className="skeleton-section">
            <SkeletonBlock width="120px" height="1.25rem" style={{ marginBottom: '0.75rem' }} />
            <SkeletonBlock className="skeleton-text" />
            <SkeletonBlock className="skeleton-text" />
            <SkeletonBlock className="skeleton-text medium" />
          </div>
          <div className="skeleton-section">
            <SkeletonBlock width="100px" height="1.25rem" style={{ marginBottom: '0.75rem' }} />
            <SkeletonBlock className="skeleton-text" />
            <SkeletonBlock className="skeleton-text short" />
          </div>
        </div>
        <div className="skeleton-detail-sidebar">
          <div className="skeleton-card">
            <SkeletonBlock width="80px" height="1rem" style={{ marginBottom: '0.75rem' }} />
            <SkeletonBlock className="skeleton-map" />
          </div>
          <div className="skeleton-card">
            <SkeletonBlock width="60px" height="1rem" style={{ marginBottom: '0.75rem' }} />
            <SkeletonBlock className="skeleton-text medium" />
            <SkeletonBlock className="skeleton-text short" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchResultsSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-monument-card">
          <SkeletonBlock className="skeleton-image" style={{ height: '180px', margin: 0, borderRadius: 0 }} />
          <div className="skeleton-monument-card-body">
            <SkeletonBlock className="skeleton-text" style={{ width: '80%' }} />
            <SkeletonBlock className="skeleton-text short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RoutesSkeleton({ count = 3 }) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-route-card">
          <div style={{ flex: 1 }}>
            <SkeletonBlock className="skeleton-text" style={{ width: '50%' }} />
            <SkeletonBlock className="skeleton-text short" style={{ height: '0.75em' }} />
          </div>
          <div className="skeleton-route-actions">
            <SkeletonBlock className="skeleton-btn" />
            <SkeletonBlock className="skeleton-btn" />
          </div>
        </div>
      ))}
    </div>
  );
}
