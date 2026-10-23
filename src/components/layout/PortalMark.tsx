/**
 * Portal identity mark: three allocation bars held inside a budget limit line.
 * Deliberately generic — not the emblem of any real government body.
 */
export function PortalMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="5" fill="#1E3A8A" />
      <rect x="6" y="8.5" width="15" height="3.5" rx="1" fill="#F8FAFC" />
      <rect x="6" y="14.25" width="11" height="3.5" rx="1" fill="#F8FAFC" opacity="0.85" />
      <rect x="6" y="20" width="7" height="3.5" rx="1" fill="#F8FAFC" opacity="0.7" />
      <rect x="23.5" y="6" width="2" height="20" rx="1" fill="#F59E0B" />
    </svg>
  );
}
