import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb navigation component.
 * Renders a › -separated list of links; the last item is non-linked (current page).
 *
 * Example: <Breadcrumb items={[{ label: 'Ideas', href: '/ideas' }, { label: 'My idea text…' }]} />
 * Renders: Ideas › My idea text…
 */
export function Breadcrumb({ items }: BreadcrumbProps): React.ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span aria-hidden="true" className="text-gray-400">›</span>}
          {item.href && index < items.length - 1 ? (
            <Link to={item.href} className="hover:text-gray-700 transition-colors truncate max-w-xs">
              {item.label}
            </Link>
          ) : (
            <span
              className="text-gray-700 font-medium truncate max-w-xs"
              aria-current={index === items.length - 1 ? 'page' : undefined}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
