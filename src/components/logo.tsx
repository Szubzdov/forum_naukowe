export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#263a94" />
      <path d="M9 9.5h9.5a4.5 4.5 0 0 1 0 9H13V23H9z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="22.5" cy="22.5" r="2.2" fill="#9fb2ff" />
    </svg>
  );
}
