(() => {
  const record = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const deleted = value => record(value) && typeof value.deletedAt === 'string';
  const fingerprint = value => Array.isArray(value) ? `[${value.map(fingerprint).join(',')}]`
    : record(value) ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${fingerprint(value[key])}`).join(',')}}`
      : JSON.stringify(value);
  const equal = (first, second) => fingerprint(first) === fingerprint(second);
  const identified = values => values.every(value => record(value) && value.id != null);

  // Apply only changes made since base onto the latest stored/remote value.
  // Collections and plan entries use stable IDs; unkeyed set arrays stay atomic.
  function rebase(base, edited, latest, { rejectDeleted = false } = {}) {
    if (equal(base, edited)) return latest;
    if (equal(base, latest) || equal(edited, latest)) return edited;
    if (deleted(latest) || (base !== undefined && latest === undefined)) {
      if (rejectDeleted && record(base) && base.id != null && edited !== undefined && !deleted(edited)) {
        throw new Error('SYNC_RECORD_DELETED');
      }
      return latest;
    }
    if (deleted(edited) || edited === undefined) return edited;
    const baseItems = Array.isArray(base) ? base : [];
    if (Array.isArray(edited) && Array.isArray(latest) && identified([...baseItems, ...edited, ...latest])) {
      const before = new Map(baseItems.map(item => [String(item.id), item]));
      const after = new Map(edited.map(item => [String(item.id), item]));
      const current = new Map(latest.map(item => [String(item.id), item]));
      return [...new Set([...after.keys(), ...current.keys()])].map(id =>
        rebase(before.get(id), after.get(id), current.get(id), { rejectDeleted })
      ).filter(item => item !== undefined);
    }
    if (record(edited) && record(latest)) {
      const result = {};
      for (const key of new Set([...Object.keys(base || {}), ...Object.keys(edited), ...Object.keys(latest)])) {
        const value = rebase(base?.[key], edited[key], latest[key], { rejectDeleted });
        if (value !== undefined) Object.defineProperty(result, key, { value, enumerable:true, writable:true, configurable:true });
      }
      return result;
    }
    return edited;
  }
  function routines(base = [], edited = [], latest = [], options) {
    const merged = rebase(base, edited, latest, options).map(item => ({ ...item }));
    const active = items => items.find(item => !deleted(item) && item.isActive)?.id;
    const editedActive = active(edited), latestActive = active(latest);
    const preferred = String(editedActive) !== String(active(base)) ? editedActive : latestActive;
    const candidates = [preferred, latestActive, editedActive, merged.find(item => !deleted(item))?.id];
    const chosen = candidates.find(id => id != null && merged.some(item => !deleted(item) && String(item.id) === String(id)));
    if (chosen != null) merged.forEach(item => { if (!deleted(item)) item.isActive = String(item.id) === String(chosen); });
    return merged;
  }
  function payload(base, edited, latest) {
    return { ...rebase(base, edited, latest), trainingRoutines:routines(base.trainingRoutines, edited.trainingRoutines, latest.trainingRoutines) };
  }
  window.LogbookDataReconciliation = Object.freeze({ rebase, routines, payload, equal });
})();
