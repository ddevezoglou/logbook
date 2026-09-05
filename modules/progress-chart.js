import {
  smoothPath,
  weightModeGroup,
} from './progress-rewards.js';
import { escapeHtml } from './ui.js';
import { exerciseKey as identityKey } from './exercises.js';

const localDate = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
};

const defaultFormatDate = (value, locale) =>
  value
    ? localDate(value).toLocaleDateString(locale, { day:'numeric', month:'short', year:'numeric' })
    : 'Χωρίς ημερομηνία';

export function buildProgressChartMarkup({
  workout,
  exerciseKey,
  setIndex,
  panelWidth = 900,
  displayWeight = value => Number(value) || 0,
  weightSymbol = 'kg',
  locale = 'el-GR',
  formatDate = value => defaultFormatDate(value, locale),
} = {}) {
  if (!workout || !exerciseKey || !Number.isInteger(setIndex)) {
    return '<div class="empty"><span>Καταγράψτε τουλάχιστον δύο ίδια σετ για να δείτε πρόοδο.</span></div>';
  }

  const occurrences = workout.sessions.flatMap(session => {
    const matches = session.exercises?.filter(item => identityKey(item) === exerciseKey) || [];
    return matches.length ? matches.map(exercise => ({ session, exercise })) : [{ session }];
  });
  const records = occurrences.map(({ session, exercise }) => {
    if (!exercise) return { session, reason:'Η άσκηση δεν καταγράφηκε' };
    const set = exercise.sets?.[setIndex];
    if (!set) return { session, reason:`Δεν καταγράφηκε το σετ ${setIndex + 1}` };
    const mode = set.weightMode || 'kg';
    const group = weightModeGroup(mode);
    const reps = Number(set.reps);
    const value = group === 'kg'
      ? displayWeight(set.weight)
      : group === 'plates'
        ? Number(set.plates)
        : mode === 'bodyweight_extra'
          ? displayWeight(set.weight)
          : 0;
    const extraWeight = group === 'plates'
      ? (mode === 'mixed' ? displayWeight(set.weight) : 0)
      : null;
    const validLoad = group === 'kg'
      ? value > 0
      : group === 'plates'
        ? value > 0 && extraWeight >= 0
        : mode === 'bodyweight' || value > 0;
    if (!validLoad || !(reps > 0)) return { session, reason:'Λείπει βάρος ή επαναλήψεις από το σετ' };
    return { session, mode, group, value, extraWeight, reps };
  });

  const groupCounts = records
    .filter(item => item.group)
    .reduce((counts, item) => ({ ...counts, [item.group]:(counts[item.group] || 0) + 1 }), {});
  const comparableGroup = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const points = records
    .filter(item => item.group === comparableGroup)
    .sort((a, b) => a.session.date.localeCompare(b.session.date));
  const excluded = records.filter(item => !item.group || item.group !== comparableGroup);
  if (!comparableGroup || points.length < 2) {
    return '<div class="recording-warning"><p>Χρειάζονται τουλάχιστον δύο καταγραφές της άσκησης με συγκρίσιμη μονάδα βάρους.</p></div>';
  }

  const height = 340;
  const rail = 64;
  const right = 28;
  const top = 28;
  const bottom = 76;
  // Κάθε προπόνηση κρατά το ίδιο χαρτί, όσες κι αν μαζευτούν: 78 μονάδες είναι το
  // βήμα στο οποίο τυπώνεται ολόκληρη η ετικέτα «6 → 10 επαναλήψεις» και η κουκκίδα
  // παραμένει στόχος αφής. Ό,τι δεν χωράει, το φτάνει η οριζόντια κύλιση.
  const minStep = 78;
  const visibleWidth = Math.max(panelWidth, 320);
  const paperWidth = rail + right + (points.length - 1) * minStep;
  const scrolls = paperWidth > visibleWidth;
  // Όταν το χαρτί κυλάει, ο άξονας των κιλών βγαίνει από αυτό και καρφώνεται δίπλα του,
  // αλλιώς θα έφευγε με την πρώτη κίνηση. Στο χαρτί μένει τόσο περιθώριο όσο χρειάζεται
  // η πλάγια ημερομηνία της πρώτης προπόνησης.
  const left = scrolls ? 36 : rail;
  const width = scrolls ? left + right + (points.length - 1) * minStep : visibleWidth;
  const plateStep = displayWeight(5);
  const chartValue = item =>
    comparableGroup === 'plates' && item.extraWeight > 0
      ? item.value + Math.min(item.extraWeight / plateStep, .95)
      : item.value;
  const values = points.map(chartValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const floor = min === max ? Math.max(0, min - 1) : Math.max(0, min - (max - min) * .15);
  const ceiling = min === max ? max + 1 : max + (max - min) * .15;
  const repValues = points.map(item => item.reps);
  const repMin = Math.min(...repValues);
  const repMax = Math.max(...repValues);
  const repFloor = repMin === repMax ? Math.max(0, repMin - 1) : repMin - .5;
  const repCeiling = repMin === repMax ? repMax + 1 : repMax + .5;
  const xStep = (width - left - right) / Math.max(points.length - 1, 1);
  const x = index => left + index * xStep;
  const y = value => top + (ceiling - value) / (ceiling - floor) * (height - top - bottom);
  const repY = value => top + (repCeiling - value) / (repCeiling - repFloor) * (height - top - bottom);
  const primaryUnit = comparableGroup === 'kg'
    ? weightSymbol
    : comparableGroup === 'plates'
      ? 'πλάκες'
      : points.some(item => item.value > 0)
        ? `extra ${weightSymbol}`
        : null;
  const linePoints = points.map((item, index) => ({ x:x(index), y:y(chartValue(item)) }));
  const mainPoints = primaryUnit
    ? linePoints
    : points.map((item, index) => ({ x:x(index), y:repY(item.reps) }));
  const smoothLine = smoothPath(mainPoints);
  const exerciseName = points[0]?.session?.exercises?.find(item => identityKey(item) === exerciseKey)?.exercise || '';
  const pointLabel = (item, { fullReps = false } = {}) => {
    const repsUnit = fullReps ? 'επαναλήψεις' : 'επαν.';
    if (comparableGroup === 'bodyweight') {
      return item.value > 0
        ? `Σωματικό βάρος + ${item.value} ${weightSymbol} · ${item.reps} ${repsUnit}`
        : `Σωματικό βάρος · ${item.reps} ${repsUnit}`;
    }
    if (comparableGroup === 'plates') {
      return `${item.value} πλάκες${item.extraWeight > 0 ? ` + ${item.extraWeight} ${weightSymbol}` : ''} · ${item.reps} ${repsUnit}`;
    }
    return `${item.value} ${primaryUnit} · ${item.reps} ${repsUnit}`;
  };
  const cycleBrackets = !primaryUnit ? '' : (() => {
    const sameLoad = (first, second) =>
      first.value === second.value
      && (comparableGroup !== 'plates' || first.extraWeight === second.extraWeight);
    const runs = [];
    for (let start = 0, index = 1; index <= points.length; index += 1) {
      if (index === points.length || !sameLoad(points[index], points[start])) {
        if (index - start > 1) runs.push([start, index - 1]);
        start = index;
      }
    }
    const centers = runs.map(([start, end]) => (x(start) + x(end)) / 2);
    // Πλάτος που αντέχει μια κεντραρισμένη ετικέτα: όσο απέχει από τη γειτονική της
    // και όσο επιτρέπουν τα άκρα του SVG.
    const labelRoom = index => {
      const center = centers[index];
      const limits = [center * 2, (width - center) * 2];
      if (index > 0) limits.push(center - centers[index - 1]);
      if (index < centers.length - 1) limits.push(centers[index + 1] - center);
      return Math.max(0, Math.min(...limits) - 8);
    };
    return runs.map(([start, end], index) => {
      const x1 = x(start);
      const x2 = x(end);
      const pointY = y(chartValue(points[start]));
      const below = pointY <= height - bottom - 49;
      const bracketY = below ? pointY + 26 : pointY - 26;
      const tickDirection = below ? -6 : 6;
      const labelY = below ? bracketY + 17 : bracketY - 10;
      const fromReps = points[start].reps;
      const toReps = points[end].reps;
      const repsText = fromReps === toReps ? `${fromReps}` : `${fromReps} → ${toReps}`;
      const center = (x1 + x2) / 2;
      // Η ετικέτα δεν κρύβεται ποτέ· όταν στενεύει ο χώρος πέφτει στη σύντομη μορφή («6→10»).
      const spelled = x2 - x1 >= 64 || labelRoom(index) >= (repsText.length + 12) * 5.4;
      const label = spelled
        ? `<text class="cycle-label" x="${center}" y="${labelY}" text-anchor="middle">${repsText} <tspan>επαναλήψεις</tspan></text>`
        : `<text class="cycle-label is-compact" x="${center}" y="${labelY}" text-anchor="middle">${repsText.replace(/ /g, '')}</text>`;
      return `<path class="cycle-bracket" d="M ${x1} ${bracketY + tickDirection} L ${x1} ${bracketY} L ${x2} ${bracketY} L ${x2} ${bracketY + tickDirection}"/>${label}`;
    }).join('');
  })();
  const axisDate = date => localDate(date).toLocaleDateString(locale, { day:'numeric', month:'short' });
  const latestLoad = pointLabel(points.at(-1), { fullReps:true });
  const scaleFloor = primaryUnit ? floor : repFloor;
  const scaleCeiling = primaryUnit ? ceiling : repCeiling;
  const scaleY = primaryUnit ? y : repY;
  const ticks = Array.from({ length:5 }, (_, index) => {
    const tickValue = scaleFloor + (scaleCeiling - scaleFloor) * index / 4;
    return { label:Number(tickValue.toFixed(1)), y:scaleY(tickValue) };
  });
  const tickText = (x, tick) => `<text x="${x}" y="${tick.y + 4}" text-anchor="end" class="chart-tick">${tick.label}</text>`;
  const gridMarkup = ticks
    .map(tick => `<line x1="${left}" y1="${tick.y}" x2="${width - right}" y2="${tick.y}" class="chart-grid"/>${scrolls ? '' : tickText(left - 12, tick)}`)
    .join('');
  const railMarkup = scrolls
    ? `<svg class="chart-rail" width="${rail}" height="${height}" viewBox="0 0 ${rail} ${height}" aria-hidden="true">${ticks.map(tick => tickText(rail - 13, tick)).join('')}<line x1="${rail - 1}" y1="${top}" x2="${rail - 1}" y2="${height - bottom}" class="chart-rail-edge"/></svg>`
    : '';
  const pointsMarkup = points.map((item, index) => {
    const pointY = primaryUnit ? y(chartValue(item)) : repY(item.reps);
    const tipLabel = pointLabel(item);
    const tipDate = formatDate(item.session.date);
    const tooltipWidth = Math.max(120, Math.round(Math.max(tipLabel.length, tipDate.length) * 6.6) + 26);
    const tooltipX = Math.max(8, Math.min(width - tooltipWidth - 8, x(index) - tooltipWidth / 2));
    const tooltipY = Math.max(8, pointY - 64);
    const dateY = height - bottom + 18;
    return `<g class="chart-point" tabindex="0"><title>${escapeHtml(tipLabel)} · ${escapeHtml(tipDate)}</title><line x1="${x(index)}" y1="${pointY}" x2="${x(index)}" y2="${height - bottom}" class="chart-guide"/><circle cx="${x(index)}" cy="${pointY}" r="7" class="chart-dot"/><g class="chart-tooltip-card" transform="translate(${tooltipX} ${tooltipY})" aria-hidden="true"><rect width="${tooltipWidth}" height="48" rx="5"/><text x="${tooltipWidth / 2}" y="18" text-anchor="middle"><tspan x="${tooltipWidth / 2}" dy="0">${escapeHtml(tipLabel)}</tspan><tspan x="${tooltipWidth / 2}" dy="17">${escapeHtml(tipDate)}</tspan></text></g><text x="${x(index)}" y="${dateY}" transform="rotate(-38 ${x(index)} ${dateY})" text-anchor="end" class="chart-date">${escapeHtml(axisDate(item.session.date))}</text></g>`;
  }).join('');
  const modeLabel = mode =>
    mode === 'kg'
      ? 'κιλά'
      : mode === 'plates'
        ? 'πλάκες'
        : mode === 'mixed'
          ? 'πλάκες + κιλά'
          : mode === 'bodyweight_extra'
            ? 'σωματικό βάρος + κιλά'
            : 'σωματικό βάρος';
  const groupLabel = group => group === 'kg' ? 'κιλά' : group === 'plates' ? 'πλάκες / πλάκες + κιλά' : 'σωματικό βάρος';
  const warning = excluded.length
    ? `<div class="recording-warning"><strong>Έλεγχος καταγραφής: ${excluded.length} ${excluded.length === 1 ? 'προπόνηση εξαιρέθηκε' : 'προπονήσεις εξαιρέθηκαν'}.</strong><p>Το γράφημα χρησιμοποιεί μόνο «${groupLabel(comparableGroup)}». ${excluded.map(item => `${escapeHtml(formatDate(item.session.date))} — ${escapeHtml(item.reason || `καταγράφηκε σε ${modeLabel(item.mode)}`)}`).join(' · ')}</p></div>`
    : '';

  return `<div class="chart-summary"><div><h2>${escapeHtml(exerciseName)}</h2><small>${points.length} καταγραφές</small></div><div class="chart-latest"><span>ΤΕΛΕΥΤΑΙΑ ΕΠΙΔΟΣΗ</span><strong>${escapeHtml(latestLoad)}</strong></div></div><div class="chart-legend"><span class="weight-key">${escapeHtml(primaryUnit || 'Επαναλήψεις')}</span></div><div class="chart-frame">${railMarkup}<div class="chart-wrap${scrolls ? ' is-scrollable' : ''}"${scrolls ? ' tabindex="0" role="region" aria-label="Γράφημα προόδου, κυλάει οριζόντια"' : ''}><svg class="progress-chart" viewBox="0 0 ${width} ${height}"${scrolls ? ` width="${width}" height="${height}"` : ''} role="img" aria-label="Γράφημα προόδου βάρους και επαναλήψεων">${gridMarkup}<line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" class="chart-axis"/><path d="${smoothLine}" class="chart-line"/>${cycleBrackets}${pointsMarkup}</svg></div></div>${warning}`;
}
