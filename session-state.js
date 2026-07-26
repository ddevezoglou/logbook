(() => {
  const STATES = Object.freeze({
    UNKNOWN:'unknown',
    MEMBER:'member',
    OFFLINE_MEMBER:'offline-member',
    GUEST:'guest',
  });
  const VALID_STATES = new Set(Object.values(STATES));

  function createSessionStateMachine({ state = STATES.UNKNOWN, context = {} } = {}) {
    if (!VALID_STATES.has(state)) throw new TypeError(`Unknown session state: ${state}`);
    let snapshot = Object.freeze({ state, context:Object.freeze({ ...context }) });
    const listeners = new Set();

    function transition(nextState, nextContext = {}) {
      if (!VALID_STATES.has(nextState)) throw new TypeError(`Unknown session state: ${nextState}`);
      const session = nextState === STATES.MEMBER || nextState === STATES.OFFLINE_MEMBER
        ? nextContext.session
        : null;
      if ((nextState === STATES.MEMBER || nextState === STATES.OFFLINE_MEMBER) && !session?.user?.id) {
        throw new TypeError(`${nextState} requires a session with a user id`);
      }
      const previous = snapshot;
      snapshot = Object.freeze({
        state:nextState,
        context:Object.freeze({ ...nextContext, session }),
      });
      listeners.forEach(listener => listener(snapshot, previous));
      return snapshot;
    }

    return Object.freeze({
      get state() { return snapshot.state; },
      get context() { return snapshot.context; },
      is:expected => snapshot.state === expected,
      snapshot:() => snapshot,
      transition,
      subscribe(listener) {
        if (typeof listener !== 'function') throw new TypeError('Session listener must be a function');
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });
  }

  window.LogbookSessionState = Object.freeze({ STATES, createSessionStateMachine });
  window.LogbookSessionMachine = createSessionStateMachine();
})();
