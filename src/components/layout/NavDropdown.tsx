'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { NavLink, useIsActive } from './NavLink';
import { ChevronDown } from 'lucide-react';
import type { NavGroup } from '../../data/navigation';
import styles from './NavDropdown.module.css';

function useSectionActive(group: NavGroup) {
  return useIsActive(group.to);
}

/** Accessible name of a group's arrow button; its state is conveyed by aria-expanded. */
function submenuButtonLabel(group: NavGroup) {
  return `${group.label} submenu`;
}

/**
 * Desktop split navigation item: the label is a real link to the section's overview page, and a separate sibling
 * arrow button opens the submenu (never nested, never opened on hover). Arrow button: click/tap, Enter/Space toggle;
 * ArrowDown opens and focuses the first link. In the submenu, ArrowUp/ArrowDown/Home/End move between links. Escape
 * closes and returns focus to the arrow button; clicking outside, tabbing away or navigating closes it.
 */
export function NavDropdown({ group, linkClassName, activeClassName }: { group: NavGroup; linkClassName: string; activeClassName: string }) {
  const [open, setOpen] = useState(false);
  const key = usePathname();
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sectionActive = useSectionActive(group);

  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const links = () => Array.from(wrapperRef.current?.querySelectorAll<HTMLAnchorElement>('[data-dropdown-link]') ?? []);

  const focusLink = (index: number) => {
    const all = links();
    if (all.length === 0) return;
    all[(index + all.length) % all.length].focus();
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusLink(0));
    }
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const all = links();
    const index = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusLink(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusLink(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusLink(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusLink(all.length - 1);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (open && !wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <NavLink href={group.to} className={[linkClassName, sectionActive ? activeClassName : ''].join(' ')}>
        {group.label}
      </NavLink>
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        aria-label={submenuButtonLabel(group)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
      >
        <ChevronDown className={styles.chevron} size={16} strokeWidth={2} aria-hidden="true" />
      </button>

      <ul id={panelId} className={[styles.panel, group.children.length <= 3 ? styles.panelNarrow : ''].join(' ')} hidden={!open}
        onKeyDown={onPanelKeyDown}
        onClick={(event) => {
          if ((event.target as Element).closest('a')) setOpen(false);
        }}
      >
        {group.children.map((child) => (
          <li key={child.to}>
            <NavLink
              href={child.to}
              end
              data-dropdown-link
              className={({ isActive }) => [styles.item, isActive ? styles.itemActive : ''].join(' ')}
            >
              {child.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Mobile split item inside the mobile navigation panel: the label links to the overview page; a separate, larger
 * arrow button expands the submenu in place. The current section starts expanded.
 */
export function MobileNavGroup({ group, linkClassName }: { group: NavGroup; linkClassName: string }) {
  const sectionActive = useSectionActive(group);
  const [open, setOpen] = useState(sectionActive);
  const listId = useId();

  return (
    <>
      <div className={[styles.mobileRow, sectionActive ? styles.mobileRowActive : ''].join(' ')}>
        <NavLink href={group.to} className={[linkClassName, styles.mobileLabel].join(' ')}>
          {group.label}
        </NavLink>
        <button
          type="button"
          className={styles.mobileToggle}
          aria-label={submenuButtonLabel(group)}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className={styles.chevron} size={22} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <ul id={listId} className={styles.mobileList} hidden={!open}>
        {group.children.map((child) => (
          <li key={child.to}>
            <NavLink href={child.to} end className={({ isActive }) => [styles.mobileItem, isActive ? styles.itemActive : ''].join(' ')}>
              {child.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </>
  );
}
