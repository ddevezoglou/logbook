import { DAYS } from './routines.js';

export const KG_TO_LBS = 2.2046226218;
export const WEIGHT_MODES = Object.freeze(['kg','plates','mixed','bodyweight','bodyweight_extra']);

export const localDateInputValue = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export const localDate = date => date ? new Date(`${date}T12:00:00`) : null;
export const dayForDate = date => date ? DAYS[localDate(date).getDay()] : 'Χωρίς ημέρα';

export const profileWeightUnit = profile => profile?.weightUnit === 'lbs' ? 'lbs' : 'kg';
export const weightUnitName = unit => unit === 'lbs' ? 'Λίβρες' : 'Κιλά';
export const weightUnitSymbol = unit => unit === 'lbs' ? 'lbs' : 'kg';

export const nonNegativeNumber = (value, { integer = false } = {}) => {
  if (!['number','string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && (!integer || Number.isInteger(number)) ? number : null;
};

export const numericInputValue = (value, options) => {
  const number = nonNegativeNumber(value, options);
  return number === null ? '' : String(number);
};

export const inferredWeightMode = value => {
  const plates = nonNegativeNumber(value.plates, { integer:true });
  const weight = nonNegativeNumber(value.weight);
  return plates !== null ? (weight !== null ? 'mixed' : 'plates') : 'kg';
};

export const safeWeightMode = value => WEIGHT_MODES.includes(value) ? value : null;
export const roundWeight = value => Number(Number(value).toFixed(6));
export const formatWeightDisplay = value => Number(Number(value).toFixed(2));

export const storedWeightToDisplay = (value, unit = 'kg') => {
  const stored = nonNegativeNumber(value);
  if (stored === null) return '';
  const converted = unit === 'lbs' ? stored * KG_TO_LBS : stored;
  return formatWeightDisplay(converted);
};

export const inputWeightToStored = (value, unit = 'kg') => {
  const entered = nonNegativeNumber(value);
  if (entered === null) return null;
  return roundWeight(unit === 'lbs' ? entered / KG_TO_LBS : entered);
};

export const weightModeSourceLabel = (mode, unit = 'kg') => ({
  kg:weightUnitName(unit),
  plates:'Πλάκες',
  mixed:`Πλάκες+${weightUnitName(unit)}`,
  bodyweight:'Bodyweight',
  bodyweight_extra:`Bodyweight+${weightUnitName(unit)}`,
}[mode] || mode);

export const csvEscape = value => {
  const raw = String(value ?? '');
  const safe = /^[\t\r]|^\s*[=+@-]/.test(raw) ? `'${raw}` : raw;
  return /["\r\n,;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
