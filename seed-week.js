// Seed script για δοκιμή του συστήματος επιβράβευσης.
// Χρήση: άνοιξε το index.html στον browser, άνοιξε DevTools Console (F12),
// επικόλλησε ΟΛΟ το περιεχόμενο του αρχείου και πάτησε Enter.
// Δημιουργεί: ενεργό πρόγραμμα 4 ημερών + πλήρη logs των 13 προηγούμενων εβδομάδων
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
    plan: workouts.flatMap(workout => workout.exercises.map(item => ({
      id: item.id,
      day: workout.day,
      workoutName: workout.workoutName,
      exercise: item.exercise,
      workSets: item.workSets,
      cues: item.cues,
      sets: Array.from({ length: item.workSets }, () => ({}))
    })))
  };

  const pastWeeks = 13;

  const sessionFor = (workout, weekOffset, progression) => ({
    id: uid(),
    date: iso(dateAt(weekOffset, workout.dayOffset)),
    type: 'scheduled',
    routineId,
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

  localStorage.setItem('trainingRoutines', JSON.stringify([routine]));
  localStorage.setItem('trainingSessions', JSON.stringify(sessions));
  localStorage.removeItem('routineRewardTracking');
  localStorage.removeItem('trainingLogs');
  console.log(`Seed OK: 1 πρόγραμμα (4 ημέρες), ${sessions.length} προπονήσεις σε ${pastWeeks} εβδομάδες + τρέχουσα. Reload...`);
  location.reload();
})();
