'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { BODY_AREA_OPTIONS, CONDITION_BY_SLUG, conditionHref, type ConditionSlug } from '../../data/conditions';
import styles from './BodyExplorer.module.css';

/** Map a space-separated list of package class names to this module's classes. */
const cx = (names: string) =>
  names
    .split(' ')
    .map((n) => styles[n] ?? n)
    .join(' ');

/** Hotspot positions on the illustration (percent of the figure), from the client package. */
const HOTSPOTS: Record<string, [number, number]> = {
  headaches: [50, 7],
  'neck-pain': [50, 16],
  'shoulder-pain': [32, 25],
  'back-pain-sciatica': [50, 34],
  'elbow-wrist-hand-pain': [22, 42],
  'hip-pain': [42, 49],
  'knee-pain': [43, 71],
  'foot-ankle-pain': [43, 93],
};

/**
 * "Explore by body area" (client package What We Treat hero). The labelled area buttons are the accessible
 * controls (toggle buttons with aria-pressed); the dots on the illustration are pointer shortcuts to the same
 * choices, so they are kept out of the tab order and the accessibility tree. Selecting an area updates the summary
 * and its link (announced politely); nothing auto-advances. The front-view figure hides the back-only dot, as in the
 * package.
 */
export function BodyExplorer() {
  const [selected, setSelected] = useState<ConditionSlug>(BODY_AREA_OPTIONS[0].slug);
  const [touched, setTouched] = useState(false);
  const area = BODY_AREA_OPTIONS.find((a) => a.slug === selected) ?? BODY_AREA_OPTIONS[0];
  const condition = CONDITION_BY_SLUG[selected];
  const [fx, fy] = HOTSPOTS[selected] ?? [50, 50];

  const choose = (slug: ConditionSlug) => {
    setSelected(slug);
    setTouched(true);
  };

  return (
    <div className={styles.explorer}>
      <p className={styles.toolsTitle} id="body-explorer-title">
        Explore by body area
      </p>
      <div className={styles.layout}>
        <div
          className={[styles.figure, touched ? styles.hasFocus : ''].join(' ')}
          data-selected={selected}
          style={{ '--focus-x': `${fx}%`, '--focus-y': `${fy}%` } as CSSProperties}
        >
          <div className={styles.stage}>
            <svg className={cx('anatomy-map')} viewBox="0 0 260 620" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="bodySkin" x1="0" x2="1">
                  <stop stopColor="#aabbb7" />
                  <stop offset=".48" stopColor="#e6e8de" />
                  <stop offset="1" stopColor="#92aaa5" />
                </linearGradient>
                <linearGradient id="muscleTone" x1="0" x2="1">
                  <stop stopColor="#bc8568" />
                  <stop offset=".5" stopColor="#e8b895" />
                  <stop offset="1" stopColor="#b57759" />
                </linearGradient>
              </defs>
              <g className={cx('body-silhouette')} fill="url(#bodySkin)" stroke="#c2d0ca" strokeWidth="1.5">
                <ellipse cx="130" cy="47" rx="29" ry="37" />
                <path d="M115 80L113 104Q93 108 78 119L65 144L48 208L36 267L28 302L31 328L39 335L47 327L49 300L65 266L79 220L91 174L95 223L98 271L91 306L89 352L94 405L101 448L99 487L99 543L95 581L88 599L92 608L112 606L119 591L120 547L124 502L123 456L129 400L130 352L131 400L137 456L136 502L140 547L141 591L148 606L168 608L172 599L165 581L161 543L161 487L159 448L166 405L171 352L169 306L162 271L165 223L169 174L181 220L195 266L211 300L213 327L221 335L229 328L232 302L224 267L212 208L195 144L182 119Q167 108 147 104L145 80Z" />
              </g>
              <g className={cx('body-focus-regions')} aria-hidden="true">
                <ellipse className={cx('focus-region focus-head')} cx="130" cy="47" rx="28" ry="36" />
                <ellipse className={cx('focus-region focus-neck')} cx="130" cy="105" rx="24" ry="27" />
                <ellipse className={cx('focus-region focus-shoulder')} cx="84" cy="149" rx="24" ry="33" />
                <ellipse className={cx('focus-region focus-arm')} cx="59" cy="257" rx="22" ry="57" />
                <ellipse className={cx('focus-region focus-back')} cx="130" cy="208" rx="35" ry="60" />
                <ellipse className={cx('focus-region focus-hip')} cx="111" cy="299" rx="29" ry="31" />
                <ellipse className={cx('focus-region focus-knee')} cx="111" cy="443" rx="22" ry="29" />
                <ellipse className={cx('focus-region focus-foot')} cx="109" cy="580" rx="23" ry="27" />
              </g>
              <g className={cx('muscle-anatomy')} fill="url(#muscleTone)" stroke="#f3d7bc" strokeWidth="1" opacity="0.85">
                <path className={cx('zone-neck')} d="M117 85L126 102L119 121L108 111ZM143 85L134 102L141 121L152 111Z" />
                <path className={cx('zone-shoulder')} d="M104 113Q76 113 69 152L86 166L100 140ZM156 113Q184 113 191 152L174 166L160 140Z" />
                <path d="M105 124L126 131L126 172Q107 178 96 155ZM155 124L134 131L134 172Q153 178 164 155Z" />
                <path d="M109 184L126 184L126 260L108 252ZM151 184L134 184L134 260L152 252Z" />
                <path
                  className={cx('zone-arm')}
                  d="M77 172L90 173L75 222L65 218ZM183 172L170 173L185 222L195 218ZM61 233L72 236L53 285L44 281ZM199 233L188 236L207 285L216 281Z"
                />
                <path className={cx('zone-hip')} d="M100 264L124 275L119 311L99 300ZM160 264L136 275L141 311L161 300Z" />
                <path d="M100 312L118 318L122 377L113 426L103 424L97 366ZM160 312L142 318L138 377L147 426L157 424L163 366Z" />
                <path d="M106 465L119 465L116 531L108 561L103 541ZM154 465L141 465L144 531L152 561L157 541Z" />
              </g>
              <g className={cx('back-anatomy')} fill="url(#muscleTone)" stroke="#f3d7bc" strokeWidth="1" opacity="0.9">
                <path className={cx('zone-neck')} d="M119 87L128 108L128 139L101 120ZM141 87L132 108L132 139L159 120Z" />
                <path className={cx('zone-back')} d="M100 142L125 155L126 248L109 263L99 216ZM160 142L135 155L134 248L151 263L161 216Z" />
                <path className={cx('zone-hip')} d="M100 272L125 277L126 314L99 311ZM160 272L135 277L134 314L161 311Z" />
              </g>
              <g className={cx('skeletal-lines')} fill="none" stroke="#fff6df" strokeLinecap="round" strokeLinejoin="round">
                <path d="M130 85L130 285" strokeWidth="6" />
                <path
                  d="M103 122Q114 116 129 128Q146 116 157 122M130 140Q112 132 101 144M130 153Q111 145 101 156M130 166Q111 158 103 169M130 179Q113 172 106 182M130 192Q115 185 110 195M130 205Q117 198 113 208M130 140Q148 132 159 144M130 153Q149 145 159 156M130 166Q149 158 157 169M130 179Q147 172 154 182M130 192Q145 185 150 195M130 205Q143 198 147 208"
                  strokeWidth="2.2"
                />
                <path d="M84 157L67 223M176 157L193 223M65 236L46 296M72 239L51 297M195 236L214 296M188 239L209 297" strokeWidth="4" />
                <path className={cx('zone-hip')} d="M100 272Q129 287 160 272L158 300L143 317L130 305L117 317L102 300Z" strokeWidth="3" />
                <path
                  d="M110 319L111 431M150 319L149 431M109 457L109 574M116 460L116 556M151 457L151 574M144 460L144 556M109 582L104 598M151 582L156 598"
                  strokeWidth="4"
                />
              </g>
            </svg>
            {BODY_AREA_OPTIONS.map((option) => {
              const [x, y] = HOTSPOTS[option.slug] ?? [50, 50];
              return (
                <button
                  key={option.slug}
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  className={[styles.hotspot, option.slug === 'back-pain-sciatica' ? styles.backOnly : ''].join(' ')}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  data-pressed={option.slug === selected}
                  onClick={() => choose(option.slug)}
                >
                  <span />
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.info}>
          <p className={styles.hint}>Select a point on the illustration or choose an area below.</p>
          <div className={styles.regionList} role="group" aria-labelledby="body-explorer-title">
            {BODY_AREA_OPTIONS.map((option) => (
              <button key={option.slug} type="button" aria-pressed={option.slug === selected} onClick={() => choose(option.slug)}>
                {option.label}
              </button>
            ))}
          </div>
          <div className={styles.selection} aria-live="polite">
            <h2 className={styles.selectionTitle}>{area.label}</h2>
            <p>{condition.heroText}</p>
            <Link href={conditionHref(condition.slug)}>
              Explore {condition.name} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
      <p className={styles.caption}>Illustrative body-area guide</p>
    </div>
  );
}
