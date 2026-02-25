// src/components/PortfolioCard.jsx
// Displays a single portfolio item as a card in the overview grid.
// Clicking the card triggers the onSelect callback to open the detail view.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * @param {Object}   props
 * @param {Object}   props.item     – portfolio item data
 * @param {Function} props.onSelect – called with the item when the card is clicked
 */
export function PortfolioCard({ item, onSelect }) {
  // Determine a preview image from the media list (first image mime type)
  const previewImage = item.media?.find(m => m.mime_type?.startsWith('image/'));

  return (
    <article
      className="portfolio-card card"
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect(item)}
      aria-label={`Portfolio item: ${item.title}`}
    >
      {/* Media preview */}
      <div className="portfolio-card__thumb">
        {previewImage ? (
          <img
            src={`${BASE_URL}/uploads/${previewImage.stored_name}`}
            alt={item.title}
            loading="lazy"
          />
        ) : (
          <div className="portfolio-card__thumb-placeholder">
            <span>{categoryIcon(item.category)}</span>
          </div>
        )}
      </div>

      <div className="card-body portfolio-card__body">
        {/* Category badge */}
        <span className={`badge portfolio-badge portfolio-badge--${slug(item.category)}`}>
          {item.category}
        </span>

        {/* Title */}
        <h3 className="portfolio-card__title">{item.title}</h3>

        {/* Date range */}
        {item.date_from && (
          <p className="portfolio-card__date text-muted text-sm">
            {formatDateRange(item.date_from, item.date_to)}
          </p>
        )}

        {/* Description snippet */}
        {item.description && (
          <p className="portfolio-card__desc text-muted text-sm">
            {truncate(item.description, 100)}
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="portfolio-card__tags">
            {item.tags.map(tag => (
              <span key={tag} className="portfolio-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatDateRange(from, to) {
  const fmt = (d) => new Date(d).toLocaleDateString('de-DE', { dateStyle: 'short' });
  if (!to || from === to) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}

/** Returns a URL-safe slug for CSS class names. */
function slug(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'other';
}

/** Category emoji icons used as fallback thumbnails. */
function categoryIcon(cat) {
  const map = {
    DJing:           '🎧',
    Eventtechnik:    '🎛️',
    Videography:     '🎥',
    Photography:     '📷',
    Musikproduktion: '🎶',
    IT:              '💻'
  };
  return map[cat] || '📁';
}
