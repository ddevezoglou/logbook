(() => {
  const DATA_KEYS = [
    'trainingRoutines',
    'trainingSessions',
    'userProfile',
    'routineRewardTracking',
    'homeProfileCardPosition',
    'homeRoutineCardPosition',
    'logbookLanguage',
  ];
  const ARRAY_KEYS = new Set(['trainingRoutines', 'trainingSessions']);
  const META_PREFIX = 'logbookCloudMeta:';
  const CACHE_PREFIX = 'logbookCloudCache:';
  const OWNER_KEY = 'logbookCloudOwner';
  const SYNC_DELAY = 700;
  let client = null;
  let userId = null;
  let syncTimer = null;
  let syncPromise = null;
  let pendingSync = false;
  let initialSyncUserId = null;

  function setStatus(message, kind = 'neutral') {
    window.dispatchEvent(new CustomEvent('logbook:sync-status', { detail:{ message, kind } }));
  }

  function readJsonStorage(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function normalizePayload(value = {}) {
    const payload = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      trainingRoutines:Array.isArray(payload.trainingRoutines) ? payload.trainingRoutines : [],
      trainingSessions:Array.isArray(payload.trainingSessions) ? payload.trainingSessions : [],
      userProfile:payload.userProfile && typeof payload.userProfile === 'object' && !Array.isArray(payload.userProfile) ? payload.userProfile : null,
      routineRewardTracking:payload.routineRewardTracking && typeof payload.routineRewardTracking === 'object' && !Array.isArray(payload.routineRewardTracking) ? payload.routineRewardTracking : null,
      homeProfileCardPosition:payload.homeProfileCardPosition && typeof payload.homeProfileCardPosition === 'object' && !Array.isArray(payload.homeProfileCardPosition) ? payload.homeProfileCardPosition : null,
      homeRoutineCardPosition:payload.homeRoutineCardPosition && typeof payload.homeRoutineCardPosition === 'object' && !Array.isArray(payload.homeRoutineCardPosition) ? payload.homeRoutineCardPosition : null,
      logbookLanguage:['el', 'en', 'fr', 'de'].includes(payload.logbookLanguage) ? payload.logbookLanguage : 'el',
    };
  }

  function collectLocalPayload() {
    const payload = {};
    DATA_KEYS.forEach(key => {
      if (key === 'logbookLanguage') {
        payload[key] = localStorage.getItem(key) || 'el';
      } else {
        payload[key] = readJsonStorage(key, ARRAY_KEYS.has(key) ? [] : null);
      }
    });
    return normalizePayload(payload);
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function payloadHash(payload) {
    const input = stableStringify(normalizePayload(payload));
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function hasMeaningfulData(payload) {
    const data = normalizePayload(payload);
    if (data.trainingSessions.length || data.userProfile || data.trainingRoutines.length > 1) return true;
    const routine = data.trainingRoutines[0];
    if (!routine) return false;
    const defaultNames = new Set(['Το πρόγραμμά μου', 'Πρόγραμμα 1']);
    return Boolean(routine.plan?.length || (routine.name && !defaultNames.has(routine.name)));
  }

  function mergeCollection(remoteItems, localItems, resolveConflict = null) {
    const merged = new Map();
    (Array.isArray(remoteItems) ? remoteItems : []).forEach(item => {
      if (item?.id !== undefined && item?.id !== null) merged.set(String(item.id), item);
    });
    (Array.isArray(localItems) ? localItems : []).forEach(item => {
      if (item?.id === undefined || item?.id === null) return;
      const key = String(item.id);
      const existing = merged.get(key);
      merged.set(key, existing && resolveConflict ? resolveConflict(existing, item) : item);
    });
    return [...merged.values()];
  }

  // A copy of a routine that lost its plan must never overwrite the copy that
  // still has it: rewards and the plan board both die with an emptied plan.
  function resolveRoutineConflict(remoteRoutine, localRoutine) {
    if (!localRoutine.plan?.length && remoteRoutine.plan?.length) return remoteRoutine;
    return localRoutine;
  }

  function isEmptyPlaceholder(routine, sessions) {
    if (!routine) return false;
    const defaultNames = new Set(['Το πρόγραμμά μου', 'Πρόγραμμα 1']);
    const hasSessions = sessions.some(session => session?.routineId != null && String(session.routineId) === String(routine.id));
    return defaultNames.has(routine.name) && !routine.plan?.length && !hasSessions;
  }

  function mergePayloads(remotePayload, localPayload) {
    const remote = normalizePayload(remotePayload);
    const local = normalizePayload(localPayload);
    const routines = mergeCollection(remote.trainingRoutines, local.trainingRoutines, resolveRoutineConflict);
    const localActiveRoutine = local.trainingRoutines.find(item => item?.isActive);
    const localActive = localActiveRoutine?.id;
    const remoteActive = remote.trainingRoutines.find(item => item?.isActive)?.id;
    const activeId = isEmptyPlaceholder(localActiveRoutine, local.trainingSessions) ? (remoteActive || localActive) : (localActive || remoteActive);
    if (activeId) routines.forEach(routine => { routine.isActive = String(routine.id) === String(activeId); });
    return normalizePayload({
      trainingRoutines:routines,
      trainingSessions:mergeCollection(remote.trainingSessions, local.trainingSessions),
      userProfile:local.userProfile || remote.userProfile,
      routineRewardTracking:local.routineRewardTracking || remote.routineRewardTracking,
      homeProfileCardPosition:local.homeProfileCardPosition || remote.homeProfileCardPosition,
      homeRoutineCardPosition:local.homeRoutineCardPosition || remote.homeRoutineCardPosition,
      logbookLanguage:local.logbookLanguage || remote.logbookLanguage,
    });
  }

  function applyPayload(payload) {
    const data = normalizePayload(payload);
    DATA_KEYS.forEach(key => {
      const value = data[key];
      if (key === 'logbookLanguage') {
        localStorage.setItem(key, value);
      } else if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
  }

  function readMeta(id) {
    const meta = readJsonStorage(`${META_PREFIX}${id}`, null);
    return meta && Number.isInteger(Number(meta.revision)) && meta.hash ? meta : null;
  }

  function writeMeta(id, remote) {
    const payload = normalizePayload(remote.payload);
    const meta = { revision:Number(remote.revision), hash:payloadHash(payload), syncedAt:new Date().toISOString() };
    localStorage.setItem(`${META_PREFIX}${id}`, JSON.stringify(meta));
    try { localStorage.setItem(`${CACHE_PREFIX}${id}`, JSON.stringify(payload)); } catch { /* cache is optional */ }
    localStorage.setItem(OWNER_KEY, id);
    return meta;
  }

  async function fetchRemote(id) {
    const { data, error } = await client
      .from('user_sync_state')
      .select('revision,payload,updated_at')
      .eq('user_id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function insertRemote(id, payload) {
    const { data, error } = await client
      .from('user_sync_state')
      .insert({ user_id:id, payload:normalizePayload(payload) })
      .select('revision,payload,updated_at')
      .single();
    if (error) throw error;
    return data;
  }

  async function updateRemote(id, payload, expectedRevision) {
    const { data, error } = await client
      .from('user_sync_state')
      .update({ payload:normalizePayload(payload) })
      .eq('user_id', id)
      .eq('revision', expectedRevision)
      .select('revision,payload,updated_at')
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function saveWithConflictRetry(id, payload, remote) {
    if (!remote) {
      try {
        return await insertRemote(id, payload);
      } catch (error) {
        if (error?.code !== '23505') throw error;
        remote = await fetchRemote(id);
      }
    }
    let saved = await updateRemote(id, payload, remote.revision);
    if (saved) return saved;
    const latest = await fetchRemote(id);
    if (!latest) return insertRemote(id, payload);
    const merged = mergePayloads(latest.payload, payload);
    saved = await updateRemote(id, merged, latest.revision);
    if (!saved) throw new Error('SYNC_CONFLICT');
    return saved;
  }

  function announceApplied() {
    setTimeout(() => window.dispatchEvent(new CustomEvent('logbook:cloud-data-applied')), 0);
  }

  async function performSync(id) {
    if (!client || !id || !navigator.onLine) {
      setStatus('Εκτός σύνδεσης · οι αλλαγές μένουν σε αυτή τη συσκευή.', 'offline');
      return false;
    }
    setStatus('Συγχρονισμός δεδομένων…', 'syncing');
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== id) {
      try { localStorage.setItem(`${CACHE_PREFIX}${owner}`, JSON.stringify(collectLocalPayload())); } catch { /* best effort */ }
    }
    const cached = readJsonStorage(`${CACHE_PREFIX}${id}`, null);
    const switchingUser = Boolean(owner && owner !== id);
    const local = switchingUser ? normalizePayload(cached || {}) : collectLocalPayload();
    const localHash = payloadHash(local);
    const meta = readMeta(id);
    let remote = await fetchRemote(id);
    let applied = false;

    if (!remote) {
      remote = await saveWithConflictRetry(id, local, null);
      if (switchingUser) {
        applyPayload(remote.payload);
        applied = true;
      }
    } else if (switchingUser) {
      if (cached && meta && meta.hash !== payloadHash(cached)) {
        remote = await saveWithConflictRetry(id, mergePayloads(remote.payload, cached), remote);
      }
      applied = payloadHash(collectLocalPayload()) !== payloadHash(remote.payload);
      applyPayload(remote.payload);
    } else if (!meta) {
      if (hasMeaningfulData(local)) {
        const merged = mergePayloads(remote.payload, local);
        remote = payloadHash(merged) === payloadHash(remote.payload)
          ? remote
          : await saveWithConflictRetry(id, merged, remote);
        if (payloadHash(local) !== payloadHash(remote.payload)) {
          applyPayload(remote.payload);
          applied = true;
        }
      } else {
        applyPayload(remote.payload);
        applied = localHash !== payloadHash(remote.payload);
      }
    } else if (meta.revision === Number(remote.revision)) {
      if (meta.hash !== localHash) remote = await saveWithConflictRetry(id, local, remote);
    } else if (meta.hash === localHash) {
      applyPayload(remote.payload);
      applied = localHash !== payloadHash(remote.payload);
    } else {
      const merged = mergePayloads(remote.payload, local);
      remote = await saveWithConflictRetry(id, merged, remote);
      if (localHash !== payloadHash(remote.payload)) {
        applyPayload(remote.payload);
        applied = true;
      }
    }

    writeMeta(id, remote);
    setStatus('Συγχρονισμένο σε όλες τις συσκευές.', 'success');
    if (applied) announceApplied();
    return true;
  }

  function synchronize({ immediate = true } = {}) {
    clearTimeout(syncTimer);
    if (!userId) return Promise.resolve();
    if (!immediate) {
      syncTimer = setTimeout(() => synchronize(), SYNC_DELAY);
      return Promise.resolve();
    }
    if (syncPromise) {
      pendingSync = true;
      return syncPromise;
    }
    const activeUser = userId;
    syncPromise = performSync(activeUser)
      .catch(error => {
        console.warn('Logbook cloud sync failed.', error);
        setStatus('Δεν ολοκληρώθηκε ο συγχρονισμός. Οι αλλαγές παραμένουν ασφαλείς στη συσκευή.', 'error');
        return false;
      })
      .finally(() => {
        syncPromise = null;
        if (pendingSync && userId === activeUser) {
          pendingSync = false;
          synchronize();
        }
      });
    return syncPromise;
  }

  function handleSession(session) {
    const nextUserId = session?.user?.id || null;
    userId = nextUserId;
    if (!userId) {
      clearTimeout(syncTimer);
      initialSyncUserId = null;
      setStatus('Τοπική αποθήκευση · συνδεθείτε για συγχρονισμό.', 'neutral');
      return;
    }
    startInitialSync(userId);
  }

  function startInitialSync(id, force = false) {
    if (!id || (!force && initialSyncUserId === id)) return;
    initialSyncUserId = id;
    synchronize().then(success => {
      if (userId !== id) return;
      if (!success) initialSyncUserId = null;
      window.dispatchEvent(new CustomEvent('logbook:initial-sync-complete', {
        detail:{ userId:id, success:Boolean(success) },
      }));
    });
  }

  async function bindClient(nextClient) {
    if (!nextClient || client === nextClient) return;
    client = nextClient;
    const { data, error } = await client.auth.getSession();
    if (error) {
      setStatus('Δεν ήταν δυνατή η εκκίνηση του συγχρονισμού.', 'error');
    } else {
      handleSession(data?.session);
    }
    client.auth.onAuthStateChange((_event, session) => handleSession(session));
  }

  window.addEventListener('logbook:supabase-ready', event => bindClient(event.detail.client));
  window.addEventListener('logbook:supabase-unavailable', () => setStatus('Cloud εκτός σύνδεσης · τα δεδομένα παραμένουν τοπικά.', 'offline'));
  window.addEventListener('logbook:initial-sync-requested', () => {
    if (userId) startInitialSync(userId, true);
  });
  window.addEventListener('logbook:local-data-changed', event => {
    if (DATA_KEYS.includes(event.detail?.key) && userId) synchronize({ immediate:false });
  });
  window.addEventListener('online', () => synchronize());
  window.addEventListener('offline', () => setStatus('Εκτός σύνδεσης · οι αλλαγές μένουν σε αυτή τη συσκευή.', 'offline'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') synchronize(); });
  window.LogbookCloudSync = Object.freeze({
    sync:() => synchronize(),
    collectLocalPayload,
    mergePayloads,
    payloadHash,
  });

  if (window.LogbookSupabase) bindClient(window.LogbookSupabase);
  else setStatus('Τοπική αποθήκευση · συνδεθείτε για συγχρονισμό.', 'neutral');
})();
