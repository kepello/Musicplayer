import { ExternalLink } from 'lucide-react';
import type { StreamingLinks as StreamingLinksData } from '../services/github';

// Order is deliberate: the services Carl distributes through, most-used first.
const SERVICES: { key: keyof StreamingLinksData; label: string }[] = [
  { key: 'spotify', label: 'Spotify' },
  { key: 'appleMusic', label: 'Apple Music' },
  { key: 'amazonMusic', label: 'Amazon Music' },
];

interface Props {
  links?: StreamingLinksData;
  /** Shown above the buttons. Omit for a bare row. */
  label?: string;
  className?: string;
}

/**
 * Renders "listen on ..." buttons for whichever services have a link filled in.
 * Renders nothing at all when none are set, so an album that hasn't been
 * distributed yet simply shows no chrome.
 */
export function StreamingLinks({ links, label, className = '' }: Props) {
  const available = SERVICES.filter(s => links?.[s.key]);
  if (available.length === 0) return null;

  return (
    <div className={className}>
      {label && (
        <p className="text-sm text-zinc-400 mb-2">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {available.map(({ key, label: name }) => (
          <a
            key={key}
            href={links![key]}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all text-sm flex items-center gap-2"
          >
            {name}
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        ))}
      </div>
    </div>
  );
}

export default StreamingLinks;
