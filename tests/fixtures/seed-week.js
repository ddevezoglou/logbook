// Κοινό test fixture για το σύστημα επιβράβευσης και τις δοκιμές συγχρονισμού.
// Δεν αποτελεί μέρος του production app shell.
// Δημιουργεί: ενεργό 7ήμερο πρόγραμμα 4 προπονήσεων, παραδείγματα μικρόκυκλων
// 8/9/10 ημερών και πλήρη logs των 13 προηγούμενων εβδομάδων
// + logs της τρέχουσας εβδομάδας μέχρι σήμερα, και κάνει reload.
//
// Αναμενόμενο αποτέλεσμα στο Προφίλ:
//   - Streak: 13 συνεχόμενες εβδομάδες (όλες ολοκληρωμένες 4/4)
//   - Stage 4 → "GYMRAT" (μόνιμο, κλειδώνει στις 12 εβδομάδες)
//   - Πρόοδος τρέχουσας εβδομάδας: όσες ημέρες του πλάνου έχουν ήδη περάσει
//
// ΠΡΟΣΟΧΗ: αντικαθιστά τα υπάρχοντα δεδομένα (routines, sessions, tracking).

(() => {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const uid = () => crypto.randomUUID();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const dateAt = (weekOffset, dayOffset) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + weekOffset * 7 + dayOffset);
    return d;
  };
  const weekdays = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
  const weekdayAtCycleDay = cycleDay => {
    const date = new Date(monday);
    date.setDate(date.getDate() + cycleDay - 1);
    return weekdays[date.getDay()];
  };

  const kg = (reps, weight) => ({ reps, weightMode: 'kg', weight, plates: null });
  const bw = reps => ({ reps, weightMode: 'bodyweight', weight: null, plates: null });
  const bwx = (reps, weight) => ({ reps, weightMode: 'bodyweight_extra', weight, plates: null });
  const pl = (reps, plates) => ({ reps, weightMode: 'plates', weight: null, plates });
  const rep = (count, set) => Array.from({ length: count }, () => ({ ...set }));

  const routineId = uid();
  const workouts = [
    { day: 'Δευτέρα', dayOffset: 0, workoutName: 'Upper A', exercises: [
      { id: uid(), exercise: 'Bench Press', workSets: 4, cues: 'ώμοι πίσω, πόδια σταθερά', base: w => rep(4, kg(8, 60 + w * 2.5)) },
      { id: uid(), exercise: 'Barbell Row', workSets: 4, cues: 'ίσια πλάτη', base: w => rep(4, kg(10, 50 + w * 2.5)) },
      { id: uid(), exercise: 'Overhead Press', workSets: 3, cues: 'σφιχτός κορμός', base: w => rep(3, kg(8, 35 + w * 2.5)) },
      { id: uid(), exercise: 'Lat Pulldown', workSets: 3, cues: '', base: w => rep(3, pl(12, 7 + w)) }
    ]},
    { day: 'Τρίτη', dayOffset: 1, workoutName: 'Lower A', exercises: [
      { id: uid(), exercise: 'Back Squat', workSets: 4, cues: 'βάθος, γόνατα έξω', base: w => rep(4, kg(6, 90 + w * 2.5)) },
      { id: uid(), exercise: 'Romanian Deadlift', workSets: 3, cues: 'ουδέτερη μέση', base: w => rep(3, kg(10, 70 + w * 2.5)) },
      { id: uid(), exercise: 'Leg Press', workSets: 3, cues: '', base: w => rep(3, pl(12, 8 + w)) },
      { id: uid(), exercise: 'Calf Raises', workSets: 4, cues: 'πλήρες εύρος', base: w => rep(4, kg(15, 40)) }
    ]},
    { day: 'Πέμπτη', dayOffset: 3, workoutName: 'Upper B', exercises: [
      { id: uid(), exercise: 'Incline DB Press', workSets: 4, cues: 'έλεγχος στο κατέβασμα', base: w => rep(4, kg(10, 24 + w * 2)) },
      { id: uid(), exercise: 'Pull-ups', workSets: 3, cues: 'από πλήρη κρέμαση', base: () => rep(3, bw(8)) },
      { id: uid(), exercise: 'Dips', workSets: 3, cues: '', base: w => rep(3, bwx(8, 5 + w * 2.5)) },
      { id: uid(), exercise: 'Face Pulls', workSets: 3, cues: 'αργός ρυθμός', base: w => rep(3, pl(15, 4 + w)) }
    ]},
    { day: 'Παρασκευή', dayOffset: 4, workoutName: 'Lower B', exercises: [
      { id: uid(), exercise: 'Deadlift', workSets: 4, cues: 'σφιχτό ξεκίνημα', base: w => rep(4, kg(5, 120 + w * 5)) },
      { id: uid(), exercise: 'Front Squat', workSets: 3, cues: 'ψηλοί αγκώνες', base: w => rep(3, kg(8, 60 + w * 2.5)) },
      { id: uid(), exercise: 'Leg Curl', workSets: 3, cues: '', base: w => rep(3, pl(12, 5 + w)) }
    ]}
  ];

  const routine = {
    id: routineId,
    name: 'Push/Pull Δοκιμής',
    isActive: true,
    cycleLength: 7,
    cycleAnchorDate: iso(monday),
    usesWeekdays: true,
    plan: workouts.flatMap(workout => workout.exercises.map(item => ({
      id: item.id,
      cycleDay: workout.dayOffset + 1,
      day: workout.day,
      workoutName: workout.workoutName,
      exercise: item.exercise,
      workSets: item.workSets,
      cues: item.cues,
      sets: Array.from({ length: item.workSets }, () => ({}))
    })))
  };

  const exampleRoutine = (cycleLength, name, usesWeekdays, cycleWorkouts) => ({
    id: uid(),
    name,
    isActive: false,
    cycleLength,
    cycleAnchorDate: iso(monday),
    usesWeekdays,
    plan: cycleWorkouts.flatMap(workout => workout.exercises.map(exercise => ({
      id: uid(),
      cycleDay: workout.cycleDay,
      day: usesWeekdays ? weekdayAtCycleDay(workout.cycleDay) : null,
      workoutName: workout.workoutName,
      exercise,
      workSets: 3,
      cues: '',
      sets: [{}, {}, {}]
    })))
  });

  const exampleRoutines = [
    exampleRoutine(8, '8-Day Strength Rotation', false, [
      { cycleDay:1, workoutName:'Upper Strength', exercises:['Bench Press','Barbell Row','Overhead Press'] },
      { cycleDay:3, workoutName:'Lower Strength', exercises:['Back Squat','Romanian Deadlift','Calf Raises'] },
      { cycleDay:5, workoutName:'Pull Hypertrophy', exercises:['Pull-ups','Cable Row','Face Pulls'] },
      { cycleDay:8, workoutName:'Full Body', exercises:['Front Squat','Incline DB Press','Lat Pulldown'] }
    ]),
    exampleRoutine(9, '9-Day Push Pull Legs', true, [
      { cycleDay:1, workoutName:'Push', exercises:['Bench Press','Overhead Press','Triceps Extension'] },
      { cycleDay:4, workoutName:'Pull', exercises:['Deadlift','Pull-ups','Barbell Curl'] },
      { cycleDay:6, workoutName:'Legs', exercises:['Back Squat','Leg Press','Leg Curl'] },
      { cycleDay:9, workoutName:'Conditioning', exercises:['Farmer Walk','Sled Push','Hanging Knee Raise'] }
    ]),
    exampleRoutine(10, '10-Day Powerbuilding', false, [
      { cycleDay:1, workoutName:'Upper A', exercises:['Bench Press','Barbell Row','Lateral Raise'] },
      { cycleDay:3, workoutName:'Lower A', exercises:['Back Squat','Romanian Deadlift','Calf Raises'] },
      { cycleDay:6, workoutName:'Upper B', exercises:['Overhead Press','Pull-ups','Dips'] },
      { cycleDay:8, workoutName:'Lower B', exercises:['Deadlift','Front Squat','Leg Curl'] },
      { cycleDay:10, workoutName:'Athletic Day', exercises:['Box Jump','Farmer Walk','Plank'] }
    ])
  ];

  const pastWeeks = 13;

  const sessionFor = (workout, weekOffset, progression) => ({
    id: uid(),
    date: iso(dateAt(weekOffset, workout.dayOffset)),
    type: 'scheduled',
    routineId,
    cycleDay: workout.dayOffset + 1,
    workoutDay: workout.day,
    workoutName: workout.workoutName,
    comments: weekOffset === -pastWeeks ? 'Καλή ενέργεια, όλα τα σετ ολοκληρώθηκαν.' : 'Μικρή αύξηση βάρους από την προηγούμενη εβδομάδα.',
    exercises: workout.exercises.map(item => ({
      exercise: item.exercise,
      planExerciseId: item.id,
      comments: '',
      sets: item.base(progression)
    }))
  });

  const sessions = [];
  for (let weekOffset = -pastWeeks; weekOffset < 0; weekOffset++) {
    workouts.forEach(workout => sessions.push(sessionFor(workout, weekOffset, weekOffset + pastWeeks)));
  }
  workouts.forEach(workout => {
    if (dateAt(0, workout.dayOffset) <= today) sessions.push(sessionFor(workout, 0, pastWeeks));
  });
  sessions.sort((a, b) => b.date.localeCompare(a.date));

  localStorage.setItem('trainingRoutines', JSON.stringify([routine, ...exampleRoutines]));
  localStorage.setItem('trainingSessions', JSON.stringify(sessions));
  localStorage.removeItem('routineRewardTracking');
  localStorage.removeItem('trainingLogs');
  console.log(`Seed OK: 4 προγράμματα (7/8/9/10 ημέρες), ${sessions.length} προπονήσεις σε ${pastWeeks} εβδομάδες + τρέχουσα. Reload...`);
  if (!globalThis.__LOGBOOK_SEED_SKIP_RELOAD__) location.reload();
})();
