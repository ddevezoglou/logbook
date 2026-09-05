(() => {
  const DATA_KEYS = [
    'trainingExercises',
    'trainingRoutines',
    'trainingSessions',
    'userProfile',
    'routineRewardTracking',
    'homeProfileCardPosition',
    'homeRoutineCardPosition',
    'logbookLanguage',
  ];
  const ARRAY_KEYS = new Set(['trainingExercises', 'trainingRoutines', 'trainingSessions']);
  const META_PREFIX = 'logbookCloudMeta:';
  const CACHE_PREFIX = 'logbookCloudCache:';
  const OWNER_KEY = 'logbookCloudOwner';
  const GUEST_KEY = 'logbookGuest';
  const GUEST_IMPORT_KEY = 'logbookGuestImportPending';
  const SYNC_DELAY = 700;
  const REQUEST_TIMEOUT_MS = 15000;
  const WEIGHT_MODES = new Set(['kg', 'plates', 'mixed', 'bodyweight', 'bodyweight_extra']);
  const PROFILE_AVATARS = new Set(['custom', 'male', 'female']);
  const PROFILE_WEIGHT_UNITS = new Set(['kg', 'lbs']);
  const MAX_SYNC_AVATAR_DATA_URL_LENGTH = 512 * 1024;
  const LEGACY_PLACEHOLDER_NAMES = new Set(['Το πρόγραμμά μου', 'Πρόγραμμα 1']);
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

  const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

  function normalizeDeletedRecord(value) {
    if (!isRecord(value) || value.id === undefined || value.id === null || typeof value.deletedAt !== 'string') return null;
    const deletedAt = new Date(value.deletedAt);
    return Number.isFinite(deletedAt.getTime()) ? { id:value.id, deletedAt:deletedAt.toISOString() } : null;
  }

  const isDeletedRecord = value => Boolean(normalizeDeletedRecord(value));

  function normalizeNumber(value, { integer = false } = {}) {
    if (value === null || value === undefined || !['number','string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && (!integer || Number.isInteger(number)) ? number : null;
  }

  function normalizeTextFields(value, fields) {
    const normalized = { ...value };
    fields.forEach(field => {
      if (hasOwn(normalized, field) && typeof normalized[field] !== 'string') normalized[field] = '';
    });
    return normalized;
  }

  function normalizeSet(value) {
    if (!isRecord(value)) return null;
    const set = { ...value };
    if (hasOwn(set, 'reps')) set.reps = normalizeNumber(set.reps, { integer:true });
    if (hasOwn(set, 'plates')) set.plates = normalizeNumber(set.plates, { integer:true });
    if (hasOwn(set, 'weight')) set.weight = normalizeNumber(set.weight);
    if (hasOwn(set, 'weightMode') && !WEIGHT_MODES.has(set.weightMode)) set.weightMode = 'kg';
    return set;
  }

  function normalizeExercise(value) {
    if (!isRecord(value)) return null;
    const exercise = normalizeTextFields(value, ['exercise', 'comments', 'cues']);
    exercise.sets = Array.isArray(value.sets) ? value.sets.map(normalizeSet).filter(Boolean) : [];
    return exercise;
  }

  function normalizeSession(value) {
    if (!isRecord(value)) return null;
    const deleted = normalizeDeletedRecord(value);
    if (deleted) return deleted;
    const session = normalizeTextFields(value, ['date', 'type', 'workoutDay', 'workoutName', 'comments']);
    session.exercises = Array.isArray(value.exercises) ? value.exercises.map(normalizeExercise).filter(Boolean) : [];
    return session;
  }

  function normalizePlanItem(value) {
    if (!isRecord(value)) return null;
    const item = normalizeTextFields(value, ['day', 'workoutName', 'exercise', 'cues', 'comments']);
    if (Array.isArray(value.sets)) item.sets = value.sets.map(normalizeSet).filter(Boolean);
    if (hasOwn(item, 'workSets')) {
      const workSets = normalizeNumber(item.workSets, { integer:true });
      item.workSets = workSets !== null && workSets >= 1 && workSets <= 20 ? workSets : 3;
    }
    return item;
  }

  function normalizeRoutine(value) {
    if (!isRecord(value)) return null;
    const deleted = normalizeDeletedRecord(value);
    if (deleted) return deleted;
    const routine = normalizeTextFields(value, ['name', 'cycleAnchorDate']);
    routine.plan = Array.isArray(value.plan) ? value.plan.map(normalizePlanItem).filter(Boolean) : [];
    routine.isPlaceholder = typeof value.isPlaceholder === 'boolean'
      ? value.isPlaceholder
      : LEGACY_PLACEHOLDER_NAMES.has(routine.name) && !routine.plan.length;
    return routine;
  }

  function normalizeProfile(value) {
    if (!isRecord(value)) return null;
    const profile = {};
    if (typeof value.name === 'string') profile.name = value.name.trim().slice(0, 50);
    if (typeof value.birthdate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.birthdate)) profile.birthdate = value.birthdate;
    if (typeof value.hideAge === 'boolean') profile.hideAge = value.hideAge;
    const weight = normalizeNumber(value.weight);
    if (weight !== null && weight <= 1000) profile.weight = weight;
    if (PROFILE_WEIGHT_UNITS.has(value.weightUnit)) profile.weightUnit = value.weightUnit;
    if (PROFILE_AVATARS.has(value.avatar)) profile.avatar = value.avatar;
    if (value.customImage === '') {
      profile.customImage = '';
    } else if (
      typeof value.customImage === 'string'
      && value.customImage.length <= MAX_SYNC_AVATAR_DATA_URL_LENGTH
      && /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(value.customImage)
    ) {
      profile.customImage = value.customImage;
    }
    // A profile whose every allowlisted field is missing or empty is not
    // content. Returning {} made it truthy, which blinded the empty cloud
    // snapshot guard and asked the guest to resolve a merge over nothing.
    return Object.values(profile).some(entry => entry !== '' && entry !== false) ? profile : null;
  }

  function normalizePayload(value = {}) {
    const payload = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      trainingExercises:Array.isArray(payload.trainingExercises) ? payload.trainingExercises.filter(item => isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string').map(item => ({ ...item, aliases:Array.isArray(item.aliases) ? item.aliases.filter(alias => typeof alias === 'string') : [] })) : [],
      trainingRoutines:Array.isArray(payload.trainingRoutines) ? payload.trainingRoutines.map(normalizeRoutine).filter(Boolean) : [],
      trainingSessions:Array.isArray(payload.trainingSessions) ? payload.trainingSessions.map(normalizeSession).filter(Boolean) : [],
      userProfile:normalizeProfile(payload.userProfile),
      routineRewardTracking:payload.routineRewardTracking && typeof payload.routineRewardTracking === 'object' && !Array.isArray(payload.routineRewardTracking) ? payload.routineRewardTracking : null,
      homeProfileCardPosition:payload.homeProfileCardPosition && typeof payload.homeProfileCardPosition === 'object' && !Array.isArray(payload.homeProfileCardPosition) ? payload.homeProfileCardPosition : null,
      homeRoutineCardPosition:payload.homeRoutineCardPosition && typeof payload.homeRoutineCardPosition === 'object' && !Array.isArray(payload.homeRoutineCardPosition) ? payload.homeRoutineCardPosition : null,
      logbookLanguage:['el', 'en', 'fr', 'de'].includes(payload.logbookLanguage) ? payload.logbookLanguage : 'el',
    };
  }

  function profileForLocalStorage(profile, preserveLocalGallery) {
    if (!profile) return null;
    const localProfile = preserveLocalGallery ? readJsonStorage('userProfile', null) : null;
    const gallery = Array.isArray(localProfile?.imageGallery)
      ? localProfile.imageGallery.filter(image => typeof image === 'string' && image)
      : [];
    if (profile.customImage && !gallery.includes(profile.customImage)) gallery.unshift(profile.customImage);
    return gallery.length ? { ...profile, imageGallery:gallery.slice(0, 6) } : profile;
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

  // This hash is the only judge of whether a payload changed, so a collision is
  // not an error the user ever sees: it is a change that is silently never
  // written. Two independent lanes — different basis, different odd multiplier —
  // widen the fingerprint to 64 bit. A meta hash written by an older 32 bit
  // client simply compares unequal and costs one harmless re-upload of the data
  // already on the device.
  const HASH_LANES = [
    { basis:0x811c9dc5, prime:0x01000193 },
    { basis:0x9e3779b1, prime:0x5bd1e995 },
  ];

  function payloadHash(payload) {
    const input = stableStringify(normalizePayload(payload));
    return HASH_LANES.map(({ basis, prime }) => {
      let hash = basis;
      for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, prime);
      }
      return (hash >>> 0).toString(16).padStart(8, '0');
    }).join('');
  }

  function hasMeaningfulData(payload) {
    const data = normalizePayload(payload);
    const sessions = data.trainingSessions.filter(item => !isDeletedRecord(item));
    const routines = data.trainingRoutines.filter(item => !isDeletedRecord(item));
    if (data.trainingExercises.length || sessions.length || data.userProfile || routines.length > 1) return true;
    const routine = routines[0];
    if (!routine) return false;
    return Boolean(routine.plan?.length || !routine.isPlaceholder);
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
      if (!existing) {
        merged.set(key, item);
        return;
      }
      const remoteDeleted = normalizeDeletedRecord(existing);
      const localDeleted = normalizeDeletedRecord(item);
      if (remoteDeleted || localDeleted) {
        if (!remoteDeleted) merged.set(key, localDeleted);
        else if (!localDeleted) merged.set(key, remoteDeleted);
        else merged.set(key, remoteDeleted.deletedAt >= localDeleted.deletedAt ? remoteDeleted : localDeleted);
        return;
      }
      merged.set(key, resolveConflict ? resolveConflict(existing, item) : item);
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
    const hasSessions = sessions.some(session => session?.routineId != null && String(session.routineId) === String(routine.id));
    return routine.isPlaceholder && !routine.plan?.length && !hasSessions;
  }

  function mergePayloads(remotePayload, localPayload) {
    const remote = normalizePayload(remotePayload);
    const local = normalizePayload(localPayload);
    const routines = mergeCollection(remote.trainingRoutines, local.trainingRoutines, resolveRoutineConflict);
    const localActiveRoutine = local.trainingRoutines.find(item => !isDeletedRecord(item) && item?.isActive);
    const localActive = localActiveRoutine?.id;
    const remoteActive = remote.trainingRoutines.find(item => !isDeletedRecord(item) && item?.isActive)?.id;
    const liveRoutineIds = new Set(routines.filter(item => !isDeletedRecord(item)).map(item => String(item.id)));
    const preferredActive = isEmptyPlaceholder(localActiveRoutine, local.trainingSessions) ? (remoteActive || localActive) : (localActive || remoteActive);
    const activeId = liveRoutineIds.has(String(preferredActive))
      ? preferredActive
      : [remoteActive, localActive, routines.find(item => !isDeletedRecord(item))?.id].find(candidate => liveRoutineIds.has(String(candidate)));
    if (activeId) routines.forEach(routine => {
      if (!isDeletedRecord(routine)) routine.isActive = String(routine.id) === String(activeId);
    });
    return normalizePayload({
      trainingExercises:mergeCollection(remote.trainingExercises, local.trainingExercises, resolveExerciseConflict),
      trainingRoutines:routines,
      trainingSessions:mergeCollection(remote.trainingSessions, local.trainingSessions),
      userProfile:local.userProfile || remote.userProfile,
      routineRewardTracking:local.routineRewardTracking || remote.routineRewardTracking,
      homeProfileCardPosition:local.homeProfileCardPosition || remote.homeProfileCardPosition,
      homeRoutineCardPosition:local.homeRoutineCardPosition || remote.homeRoutineCardPosition,
      logbookLanguage:local.logbookLanguage || remote.logbookLanguage,
    });
  }

  function applyPayload(payload, { preserveLocalGallery = true } = {}) {
    const data = normalizePayload(payload);
    DATA_KEYS.forEach(key => {
      const value = key === 'userProfile'
        ? profileForLocalStorage(data[key], preserveLocalGallery)
        : data[key];
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

  async function requestWithTimeout(run) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const result = await run(controller.signal);
      if (controller.signal.aborted) throw new Error('SYNC_TIMEOUT');
      return result;
    } catch (error) {
      if (!controller.signal.aborted) throw error;
      const timeoutError = new Error('SYNC_TIMEOUT');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    } finally {
      clearTimeout(timeout);
    }
  }

  function resolveExerciseConflict(remote, local) {
    const winner = (remote.updatedAt || '') > (local.updatedAt || '') ? remote
      : (remote.updatedAt || '') < (local.updatedAt || '') ? local
        : stableStringify(remote) > stableStringify(local) ? remote : local;
    return { ...winner, aliases:[...new Set([...(remote.aliases || []), ...(local.aliases || [])])].sort() };
  }

  function withAbortSignal(query, signal) {
    return typeof query?.abortSignal === 'function' ? query.abortSignal(signal) : query;
  }

  async function fetchRemote(id) {
    const { data, error } = await requestWithTimeout(signal => withAbortSignal(client
      .from('user_sync_state')
      .select('revision,payload,updated_at')
      .eq('user_id', id), signal)
      .maybeSingle());
    if (error) throw error;
    return data;
  }

  function isPayloadTooLargeError(error) {
    return error?.code === '23514'
      && (
        error?.constraint === 'user_sync_state_payload_size_check'
        || /user_sync_state_payload_size_check|pg_column_size\(payload\)/i.test(`${error?.message || ''} ${error?.details || ''}`)
      );
  }

  async function insertRemote(id, payload) {
    const { data, error } = await requestWithTimeout(signal => withAbortSignal(client
      .from('user_sync_state')
      .insert({ user_id:id, payload:normalizePayload(payload) })
      .select('revision,payload,updated_at'), signal)
      .single());
    if (error) throw error;
    return data;
  }

  async function updateRemote(id, payload, expectedRevision) {
    const { data, error } = await requestWithTimeout(signal => withAbortSignal(client
      .from('user_sync_state')
      .update({ payload:normalizePayload(payload) })
      .eq('user_id', id)
      .eq('revision', expectedRevision)
      .select('revision,payload,updated_at'), signal)
      .maybeSingle());
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
    // A missing library on a stale device must never erase remote definitions,
    // including when its revision still matches and no conflict retry is needed.
    payload = { ...payload, trainingExercises:mergeCollection(
      normalizePayload(remote.payload).trainingExercises,
      normalizePayload(payload).trainingExercises,
      resolveExerciseConflict
    ) };
    let saved = await updateRemote(id, payload, remote.revision);
    if (saved) return saved;
    const latest = await fetchRemote(id);
    if (!latest) return insertRemote(id, payload);
    const merged = mergePayloads(latest.payload, payload);
    saved = await updateRemote(id, merged, latest.revision);
    if (!saved) throw new Error('SYNC_CONFLICT');
    return { ...saved, conflictMerged:true };
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
    const guestImportPending = localStorage.getItem(GUEST_IMPORT_KEY) === '1';
    const visibleLocal = collectLocalPayload();
    if (owner && owner !== id && !guestImportPending && hasMeaningfulData(visibleLocal)) {
      try { localStorage.setItem(`${CACHE_PREFIX}${owner}`, JSON.stringify(visibleLocal)); } catch { /* best effort */ }
    }
    const cached = readJsonStorage(`${CACHE_PREFIX}${id}`, null);
    const switchingUser = Boolean(owner && owner !== id);
    const meta = readMeta(id);
    let local = switchingUser && !guestImportPending ? normalizePayload(cached || {}) : visibleLocal;
    if (!switchingUser && !guestImportPending && meta && cached && !hasMeaningfulData(visibleLocal) && hasMeaningfulData(cached)) {
      local = normalizePayload(cached);
      applyPayload(local, { preserveLocalGallery:false });
    }
    const localHash = payloadHash(local);
    let remote = await fetchRemote(id);
    let applied = false;

    if (guestImportPending) {
      const nextPayload = remote ? mergePayloads(remote.payload, local) : local;
      remote = await saveWithConflictRetry(id, nextPayload, remote);
      applyPayload(remote.payload, { preserveLocalGallery:false });
      applied = true;

      localStorage.removeItem(GUEST_IMPORT_KEY);
      localStorage.removeItem(GUEST_KEY);
      writeMeta(id, remote);
      setStatus('Συγχρονισμένο σε όλες τις συσκευές.', 'success');
      if (applied) announceApplied();
      return true;
    }

    // A completely empty cloud snapshot is never a valid replacement for a
    // device that still has workouts, a profile or a configured program. This
    // can happen after a stale web client or a partial account bootstrap writes
    // an empty payload. Recover by merging the device's last meaningful copy
    // back into the cloud before anything is applied locally.
    if (remote && hasMeaningfulData(local) && !hasMeaningfulData(remote.payload)) {
      remote = await saveWithConflictRetry(id, mergePayloads(remote.payload, local), remote);
    }

    // Old clients omit the library. Recover definitions from this owner's copy
    // even without pending local edits; keep remote session updates intact.
    if (remote && local.trainingExercises.length) {
      const remoteData = normalizePayload(remote.payload);
      const library = mergeCollection(remoteData.trainingExercises, local.trainingExercises, resolveExerciseConflict);
      if (stableStringify(library) !== stableStringify(remoteData.trainingExercises)) {
        remote = await saveWithConflictRetry(id, { ...remoteData, trainingExercises:library }, remote);
      }
    }

    if (!remote) {
      remote = await saveWithConflictRetry(id, local, null);
      if (switchingUser) {
        applyPayload(remote.payload, { preserveLocalGallery:false });
        applied = true;
      }
    } else if (switchingUser) {
      if (cached && meta && meta.hash !== payloadHash(cached)) {
        remote = await saveWithConflictRetry(id, mergePayloads(remote.payload, cached), remote);
      }
      applied = payloadHash(collectLocalPayload()) !== payloadHash(remote.payload);
      applyPayload(remote.payload, { preserveLocalGallery:false });
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

    if (remote.conflictMerged && payloadHash(collectLocalPayload()) !== payloadHash(remote.payload)) {
      applyPayload(remote.payload);
      applied = true;
    }
    // Reconcile recovered definitions without replacing unrelated edits made
    // while the request was in flight. Account switches have already applied
    // the destination account's payload above.
    const currentLibrary = collectLocalPayload().trainingExercises;
    const library = mergeCollection(normalizePayload(remote.payload).trainingExercises, currentLibrary, resolveExerciseConflict);
    if (stableStringify(library) !== stableStringify(currentLibrary)) {
      localStorage.setItem('trainingExercises', JSON.stringify(library));
      applied = true;
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
        const errorCode = error?.message === 'SYNC_CONFLICT'
          ? 'sync_conflict'
          : (!navigator.onLine || error?.name === 'TypeError' ? 'sync_network_failure' : 'sync_failure');
        window.LogbookErrorTracking?.report('sync', errorCode, error);
        setStatus(
          isPayloadTooLargeError(error)
            ? 'Τα δεδομένα είναι πολύ μεγάλα για συγχρονισμό. Αφαιρέστε παλιές φωτογραφίες ή περιττές καταχωρήσεις και δοκιμάστε ξανά.'
            : 'Δεν ολοκληρώθηκε ο συγχρονισμός. Οι αλλαγές παραμένουν ασφαλείς στη συσκευή.',
          'error'
        );
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
    if (!navigator.onLine) {
      setStatus('Εκτός σύνδεσης · οι αλλαγές μένουν σε αυτή τη συσκευή.', 'offline');
      window.dispatchEvent(new CustomEvent('logbook:initial-sync-complete', {
        detail:{ userId:id, success:true, offline:true },
      }));
      return;
    }
    synchronize().then(success => {
      if (userId !== id) return;
      if (!success) initialSyncUserId = null;
      window.dispatchEvent(new CustomEvent('logbook:initial-sync-complete', {
        detail:{
          userId:id,
          success:Boolean(success),
        },
      }));
    });
  }

  async function bindClient(nextClient) {
    if (!nextClient || client === nextClient) return;
    client = nextClient;
    const { data, error } = await client.auth.getSession();
    if (error) {
      window.LogbookErrorTracking?.report('sync', 'sync_failure', error);
      setStatus('Δεν ήταν δυνατή η εκκίνηση του συγχρονισμού.', 'error');
    } else {
      handleSession(data?.session);
    }
    client.auth.onAuthStateChange((_event, session) => handleSession(session));
  }

  window.addEventListener('logbook:supabase-ready', event => bindClient(event.detail.client));
  window.addEventListener('logbook:session-state', event => {
    const { state, userId:sessionUserId } = event.detail || {};
    if (state === 'member' && client && !userId && sessionUserId) handleSession({ user:{ id:sessionUserId } });
    else if ((state === 'unknown' || state === 'guest') && userId) handleSession(null);
  });
  window.addEventListener('logbook:supabase-unavailable', () => setStatus('Cloud εκτός σύνδεσης · τα δεδομένα παραμένουν τοπικά.', 'offline'));
  window.addEventListener('logbook:initial-sync-requested', () => {
    if (userId) startInitialSync(userId, true);
  });
  window.addEventListener('logbook:local-data-changed', event => {
    if (DATA_KEYS.includes(event.detail?.key) && userId) synchronize({ immediate:false });
  });
  window.addEventListener('online', () => {
    setStatus('Η σύνδεση επανήλθε · συγχρονισμός δεδομένων…', 'syncing');
    synchronize();
  });
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
