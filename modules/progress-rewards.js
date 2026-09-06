export const normalizedName = value =>
  String(value || '').trim().toLocaleLowerCase('el-GR').replace(/\s+/g, ' ');

export const weightModeGroup = mode =>
  mode === 'kg' ? 'kg' : ['plates','mixed'].includes(mode) ? 'plates' : 'bodyweight';

export const performanceScore = set =>
  set.weightMode === 'bodyweight'
    ? [Number(set.reps) || 0]
    : set.weightMode === 'mixed'
      ? [Number(set.plates) || 0, Number(set.weight) || 0, Number(set.reps) || 0]
      : set.weightMode === 'plates'
        ? [Number(set.plates) || 0, Number(set.reps) || 0]
        : [Number(set.weight) || 0, Number(set.reps) || 0];

export const isBetterPerformance = (candidate, current) => {
  if (!current) return true;
  const candidateScore = performanceScore(candidate);
  const currentScore = performanceScore(current);
  return candidateScore.some((value, index) =>
    value !== currentScore[index]
    && candidateScore.slice(0, index).every((prior, priorIndex) => prior === currentScore[priorIndex])
    && value > currentScore[index]);
};

export const smoothPath = series => {
  if (series.length < 2) return '';
  const count = series.length;
  const gaps = [];
  const slopes = [];
  const tangents = new Array(count);
  for (let index = 0; index < count - 1; index += 1) {
    gaps.push(series[index + 1].x - series[index].x);
    slopes.push((series[index + 1].y - series[index].y) / (gaps[index] || 1));
  }
  tangents[0] = slopes[0];
  tangents[count - 1] = slopes[count - 2];
  for (let index = 1; index < count - 1; index += 1) {
    tangents[index] = slopes[index - 1] * slopes[index] <= 0
      ? 0
      : (slopes[index - 1] + slopes[index]) / 2;
  }
  for (let index = 0; index < count - 1; index += 1) {
    if (slopes[index] === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }
    const first = tangents[index] / slopes[index];
    const second = tangents[index + 1] / slopes[index];
    const size = first * first + second * second;
    if (size > 9) {
      const scale = 3 / Math.sqrt(size);
      tangents[index] = scale * first * slopes[index];
      tangents[index + 1] = scale * second * slopes[index];
    }
  }
  return `M ${series[0].x} ${series[0].y} ${series.slice(1).map((point, index) => {
    const previous = series[index];
    const third = gaps[index] / 3;
    return `C ${previous.x + third} ${previous.y + third * tangents[index]} ${point.x - third} ${point.y - third * tangents[index + 1]} ${point.x} ${point.y}`;
  }).join(' ')}`;
};
