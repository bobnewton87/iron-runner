// ============================================================
// IRON RUNNER v3 — 48-Week Body Transformation Program
// Goal: Lose fat, build muscle, get shredded
// Equipment: trap bar, adjustable bench, adjustable dumbbells
// ============================================================
const APP_VERSION = 4;
const DATA_MIGRATION = 'ir_mig_v2';

// ---- SEED DATA (auto-import on first launch) ----
function seedIfEmpty(){
  if(localStorage.getItem('ir_start')) return;
  fetch('./seed-data.json').then(r=>r.json()).then(data=>{
    for(const[k,v]of Object.entries(data)){
      if(k==='ir_appver') continue;
      localStorage.setItem(k, typeof v==='string'?v:JSON.stringify(v));
    }
    location.reload();
  }).catch(()=>{});
}
seedIfEmpty();

// ---- ONE-TIME DATA MIGRATION (non-destructive) ----
// Convert ir_start from ISO UTC (e.g. "2026-03-26T05:00:00.000Z") to local "YYYY-MM-DD".
// The ISO parse in local timezone may land on the previous calendar day, causing off-by-one.
// We re-extract Y/M/D from the local-parsed date — this mirrors how the app has always
// displayed dates, so the user's perceived start date is preserved.
(function migrate(){
  if(localStorage.getItem(DATA_MIGRATION)) return;
  const raw = localStorage.getItem('ir_start');
  if(raw){
    let stripped = raw;
    try { stripped = JSON.parse(raw); } catch(e) {}
    if(typeof stripped==='string' && stripped.indexOf('T')>0){
      const d = new Date(stripped);
      const local = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      localStorage.setItem('ir_start', JSON.stringify(local));
    }
  }
  localStorage.setItem(DATA_MIGRATION, '1');
})();

// ---- EXERCISE DATABASE ----
// defaultBase = suggested starting weight (lbs). For DB exercises: per hand.
// inc = weekly weight increase (lbs). unit = 'each' (per dumbbell) or 'total' (loaded bar).
const EX = {
  trap_dl: {
    name:'Trap Bar Deadlift', primary:['Quads','Glutes','Hamstrings'], secondary:['Back','Traps','Core'],
    equip:'Trap bar + plates on crash pads', unit:'total', defaultBase:155, inc:5,
    yt:'https://www.youtube.com/results?search_query=trap+bar+hex+bar+deadlift+form+tutorial',
    form:['Stand centered in trap bar, feet hip-width apart','Hinge at hips, bend knees, grip the high handles','Flat back, chest up, shoulders packed back and down','Big breath, brace core like someone is going to punch you','Drive through your whole foot to stand tall','Squeeze glutes hard at the top','Lower with control back to crash pads \u2014 reset between reps']
  },
  db_bench: {
    name:'Dumbbell Bench Press', primary:['Chest'], secondary:['Shoulders','Triceps'],
    equip:'Dumbbells + flat bench', unit:'each', defaultBase:40, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=dumbbell+bench+press+proper+form+tutorial',
    form:['Lie flat, feet firmly on floor','Pinch shoulder blades together and slightly down \u2014 keep them there','Hold dumbbells at chest level, palms forward, elbows ~45\u00b0','Press up until arms extended \u2014 don\'t lock out','Lower slowly to chest, feel the stretch','Control the weight \u2014 2 sec down, 1 sec up']
  },
  db_incline: {
    name:'Incline Dumbbell Press', primary:['Upper Chest'], secondary:['Shoulders','Triceps'],
    equip:'Dumbbells + bench at 30-45\u00b0', unit:'each', defaultBase:30, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=incline+dumbbell+press+form+tutorial+upper+chest',
    form:['Set bench to 30-45\u00b0 incline','Shoulder blades pinched, feet flat','Press up and slightly inward','Lower with control to upper chest','Targets the upper chest \u2014 key for the full chest look']
  },
  db_decline: {
    name:'Decline Dumbbell Press', primary:['Lower Chest'], secondary:['Shoulders','Triceps'],
    equip:'Dumbbells + bench at slight decline', unit:'each', defaultBase:35, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=decline+dumbbell+press+form+tutorial',
    form:['Set bench to slight decline (-15\u00b0)','Shoulder blades pinched','Press up from lower chest','Lower with control','Hits lower chest to round out development']
  },
  db_row: {
    name:'Dumbbell Row', primary:['Lats','Rhomboids'], secondary:['Biceps','Rear Delts'],
    equip:'Dumbbell + bench for support', unit:'each', defaultBase:35, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=one+arm+dumbbell+row+form+tutorial+back',
    form:['One knee and hand on bench, other foot on floor wide','Hold dumbbell with free hand, arm fully extended','Pull dumbbell to your hip \u2014 think elbow to ceiling','Squeeze shoulder blade at top for 1 sec','Lower with control \u2014 full stretch at bottom','Each arm separately \u2014 this builds thickness']
  },
  db_shoulder: {
    name:'Seated Shoulder Press', primary:['Front Delts','Side Delts'], secondary:['Triceps','Traps'],
    equip:'Dumbbells + bench at 90\u00b0', unit:'each', defaultBase:25, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=seated+dumbbell+shoulder+press+form+tutorial',
    form:['Sit on bench set to 90\u00b0 (upright)','Hold dumbbells at shoulder height, palms forward','Press straight up overhead until arms extended','Lower slowly to shoulder level','Don\'t arch your lower back \u2014 brace core']
  },
  db_curl: {
    name:'Dumbbell Curl', primary:['Biceps'], secondary:['Forearms'],
    equip:'Dumbbells', unit:'each', defaultBase:20, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=dumbbell+bicep+curl+proper+form+technique',
    form:['Stand tall, dumbbells at sides, palms forward','Pin elbows to your sides \u2014 they don\'t move','Curl up by bending only at the elbow','Squeeze hard at the top','Lower slowly (3 sec negative) \u2014 this is where growth happens','Zero swinging \u2014 if you have to swing, go lighter']
  },
  db_hammer: {
    name:'Hammer Curl', primary:['Biceps','Brachialis'], secondary:['Forearms'],
    equip:'Dumbbells', unit:'each', defaultBase:20, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=hammer+curl+form+tutorial+brachialis',
    form:['Stand with dumbbells at sides, palms facing each other (neutral grip)','Curl up maintaining that neutral grip','Squeeze at top, lower with control','Builds the brachialis \u2014 the muscle that makes arms look thick from the side','Also builds forearm strength']
  },
  db_goblet: {
    name:'Goblet Squat', primary:['Quads','Glutes'], secondary:['Core','Upper Back'],
    equip:'Single heavy dumbbell', unit:'total', defaultBase:45, inc:5,
    yt:'https://www.youtube.com/results?search_query=goblet+squat+dumbbell+form+tutorial+depth',
    form:['Hold one dumbbell vertically at your chest (goblet position)','Feet shoulder-width, toes pointed slightly out','Squat down \u2014 push knees out over toes','Keep chest tall, elbows inside knees','Go as deep as you can with good form (below parallel ideal)','Drive up through your whole foot']
  },
  trap_row: {
    name:'Trap Bar Row', primary:['Lats','Rhomboids','Mid Back'], secondary:['Biceps','Rear Delts'],
    equip:'Trap bar + plates', unit:'total', defaultBase:115, inc:5,
    yt:'https://www.youtube.com/results?search_query=trap+bar+bent+over+row+form+tutorial',
    form:['Stand with trap bar, hinge forward to ~45\u00b0','Arms hanging straight down, grip handles','Pull bar to lower chest / upper belly','Squeeze shoulder blades together hard at top','Lower with control \u2014 full arm extension','Keep core braced and back flat throughout']
  },
  db_lateral: {
    name:'Lateral Raise', primary:['Side Delts'], secondary:['Traps'],
    equip:'Light dumbbells', unit:'each', defaultBase:10, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=lateral+raise+form+tutorial+side+delts',
    form:['Stand with light dumbbells at sides','Slight bend in elbows \u2014 maintain this throughout','Raise arms out to sides until parallel to floor','Lead with your elbows, not your hands','Lower slowly \u2014 don\'t just drop them','These are HUMBLING \u2014 use lighter weight than your ego wants']
  },
  db_tri_oh: {
    name:'Overhead Tricep Extension', primary:['Triceps (long head)'], secondary:[],
    equip:'Single dumbbell, both hands', unit:'total', defaultBase:25, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=overhead+dumbbell+tricep+extension+form+tutorial',
    form:['Hold one dumbbell with both hands behind your head','Upper arms stay vertical, close to ears','Extend arms up until straight','Lower slowly behind head \u2014 feel the stretch','Keep elbows pointing forward, not flaring','The stretch at the bottom is key for the long head of triceps']
  },
  db_skull: {
    name:'Skull Crusher', primary:['Triceps'], secondary:[],
    equip:'Dumbbells + flat bench', unit:'each', defaultBase:15, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=dumbbell+skull+crusher+lying+tricep+extension+form',
    form:['Lie flat on bench, dumbbells pressed above chest','Keeping upper arms vertical, bend ONLY at elbows','Lower dumbbells toward your temples','Upper arms don\'t move \u2014 only forearms hinge','Extend back up to start','Great tricep isolation \u2014 name sounds scary but form is simple']
  },
  db_lunge: {
    name:'Walking Lunge', primary:['Quads','Glutes'], secondary:['Hamstrings','Core'],
    equip:'Dumbbells at sides', unit:'each', defaultBase:25, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=dumbbell+walking+lunge+form+tutorial',
    form:['Hold dumbbells at sides, stand tall','Step forward with one leg','Lower until both knees at ~90\u00b0','Front knee tracks over ankle \u2014 not past toes','Push through front heel to step forward with other leg','Keep torso upright \u2014 don\'t lean forward']
  },
  db_rdl: {
    name:'Romanian Deadlift', primary:['Hamstrings','Glutes'], secondary:['Lower Back'],
    equip:'Dumbbells', unit:'each', defaultBase:30, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=dumbbell+romanian+deadlift+rdl+form+tutorial',
    form:['Stand with dumbbells in front of thighs','Slight bend in knees \u2014 keep this angle constant','Hinge at hips, pushing your butt BACK','Lower dumbbells along legs until you feel hamstring stretch','Don\'t round your back \u2014 keep it flat','Drive hips forward to stand \u2014 squeeze glutes','This is a HINGE not a squat \u2014 feel it in your hamstrings']
  },
  farmer: {
    name:'Farmer\'s Walk', primary:['Traps','Forearms','Core'], secondary:['Everything'],
    equip:'Trap bar or heavy dumbbells', unit:'total', defaultBase:155, inc:5,
    yt:'https://www.youtube.com/results?search_query=farmers+walk+carry+form+benefits+tutorial',
    form:['Pick up trap bar or heavy dumbbells','Stand tall \u2014 shoulders back and down, chest up','Walk with short, controlled steps','Keep core braced hard the entire time','Don\'t let the weight pull you forward','Walk 40 steps or about 30 seconds','Builds grip, traps, core, posture \u2014 the ultimate functional exercise']
  },
  db_split: {
    name:'Bulgarian Split Squat', primary:['Quads','Glutes'], secondary:['Hamstrings','Core'],
    equip:'Dumbbells + bench', unit:'each', defaultBase:20, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=bulgarian+split+squat+dumbbell+form+tutorial',
    form:['Stand about 2 feet in front of bench','Rest top of rear foot on bench behind you','Hold dumbbells at sides','Lower straight down until front thigh is parallel','Keep front knee tracking over toes','Push up through front heel','These are brutal but they build incredible legs']
  },
  db_step: {
    name:'Step Up', primary:['Quads','Glutes'], secondary:['Hamstrings'],
    equip:'Dumbbells + bench', unit:'each', defaultBase:25, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=dumbbell+step+up+bench+form+tutorial',
    form:['Hold dumbbells at sides, face the bench','Place one foot fully on the bench','Drive through that heel to stand on bench','Stand fully upright on bench','Lower with control on the same leg','Don\'t push off with your back foot \u2014 use the working leg']
  },
  db_calf: {
    name:'Calf Raise', primary:['Calves'], secondary:[],
    equip:'Dumbbells + optional step', unit:'each', defaultBase:35, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=standing+dumbbell+calf+raise+form+tutorial',
    form:['Hold dumbbells at sides','Rise up on toes as HIGH as possible','Hold top position for 1-2 seconds','Lower slowly \u2014 3 sec negative','Optional: stand on edge of step for deeper stretch','Calves respond to high reps and full range of motion']
  },
  trap_shrug: {
    name:'Trap Bar Shrug', primary:['Upper Traps'], secondary:['Forearms'],
    equip:'Trap bar + plates', unit:'total', defaultBase:135, inc:5,
    yt:'https://www.youtube.com/results?search_query=barbell+trap+bar+shrug+form+tutorial',
    form:['Stand in trap bar, arms at sides holding handles','Shrug shoulders STRAIGHT UP toward ears','Hold at top for 2 seconds','Lower slowly','Straight up and down only \u2014 do NOT roll shoulders','Go heavy \u2014 traps respond to heavy weight']
  },
  db_fly: {
    name:'Dumbbell Fly', primary:['Chest'], secondary:['Front Delts'],
    equip:'Light dumbbells + flat bench', unit:'each', defaultBase:20, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=dumbbell+chest+fly+form+tutorial+pec',
    form:['Lie flat, dumbbells pressed above chest','Slight bend in elbows \u2014 lock this angle','Open arms wide, lowering dumbbells in a wide arc','Feel a deep stretch in your chest at the bottom','Squeeze chest to bring dumbbells back together','Use MUCH lighter weight than presses \u2014 this isolates chest']
  },
  face_pull: {
    name:'Cable Face Pull', primary:['Rear Delts'], secondary:['Upper Back','Rotator Cuff'],
    equip:'Cable machine + rope attachment (home: band anchored high)', unit:'total', defaultBase:30, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=cable+face+pull+form+tutorial+rear+delts',
    form:['Set cable/pulley at upper chest to face height','Grip rope with palms down, step back until cable is taut','Pull rope to your face \u2014 aim the ends past your ears','External rotation at the top \u2014 pinkies back, thumbs up','Squeeze shoulder blades and rear delts hard','Slow return with control','Critical for shoulder health and posture']
  },
  cable_row: {
    name:'Seated Cable Row', primary:['Lats','Mid Back'], secondary:['Biceps','Rear Delts'],
    equip:'Cable row machine (gym) or resistance band (home)', unit:'total', defaultBase:90, inc:5,
    yt:'https://www.youtube.com/results?search_query=seated+cable+row+form+tutorial',
    form:['Sit tall, feet on platform, slight knee bend','Grip handle, arms extended, chest up','Pull handle to lower ribs \u2014 elbows close to body','Squeeze shoulder blades together at the end','Slow return, let lats stretch at the start',"Don't lean back or rock \u2014 keep torso vertical"]
  },
  lat_pulldown: {
    name:'Lat Pulldown', primary:['Lats'], secondary:['Biceps','Rear Delts'],
    equip:'Lat pulldown machine (gym) or pull-up bar (home)', unit:'total', defaultBase:90, inc:5,
    yt:'https://www.youtube.com/results?search_query=lat+pulldown+form+tutorial',
    form:['Grip bar slightly wider than shoulder-width, palms forward','Sit down, knees under pads, lean back slightly (~15\u00b0)','Pull bar to upper chest \u2014 lead with elbows down and back','Squeeze lats hard at the bottom','Slow return, let lats stretch fully',"Don't pull behind the neck \u2014 bad for shoulders"]
  },
  leg_press: {
    name:'Leg Press', primary:['Quads','Glutes'], secondary:['Hamstrings'],
    equip:'Leg press machine (gym only)', unit:'total', defaultBase:180, inc:10,
    yt:'https://www.youtube.com/results?search_query=leg+press+form+tutorial+proper',
    form:['Sit in the machine, back flat against the pad','Feet shoulder-width on platform, mid-foot','Unlock safety, lower weight under control',"Knees track over toes \u2014 don't let them cave in",'Go until knees reach ~90\u00b0 (deeper if mobile)',"Drive through mid-foot to extend \u2014 don't lock out knees"]
  },
  leg_curl: {
    name:'Seated Leg Curl', primary:['Hamstrings'], secondary:['Calves'],
    equip:'Leg curl machine (gym only)', unit:'total', defaultBase:70, inc:5,
    yt:'https://www.youtube.com/results?search_query=seated+leg+curl+form+tutorial',
    form:['Sit in machine, thigh pad above knees','Heels on roller, knees aligned with machine pivot','Curl heels down and under \u2014 squeeze hamstrings hard','Pause 1 sec at full contraction',"Slow return (3 sec) \u2014 don't let weight slam","Direct hamstring work \u2014 compounds don't fully stress them"]
  },
  hang_knee: {
    name:'Hanging Knee Raise', primary:['Abs','Hip Flexors'], secondary:['Grip'],
    equip:'Pull-up bar', unit:'total', defaultBase:0, inc:0,
    yt:'https://www.youtube.com/results?search_query=hanging+knee+raise+form+tutorial',
    form:['Hang from pull-up bar, arms straight, shoulders engaged',"Core braced \u2014 no swinging",'Raise knees toward chest \u2014 think curl your pelvis up','Pause 1 sec at top, feel the ab squeeze','Lower slowly (3 sec) with control',"Progression: knees \u2192 bent-leg raise \u2192 straight-leg raise \u2192 toes-to-bar"]
  },
  plank: {
    name:'Plank', primary:['Abs','Core'], secondary:['Shoulders','Glutes'],
    equip:'Floor / mat', unit:'total', defaultBase:0, inc:0,
    yt:'https://www.youtube.com/results?search_query=proper+plank+form+tutorial',
    form:['Forearms on ground, elbows under shoulders','Body in a straight line from heels to head','Squeeze glutes and brace abs hard',"Don't let hips sag or pike up",'Breathe steady \u2014 hold for time (30\u201390s)','Finisher for every leg/core day']
  },
  tri_pushdown: {
    name:'Cable Tricep Pushdown', primary:['Triceps'], secondary:[],
    equip:'Cable machine + rope or bar (gym only)', unit:'total', defaultBase:40, inc:2.5,
    yt:'https://www.youtube.com/results?search_query=cable+tricep+pushdown+form+tutorial',
    form:['Stand facing cable, grip rope at chest height',"Pin elbows to your sides \u2014 they don't move",'Push rope down, spreading ends apart at the bottom','Squeeze triceps hard at full extension',"Slow return to chest height \u2014 feel the stretch","Don't let elbows drift forward"]
  }
};

// ---- PHASES ----
// int = intensity: 'heavy','mod','light'. rpe = rate of perceived exertion (6-10 scale).
const PHASES = [
  // ========== PHASE 1: FOUNDATION (Weeks 1-4) ==========
  {
    id:1, name:'Foundation', tag:'Build the Habit', weeks:4, liftDays:3, runDays:3, mode:'recomp',
    desc:'Base building phase \u2014 like the early easy mileage weeks of a marathon block. Learn the movements, establish the routine, let your body adapt. Your only job: show up 3 days a week for 4 weeks.',
    prog:'Week 1 is your BASELINE WEEK. Find the right starting weight for each exercise (you should finish each set feeling like you could do 2-3 more reps). Week 2: same weights, better form. Weeks 3-4: start adding weight.',
    schedule:[
      {type:'lift',wk:'p1a'}, {type:'run',wk:'p1r1'}, {type:'lift',wk:'p1b'}, {type:'run',wk:'p1r1'}, {type:'lift',wk:'p1c'}, {type:'run',wk:'p1r2'}, {type:'rest'}
    ],
    workouts:{
      p1a:{
        name:'Full Body A', focus:'Push Emphasis', dur:'30-35 min',
        warmup:'5 min: jog in place, arm circles, 10 bodyweight squats, 10 push-ups',
        cooldown:'Stretch chest, shoulders, hamstrings \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:3,reps:'8',rest:90,int:'mod',rpe:'6-7',note:'BASELINE: Start with the bar + 25s (~95 lbs) or what feels manageable for 8 reps. You said you can pull 165-200, so probably start around 135-155. Leave 3+ reps in the tank.'},
          {id:'db_bench',sets:3,reps:'10',rest:60,int:'mod',rpe:'6-7',note:'BASELINE: Try 30-40 lbs each. You should be able to do 12-13 reps at this weight. We\'re learning form, not maxing out.'},
          {id:'db_row',sets:3,reps:'10 ea',rest:60,int:'mod',rpe:'6-7',note:'BASELINE: 30-40 lbs. One arm at a time, brace on bench. Pull to hip.'},
          {id:'db_shoulder',sets:2,reps:'10',rest:60,int:'light',rpe:'6',note:'BASELINE: 20-25 lbs each. These are harder than they look. Go light.'},
          {id:'db_curl',sets:2,reps:'12',rest:45,int:'light',rpe:'6',note:'BASELINE: 15-20 lbs. Slow and controlled. No swinging. Ever.'}
        ]
      },
      p1b:{
        name:'Full Body B', focus:'Pull Emphasis', dur:'30-35 min',
        warmup:'5 min: jog in place, arm circles, 10 bodyweight squats',
        cooldown:'Stretch quads, chest, lats \u2014 5 min.',
        exercises:[
          {id:'db_goblet',sets:3,reps:'10',rest:60,int:'mod',rpe:'6-7',note:'BASELINE: 35-50 lb dumbbell. Hold at chest. Go deep \u2014 depth matters more than weight.'},
          {id:'db_incline',sets:3,reps:'10',rest:60,int:'mod',rpe:'6-7',note:'BASELINE: 25-35 lbs each. Bench at 30-45\u00b0. Slightly lighter than flat bench.'},
          {id:'trap_row',sets:3,reps:'10',rest:60,int:'mod',rpe:'6-7',note:'BASELINE: Same trap bar as deadlift, lighter weight (~95-115 lbs). Hinge forward, pull to belly.'},
          {id:'db_lateral',sets:2,reps:'12',rest:45,int:'light',rpe:'6',note:'BASELINE: 8-12 lbs each. Seriously. These are humbling. Use light weight.'},
          {id:'db_tri_oh',sets:2,reps:'12',rest:45,int:'light',rpe:'6',note:'BASELINE: 20-30 lb dumbbell, both hands. Elbows by ears, feel the stretch.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'}
        ]
      },
      p1c:{
        name:'Full Body C', focus:'Legs Emphasis', dur:'30-35 min',
        warmup:'5 min: jog in place, arm circles, 10 bodyweight squats, 10 lunges',
        cooldown:'Stretch hamstrings, quads, chest \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:3,reps:'8',rest:90,int:'mod',rpe:'7',note:'Should feel more comfortable than your first deadlift session this week. Add 5-10 lbs if form was solid.'},
          {id:'db_lunge',sets:3,reps:'8 ea',rest:60,int:'mod',rpe:'6-7',note:'BASELINE: 20-30 lbs each. Alternating legs. Take your time, balance matters.'},
          {id:'db_decline',sets:3,reps:'10',rest:60,int:'mod',rpe:'6-7',note:'BASELINE: 30-40 lbs each. Slight decline on the bench.'},
          {id:'db_row',sets:3,reps:'10 ea',rest:60,int:'mod',rpe:'7',note:'Same or slightly more weight than earlier this week.'},
          {id:'db_hammer',sets:2,reps:'12',rest:45,int:'light',rpe:'6',note:'BASELINE: 15-20 lbs. Palms face each other. Hits outer bicep and forearms.'},
          {id:'plank',sets:3,reps:'45s',rest:45,int:'light',rpe:'7',note:'Core finisher. Hold for 30-60 seconds, focus on tight glutes and braced abs.'}
        ]
      },
      p1r1:{name:'Easy Run',type:'run',dur:'20-30 min',dist:'2-3 miles',effort:'Zone 2 \u2014 conversational',
        desc:'Active recovery between lift days. Keep it stupid easy. This burns fat, helps muscle recovery, and keeps your aerobic engine running. You know what Zone 2 feels like.',
        details:['Pace: whatever conversational is right now (~9:00-10:30/mi)','Effort: easy enough to hold a conversation the whole time','Terrain: trail with poles, road, treadmill \u2014 your call','Fat burning: Zone 2 primarily uses fat as fuel \u2014 this is doing the work']},
      p1r2:{name:'Trail Run',type:'run',dur:'30-45 min',dist:'3-4 miles',effort:'Easy',
        desc:'Saturday long-ish run. Poles encouraged. Zone 2. This is partly for fat burning, partly for your head \u2014 the part of training you already love.',
        details:['Pace: easy, no pressure, enjoy the trail','Effort: Zone 2, purely conversational','Trail + poles = more muscles engaged = more calories burned','This run burns ~300-400 calories of mostly fat']}
    }
  },

  // ========== PHASE 2: BUILDING (Weeks 5-8) ==========
  {
    id:2, name:'Building', tag:'Upper-Focus Split', weeks:4, liftDays:3, runDays:3, mode:'recomp',
    desc:'Upper-body focused split designed for a former elite marathoner: legs are already strong, upper body needs to catch up. Three lift days \u2014 two pure upper sessions plus a full-body day that handles posterior chain via trap bar. The second leg day is replaced by a flexible cardio day (your choice of modality) with optional light upper accessories.',
    prog:'DOUBLE PROGRESSION: the app tracks your last session per exercise. Hit all prescribed sets at a weight, the next session suggests +one step (DB +2.5, trap bar/machine +5). Miss sets? It holds or drops weight. No arbitrary weekly increases \u2014 your real performance drives progression.',
    schedule:[
      {type:'lift',wk:'p2ua'}, {type:'lift',wk:'p2fb'}, {type:'run',wk:'p2r1'}, {type:'lift',wk:'p2ub'}, {type:'run',wk:'p2r3'}, {type:'run',wk:'p2r2'}, {type:'rest'}
    ],
    workouts:{
      p2ua:{
        name:'Upper A', focus:'Chest & Back', dur:'45-55 min',
        warmup:'5 min: jump rope or jog, arm circles, 10 push-ups, light set of bench',
        cooldown:'Stretch chest, lats, shoulders \u2014 5 min.',
        exercises:[
          {id:'db_bench',sets:4,reps:'8',rest:75,int:'mod',rpe:'7-8',note:'Go heavier than Phase 1. Rep 8 should be challenging but doable.'},
          {id:'db_row',sets:4,reps:'8 ea',rest:75,int:'mod',rpe:'7-8',note:'Match or exceed your bench weight. Back can handle more than you think.'},
          {id:'db_incline',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Lighter than flat bench. Focus on the upper chest squeeze at top.'},
          {id:'db_shoulder',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Building those boulder shoulders. Seated, controlled.'},
          {id:'db_lateral',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Wide-shoulder builder. Light weight, strict form, slight forward lean.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Heavier than Phase 1. Still strict form.'},
          {id:'db_tri_oh',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'One dumbbell, both hands. Feel the deep stretch.'},
          {id:'tri_pushdown',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Second tricep movement \u2014 triceps are 2/3 of arm size. Cable or band. Lock elbows in, full extension.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher. Hang from bar, raise knees to chest with control. Six-pack hypertrophy.'}
        ]
      },
      p2fb:{
        name:'Full Body (Upper Focus)', focus:'Posterior Chain + Heavy Upper', dur:'50-60 min',
        warmup:'5 min: jog, arm circles, leg swings, 10 push-ups, 1 light deadlift set',
        cooldown:'Stretch chest, lats, hamstrings \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:3,reps:'6',rest:120,int:'heavy',rpe:'8',note:'Heavy compound covers your posterior chain (back, glutes, hams) AND traps. Replaces most of what a dedicated leg day would do. 3 sets only \u2014 we\'re saving volume for upper body.'},
          {id:'db_bench',sets:4,reps:'8',rest:75,int:'mod',rpe:'7-8',note:'Extra chest volume for the week. Heavy.'},
          {id:'db_row',sets:4,reps:'8 ea',rest:75,int:'mod',rpe:'7-8',note:'Extra back volume. Match or beat your bench weight.'},
          {id:'db_shoulder',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Build the shoulders. Strict press.'},
          {id:'db_lateral',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Second lateral session of the week \u2014 wide-shoulder priority.'},
          {id:'db_split',sets:2,reps:'10 ea',rest:60,int:'mod',rpe:'7',note:'Light leg maintenance \u2014 only 2 sets. Your legs already do the work on every run.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Arm volume.'},
          {id:'db_skull',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Triceps \u2014 added because you\'re self-reportedly weak there. Lower to forehead, extend up, slow on the way down.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Posture and rear-delt insurance. Pull rope to face, external rotation at top.'}
        ]
      },
      p2ub:{
        name:'Upper B', focus:'Shoulders & Arms', dur:'45-55 min',
        warmup:'5 min: jump rope or jog, arm circles, 10 push-ups',
        cooldown:'Stretch chest, shoulders, triceps \u2014 5 min.',
        exercises:[
          {id:'db_incline',sets:4,reps:'8',rest:75,int:'mod',rpe:'7-8',note:'Lead with incline today. Go heavy for upper chest.'},
          {id:'trap_row',sets:4,reps:'8',rest:75,int:'mod',rpe:'7-8',note:'Trap bar rows. Pull hard, squeeze hard.'},
          {id:'db_bench',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Lighter than Upper A. Chase the chest pump.'},
          {id:'db_lateral',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'These build the wide-shoulder look. Still light weight.'},
          {id:'db_hammer',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Neutral grip. Builds forearms and arm thickness.'},
          {id:'db_skull',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Lower to temples, extend up. Great tricep builder.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher. Six-pack hypertrophy work.'}
        ]
      },
      p2r1:{name:'Easy Run',type:'run',dur:'25-30 min',dist:'3 miles',effort:'Zone 2',
        desc:'Mid-week recovery run. Easy effort. Helps flush soreness from yesterday\'s deadlifts and keeps your aerobic engine humming.',
        details:['Pace: conversational, no watch-checking','If legs are trashed, walk-run is totally fine','Zone 2 running uses primarily fat as fuel','This is doing double duty: recovery + fat burning']},
      p2r2:{name:'Trail Run',type:'run',dur:'35-50 min',dist:'3-4 miles',effort:'Easy',
        desc:'Saturday trail run. Mental reset for the week. Three running days plus the trap-bar work in the full-body session means your legs are getting plenty of stimulus \u2014 they just don\'t need a dedicated weight session.',
        details:['Pace: easy, enjoy the trail','Poles if you want them','~350-450 calories burned, mostly from fat','Goal: aerobic maintenance + mental health + fat burning']},
      p2r3:{name:'Cardio (+ Optional Light Upper)',type:'run',dur:'30-45 min',dist:'flexible',effort:'Easy to Moderate',
        desc:'Replaces what used to be your second leg day. Pick whichever cardio modality you feel like \u2014 the goal is steady aerobic work, not a hard session. If you have energy at the end, tack on a few sets of light upper accessories (rear delts, lateral raises, curls). Skip them without guilt \u2014 you\'ve already had 3 upper sessions this week.',
        details:[
          'Cardio (pick one): easy run 30-40 min Zone 2',
          'Cardio option: trail walk with poles 35-45 min',
          'Cardio option: treadmill incline walk (8-12% grade, ~3 mph) 30-40 min \u2014 great for fat burn, easy on legs',
          'Cardio option: stationary bike or rower 25-35 min easy steady',
          'Optional upper finisher (only if you feel good, 8-12 min): 3\u00d712 lateral raises, 3\u00d712 face pulls, 3\u00d712 DB curls',
          'Skip the finisher if your upper is fried from the week. Recovery beats junk volume.'
        ]}
    }
  },

  // ========== PHASE 3: HYPERTROPHY (Weeks 9-12) ==========
  {
    id:3, name:'Hypertrophy', tag:'Grow & Shred', weeks:4, liftDays:4, runDays:2, mode:'recomp',
    desc:'The quality phase \u2014 like tempo and threshold work in a marathon plan. Push/Pull/Full-Body/Upper split: dedicated leg day is replaced with a full-body session that handles posterior chain via heavy trap bar. Heavier weights, more volume. Wednesday run upgrades to tempo intervals for better fat burning.',
    prog:'Push weight up on compounds when you hit all prescribed reps. Isolation exercises: chase the pump and burn. If the last 2 reps don\'t hurt, go heavier.',
    schedule:[
      {type:'lift',wk:'p3push'}, {type:'lift',wk:'p3pull'}, {type:'run',wk:'p3r1'}, {type:'lift',wk:'p3fb'}, {type:'lift',wk:'p3upper'}, {type:'run',wk:'p3r2'}, {type:'rest'}
    ],
    workouts:{
      p3push:{
        name:'Push', focus:'Chest, Shoulders, Triceps', dur:'45-50 min',
        warmup:'5 min: light jog, arm circles, 10 push-ups, 1 light warm-up set of bench',
        cooldown:'Stretch chest, shoulders, triceps \u2014 5 min.',
        exercises:[
          {id:'db_bench',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Working weight. Rep 8 should be a real effort. This is where the muscle gets built.'},
          {id:'db_incline',sets:3,reps:'10',rest:60,int:'mod',rpe:'7-8',note:'Upper chest development. Control the weight.'},
          {id:'db_decline',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Rounds out the chest from all angles.'},
          {id:'db_shoulder',sets:3,reps:'10',rest:60,int:'mod',rpe:'7-8',note:'Seated. Strict form. Building real shoulders.'},
          {id:'db_lateral',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Chase the burn. These make your shoulders look wide.'},
          {id:'db_tri_oh',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Deep stretch at bottom, hard squeeze at top.'},
          {id:'db_skull',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Finish the triceps. Slow negatives.'}
        ]
      },
      p3pull:{
        name:'Pull', focus:'Back, Biceps, Traps', dur:'45-50 min',
        warmup:'5 min: light jog, arm circles, 1 warm-up set of deadlift',
        cooldown:'Stretch lats, biceps, lower back \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:4,reps:'5',rest:120,int:'heavy',rpe:'8-9',note:'HEAVY. This is your big pull of the week. Big breath, hard brace, drive the floor away.'},
          {id:'trap_row',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Pull hard, squeeze hard. Build that thick back.'},
          {id:'db_row',sets:3,reps:'10 ea',rest:60,int:'mod',rpe:'7-8',note:'Slow and controlled. Really feel the lat working.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Strict form. No ego lifting. 3 sec negative.'},
          {id:'db_hammer',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Builds arm thickness from every angle.'},
          {id:'trap_shrug',sets:3,reps:'12',rest:45,int:'mod',rpe:'7',note:'Heavy shrugs. Hold 2 sec at top. Builds the yoke.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher. Hang from bar, raise knees to chest with control.'}
        ]
      },
      p3fb:{
        name:'Full Body (Upper Focus)', focus:'Heavy Compound + Upper Volume', dur:'50-55 min',
        warmup:'5 min: jog, arm circles, leg swings, 1 light deadlift set',
        cooldown:'Stretch upper body, hamstrings, hips \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:3,reps:'5',rest:120,int:'heavy',rpe:'8-9',note:'Heavy compound. Posterior chain + traps + total-body strength stimulus. Replaces a dedicated leg day for someone whose legs are already strong.'},
          {id:'db_incline',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Heavy upper chest. Build pressing strength.'},
          {id:'trap_row',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Heavy back. Match or beat the press weights.'},
          {id:'db_shoulder',sets:3,reps:'10',rest:60,int:'mod',rpe:'7-8',note:'Shoulder volume.'},
          {id:'db_lateral',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Third lateral session of the week \u2014 wide-shoulder priority.'},
          {id:'db_split',sets:2,reps:'10 ea',rest:60,int:'mod',rpe:'7',note:'Two sets only \u2014 leg maintenance.'},
          {id:'db_hammer',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Arm thickness.'},
          {id:'db_skull',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Triceps for arm size.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Posture work. Pull rope to face, external rotation at top.'}
        ]
      },
      p3upper:{
        name:'Upper', focus:'Balanced Push & Pull', dur:'45-50 min',
        warmup:'5 min: light jog, arm circles, push-ups, light set',
        cooldown:'Full upper body stretch \u2014 5 min.',
        exercises:[
          {id:'db_incline',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Start with incline for upper chest priority.'},
          {id:'db_row',sets:4,reps:'8 ea',rest:75,int:'mod',rpe:'8',note:'Heavy rows. Match or beat your press weights.'},
          {id:'db_bench',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Moderate weight, good pump.'},
          {id:'trap_row',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Back volume. Pull and squeeze.'},
          {id:'db_shoulder',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Shoulders getting rounder by the week.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Arm work to close out.'},
          {id:'db_lateral',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Cap off with lateral raises for width.'},
          {id:'tri_pushdown',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Tricep volume — bring weekly tris to mid-range. Lock elbows in, full extension.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher. Six-pack hypertrophy.'}
        ]
      },
      p3r1:{name:'Tempo Run',type:'run',dur:'30-35 min',dist:'3-3.5 miles',effort:'Mixed: Easy + Tempo',
        desc:'UPGRADE: Tempo intervals replace easy running. You know what tempo effort feels like from your racing days. This is more metabolically active \u2014 you\'ll burn more calories for hours after (EPOC). Much more efficient for fat loss.',
        details:['Warm up: 10 min easy jog','Main set: 4 \u00d7 3 min at TEMPO effort (comfortably hard, ~marathon pace or slightly faster for you)','Recovery: 2 min easy jog between intervals','Cool down: 5 min easy jog','This should feel like a real workout but not destroy you for tomorrow\'s legs session','EPOC effect: elevated calorie burn for 12-24 hours after']},
      p3r2:{name:'Trail Run',type:'run',dur:'40-55 min',dist:'4 miles',effort:'Easy',
        desc:'Longer Saturday run. You\'re fit, you\'re strong, you\'re in the best shape you\'ve been in since your racing days. Different kind of fit though.',
        details:['Pace: easy, enjoy the trail','Poles optional but recommended for upper body engagement','~400-500 cal burned, mostly fat at this pace','Goal: aerobic maintenance + fat burning + mental reset']}
    }
  },

  // ========== PHASE 4: PEAK GROWTH (Weeks 13-16) ==========
  {
    id:4, name:'Peak Growth', tag:'Maximum Stimulus', weeks:4, liftDays:4, runDays:2, mode:'recomp',
    desc:'The peak \u2014 like your sharpening weeks before a marathon. You know every movement cold. The habit is locked in. Now you push. Heavy compounds with long rest, volume work with short rest. This is where the transformation becomes undeniable.',
    prog:'Push for PRs on compound lifts. Isolation: if the set doesn\'t burn, it\'s too light. Final 4 weeks \u2014 empty the tank every session.',
    schedule:[
      {type:'lift',wk:'p4push'}, {type:'lift',wk:'p4pull'}, {type:'run',wk:'p4r1'}, {type:'lift',wk:'p4fb'}, {type:'lift',wk:'p4upper'}, {type:'run',wk:'p4r2'}, {type:'rest'}
    ],
    workouts:{
      p4push:{
        name:'Push (Heavy)', focus:'Chest, Shoulders, Triceps', dur:'50-60 min',
        warmup:'5 min: light jog, arm circles, push-ups, 2 warm-up sets of bench (light then moderate)',
        cooldown:'Stretch chest, shoulders, triceps \u2014 5 min.',
        exercises:[
          {id:'db_bench',sets:5,reps:'5',rest:120,int:'heavy',rpe:'8-9',note:'HEAVY. Find a weight where rep 5 is a genuine fight. Rest fully between sets. These 5x5 sets build raw strength.'},
          {id:'db_incline',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Still heavy. Upper chest is the difference between a good chest and a great one.'},
          {id:'db_shoulder',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Heavier than you\'ve gone before. Real shoulder development.'},
          {id:'db_decline',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Volume for lower chest. Round out the full chest.'},
          {id:'db_lateral',sets:4,reps:'12',rest:45,int:'light',rpe:'8',note:'4 sets now. Light weight, burn should be intense by set 4.'},
          {id:'db_tri_oh',sets:3,reps:'12',rest:45,int:'light',rpe:'7-8',note:'Stretch and squeeze. Feel the tricep long head working.'},
          {id:'db_skull',sets:3,reps:'12',rest:45,int:'light',rpe:'7-8',note:'Finish the triceps. Slow negatives.'},
          {id:'tri_pushdown',sets:3,reps:'12',rest:45,int:'light',rpe:'7-8',note:'Cable pushdowns to bias the lateral head. Tricep priority — keep the volume mid-range every phase.'}
        ]
      },
      p4pull:{
        name:'Pull (Heavy)', focus:'Back, Biceps, Traps', dur:'50-60 min',
        warmup:'5 min: light jog, arm circles, 2 warm-up sets of deadlift',
        cooldown:'Stretch lats, biceps, lower back \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:5,reps:'3',rest:150,int:'heavy',rpe:'9',note:'HEAVIEST YOU\'VE GONE. Triples. Brace like your life depends on it. Full rest between sets. This is your PR day.'},
          {id:'trap_row',sets:4,reps:'6',rest:90,int:'heavy',rpe:'8',note:'Heavy rows for a thick back. Pull hard.'},
          {id:'db_row',sets:4,reps:'8 ea',rest:75,int:'mod',rpe:'8',note:'Heavy dumbbell rows. Pull to hip, squeeze 1 sec at top.'},
          {id:'db_curl',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Strict curls. Every rep counts in the final phase.'},
          {id:'db_hammer',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Arm thickness builder.'},
          {id:'trap_shrug',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Heavy shrugs for the yoke. Hold 2 sec at top.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]
      },
      p4fb:{
        name:'Full Body (Upper Focus)', focus:'Heavy Compound + Upper Power', dur:'50-55 min',
        warmup:'5 min: jog, arm circles, leg swings, 2 warm-up sets',
        cooldown:'Stretch upper, hamstrings, hips \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:4,reps:'5',rest:150,int:'heavy',rpe:'9',note:'Heavy compound. Push for a PR. Replaces a dedicated leg day \u2014 this single movement covers everything from traps to calves.'},
          {id:'db_bench',sets:4,reps:'6',rest:90,int:'heavy',rpe:'8-9',note:'Heavy chest reinforcement. Real growth weight.'},
          {id:'db_row',sets:4,reps:'6 ea',rest:90,int:'heavy',rpe:'8-9',note:'Heavy back reinforcement. Match or beat the bench.'},
          {id:'db_shoulder',sets:3,reps:'8',rest:75,int:'mod',rpe:'8',note:'Heavy shoulder press.'},
          {id:'db_split',sets:2,reps:'10 ea',rest:60,int:'mod',rpe:'7',note:'Light leg maintenance \u2014 2 sets is plenty.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'mod',rpe:'8',note:'Strict, heavy curls.'},
          {id:'db_skull',sets:3,reps:'10',rest:45,int:'mod',rpe:'8',note:'Heavy triceps.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Posture work.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]
      },
      p4upper:{
        name:'Upper (Volume)', focus:'Full Upper Body Pump', dur:'50-60 min',
        warmup:'5 min: light jog, arm circles, push-ups, light warm-up set',
        cooldown:'Full upper body stretch \u2014 5 min.',
        exercises:[
          {id:'db_incline',sets:4,reps:'12',rest:60,int:'light',rpe:'7-8',note:'Lighter weight, more reps. Chase the pump. Feel the upper chest fill with blood.'},
          {id:'db_row',sets:4,reps:'12 ea',rest:60,int:'light',rpe:'7-8',note:'High rep rows. Squeeze at top every single rep.'},
          {id:'db_bench',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Volume bench. Chest pump.'},
          {id:'trap_row',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Back volume. Pull and hold.'},
          {id:'db_shoulder',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Lighter weight, feel the delts.'},
          {id:'db_lateral',sets:4,reps:'15',rest:45,int:'light',rpe:'8',note:'15 reps. The burn is the point.'},
          {id:'db_curl',sets:3,reps:'12',rest:45,int:'light',rpe:'7-8',note:'Arm volume. Slow and strict.'},
          {id:'db_tri_oh',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Triceps volume to finish.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'}
        ]
      },
      p4r1:{name:'Fartlek Run',type:'run',dur:'30-35 min',dist:'3-3.5 miles',effort:'Mixed: Easy + Hard',
        desc:'Fartlek \u2014 speed play. You know this drill from your racing days. Mix easy running with harder surges. This is the most potent fat-burning run in the program.',
        details:['Warm up: 8 min easy','Main set: 20 min fartlek \u2014 alternate 2 min hard (5K-10K effort) / 2 min easy','Cool down: 5 min easy','Hard intervals should feel like you\'re racing \u2014 because you are','EPOC effect is massive \u2014 elevated metabolism for 24+ hours','Total distance: about 3-3.5 miles depending on pace']},
      p4r2:{name:'Trail Run',type:'run',dur:'40-60 min',dist:'4-5 miles',effort:'Easy',
        desc:'Final phase Saturday run. Push the distance if you feel good. You\'re the strongest and fittest you\'ve been in years. Different kind of fit than your marathon days \u2014 but powerful.',
        details:['Pace: easy','Distance: 4-5 miles if feeling good, 3 if beaten up','Poles recommended','You started at 2-3 miles on trails. Look how far you\'ve come.','Goal: fat burning, aerobic maintenance, enjoy what your body can do now']}
    }
  },

  // ========== BLOCK 2: LEAN BULK (Weeks 17-32) ==========

  // ========== PHASE 5: SIZE (Weeks 17-20) ==========
  {
    id:5, name:'Size', tag:'Lean Bulk Begins', weeks:4, liftDays:5, runDays:1, mode:'bulk',
    desc:'Time to GROW. You\'ve built the habit, learned the lifts, and stripped initial fat. Now we flip the switch: caloric surplus on lift days to fuel muscle growth. New split adds a dedicated Arms & Shoulders day. This is where you start looking jacked.',
    prog:'You\'re eating in surplus now \u2014 fuel the growth. Push for heavier weights on every compound. Add weight whenever you complete all prescribed reps. Arms and shoulders are the priority for the \u201clook\u201d you want.',
    schedule:[
      {type:'lift',wk:'p5_push'}, {type:'lift',wk:'p5_pull'}, {type:'lift',wk:'p5_fb'}, {type:'lift',wk:'p5_arms'}, {type:'lift',wk:'p5_upper'}, {type:'run',wk:'p5_trail'}, {type:'rest'}
    ],
    workouts:{
      p5_push:{name:'Push',focus:'Chest, Shoulders, Triceps',dur:'50-55 min',
        warmup:'5 min jog, arm circles, 2 warm-up sets bench (light then moderate)',
        cooldown:'Stretch chest, shoulders, triceps \u2014 5 min.',
        exercises:[
          {id:'db_bench',sets:5,reps:'5',rest:120,int:'heavy',rpe:'8-9',note:'Heavy 5x5. Building raw pressing strength.'},
          {id:'db_incline',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Upper chest. Go heavy.'},
          {id:'db_decline',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Lower chest volume.'},
          {id:'db_lateral',sets:3,reps:'12',rest:45,int:'light',rpe:'8',note:'Width builder.'},
          {id:'db_tri_oh',sets:3,reps:'12',rest:45,int:'light',rpe:'7-8',note:'Long head stretch.'},
          {id:'db_skull',sets:3,reps:'12',rest:45,int:'light',rpe:'7-8',note:'Tricep finisher.'}
        ]},
      p5_pull:{name:'Pull',focus:'Back, Biceps, Traps',dur:'50-55 min',
        warmup:'5 min jog, arm circles, 1-2 warm-up sets deadlift',
        cooldown:'Stretch lats, biceps, lower back \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:5,reps:'3',rest:150,int:'heavy',rpe:'9',note:'Heavy triples. Full rest. Brace hard.'},
          {id:'trap_row',sets:4,reps:'6',rest:90,int:'heavy',rpe:'8',note:'Heavy rows for a thick back.'},
          {id:'db_row',sets:4,reps:'8 ea',rest:75,int:'mod',rpe:'8',note:'Pull to hip, squeeze at top.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'mod',rpe:'7-8',note:'Strict form, full ROM.'},
          {id:'db_hammer',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Arm thickness.'},
          {id:'trap_shrug',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Heavy shrugs. Build the yoke.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]},
      p5_fb:{name:'Full Body (Upper Focus)',focus:'Heavy Compound + Upper Volume',dur:'50-55 min',
        warmup:'5 min jog, arm circles, leg swings, 1-2 warm-up sets',
        cooldown:'Stretch upper, hamstrings \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:4,reps:'6',rest:120,int:'heavy',rpe:'8',note:'Heavy compound. Posterior chain stimulus + total-body strength. Replaces dedicated leg day for upper-focus emphasis.'},
          {id:'db_incline',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Heavy upper chest.'},
          {id:'trap_row',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Thick back.'},
          {id:'db_shoulder',sets:3,reps:'10',rest:60,int:'mod',rpe:'7-8',note:'Shoulder press volume.'},
          {id:'db_split',sets:2,reps:'10 ea',rest:60,int:'mod',rpe:'7',note:'Two sets \u2014 leg maintenance.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'mod',rpe:'8',note:'Heavy curls.'},
          {id:'db_skull',sets:3,reps:'10',rest:45,int:'mod',rpe:'8',note:'Triceps.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Posture work.'}
        ]},
      p5_arms:{name:'Arms & Shoulders',focus:'Biceps, Triceps, Delts',dur:'45-50 min',
        warmup:'5 min jog, arm circles, light shoulder press warm-up',
        cooldown:'Stretch shoulders, biceps, triceps \u2014 5 min.',
        exercises:[
          {id:'db_shoulder',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Heavy shoulder press. Seated for strict form.'},
          {id:'db_lateral',sets:5,reps:'15',rest:45,int:'light',rpe:'8-9',note:'5 sets. High reps. This is what builds wide shoulders. The burn is the point.'},
          {id:'db_curl',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Strict curls. Squeeze hard at top. 3 sec negative.'},
          {id:'db_hammer',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Builds brachialis \u2014 makes arms look thick from every angle.'},
          {id:'db_tri_oh',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Long head. Deep stretch at bottom.'},
          {id:'db_skull',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Lateral head. Lock upper arms in place.'},
          {id:'trap_shrug',sets:3,reps:'12',rest:45,int:'mod',rpe:'7',note:'Trap volume for the yoke.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'}
        ]},
      p5_upper:{name:'Upper Volume',focus:'Full Upper Pump',dur:'50-55 min',
        warmup:'5 min jog, arm circles, push-ups, light warm-up set',
        cooldown:'Full upper body stretch \u2014 5 min.',
        exercises:[
          {id:'db_incline',sets:4,reps:'10',rest:60,int:'mod',rpe:'7-8',note:'Chest pump.'},
          {id:'db_row',sets:4,reps:'10 ea',rest:60,int:'mod',rpe:'7-8',note:'Back pump.'},
          {id:'db_bench',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Volume bench.'},
          {id:'trap_row',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Pull and squeeze.'},
          {id:'db_shoulder',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Shoulder volume.'},
          {id:'db_lateral',sets:3,reps:'15',rest:45,int:'light',rpe:'8',note:'More lateral raises. Always.'},
          {id:'db_curl',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Arm volume.'},
          {id:'db_tri_oh',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Tricep volume.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]},
      p5_trail:{name:'Trail Run',type:'run',dur:'35-50 min',dist:'3-4 miles',effort:'Easy',
        desc:'One run per week during bulk. Keep it easy. This maintains your cardio, burns some fat to keep the bulk lean, and is good for your head.',
        details:['Pace: easy, conversational','Poles if you want','This keeps fat gain in check during surplus','Don\'t push pace \u2014 save energy for lifting']}
    }
  },

  // ========== PHASE 6: ARMS RACE (Weeks 21-24) ==========
  {
    id:6, name:'Arms Race', tag:'Arm & Shoulder Focus', weeks:4, liftDays:5, runDays:1, mode:'bulk',
    desc:'Same split, more intensity. Arms and shoulders get extra volume. By now you should be noticeably bigger. Your wife will notice. Keep pushing the surplus and the weights.',
    prog:'Compounds should be significantly heavier than Phase 4. If your arm exercises feel easy at RPE 7, bump the weight. Chase the pump on arm day \u2014 blood flow = growth.',
    schedule:[
      {type:'lift',wk:'p6_push'}, {type:'lift',wk:'p6_pull'}, {type:'lift',wk:'p6_fb'}, {type:'lift',wk:'p6_arms'}, {type:'lift',wk:'p6_upper'}, {type:'run',wk:'p6_trail'}, {type:'rest'}
    ],
    workouts:{
      p6_push:{name:'Push',focus:'Chest, Shoulders, Triceps',dur:'50-55 min',
        warmup:'5 min jog, arm circles, 2 warm-up sets bench',cooldown:'Stretch chest, shoulders, triceps \u2014 5 min.',
        exercises:[
          {id:'db_bench',sets:5,reps:'5',rest:120,int:'heavy',rpe:'9',note:'Push for a bench PR. These should be HARD.'},
          {id:'db_incline',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Heavy incline.'},
          {id:'db_fly',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Chest isolation. Deep stretch.'},
          {id:'db_shoulder',sets:3,reps:'10',rest:60,int:'mod',rpe:'8',note:'Shoulder pressing volume.'},
          {id:'db_lateral',sets:4,reps:'15',rest:45,int:'light',rpe:'8-9',note:'Width. Burn is the point.'},
          {id:'db_skull',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Tricep mass builder.'},
          {id:'db_tri_oh',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Stretch and squeeze.'}
        ]},
      p6_pull:{name:'Pull',focus:'Back, Biceps, Traps',dur:'50-55 min',
        warmup:'5 min jog, arm circles, 2 warm-up deadlift sets',cooldown:'Stretch lats, biceps \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:5,reps:'3',rest:150,int:'heavy',rpe:'9',note:'Heavy triples. PR territory.'},
          {id:'trap_row',sets:4,reps:'8',rest:75,int:'mod',rpe:'8',note:'Thick back.'},
          {id:'db_row',sets:4,reps:'8 ea',rest:75,int:'mod',rpe:'8',note:'Heavy rows.'},
          {id:'db_curl',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Strict. 3 sec negative on every rep.'},
          {id:'db_hammer',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Arm thickness.'},
          {id:'trap_shrug',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Heavy. Hold 2 sec at top.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]},
      p6_fb:{name:'Full Body (Upper Focus)',focus:'Heavy Compound + Upper Power',dur:'50-55 min',
        warmup:'5 min jog, arm circles, leg swings, 2 warm-up sets',cooldown:'Stretch upper \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:4,reps:'5',rest:150,int:'heavy',rpe:'9',note:'PR territory. Heavy compound \u2014 your lower stimulus.'},
          {id:'db_bench',sets:4,reps:'6',rest:90,int:'heavy',rpe:'8-9',note:'Heavy chest reinforcement.'},
          {id:'db_row',sets:4,reps:'6 ea',rest:90,int:'heavy',rpe:'8-9',note:'Heavy back reinforcement.'},
          {id:'db_shoulder',sets:3,reps:'8',rest:75,int:'mod',rpe:'8',note:'Heavy shoulder press.'},
          {id:'db_split',sets:2,reps:'10 ea',rest:60,int:'mod',rpe:'7',note:'Two sets \u2014 leg maintenance.'},
          {id:'db_curl',sets:3,reps:'8',rest:60,int:'mod',rpe:'8',note:'Heavy biceps.'},
          {id:'db_skull',sets:3,reps:'8',rest:60,int:'mod',rpe:'8',note:'Heavy triceps.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Posture work.'}
        ]},
      p6_arms:{name:'Arms & Shoulders',focus:'Biceps, Triceps, Delts',dur:'50-55 min',
        warmup:'5 min jog, arm circles, light press warm-up',cooldown:'Stretch shoulders, arms \u2014 5 min.',
        exercises:[
          {id:'db_shoulder',sets:5,reps:'6',rest:90,int:'heavy',rpe:'8-9',note:'HEAVY shoulder press. 5 sets. Build boulder shoulders.'},
          {id:'db_lateral',sets:5,reps:'15',rest:45,int:'light',rpe:'9',note:'5 sets x 15. The last 2 sets should burn intensely.'},
          {id:'db_curl',sets:4,reps:'8',rest:60,int:'mod',rpe:'8',note:'Heavier curls. Fewer reps. Build peak.'},
          {id:'db_hammer',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Brachialis = arm thickness.'},
          {id:'db_tri_oh',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Overhead for long head.'},
          {id:'db_skull',sets:4,reps:'10',rest:45,int:'mod',rpe:'8',note:'Lateral head.'},
          {id:'db_fly',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Bonus chest isolation.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'}
        ]},
      p6_upper:{name:'Upper Volume',focus:'Full Upper Pump',dur:'50-55 min',
        warmup:'5 min jog, push-ups, light sets',cooldown:'Full upper stretch \u2014 5 min.',
        exercises:[
          {id:'db_incline',sets:4,reps:'12',rest:60,int:'light',rpe:'7-8',note:'Chase the pump.'},
          {id:'db_row',sets:4,reps:'12 ea',rest:60,int:'light',rpe:'7-8',note:'Back pump.'},
          {id:'db_bench',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Chest volume.'},
          {id:'trap_row',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Back volume.'},
          {id:'db_shoulder',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Shoulder pump.'},
          {id:'db_lateral',sets:4,reps:'15',rest:45,int:'light',rpe:'8',note:'Always more laterals.'},
          {id:'db_curl',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Arm pump.'},
          {id:'db_skull',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Tricep pump.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]},
      p6_trail:{name:'Trail Run',type:'run',dur:'35-50 min',dist:'3-4 miles',effort:'Easy',
        desc:'Weekly run. Keep the bulk lean. Enjoy the trail.',
        details:['Pace: easy','Keeps cardio and fat management in check','Don\'t push \u2014 recovery for lifting is priority']}
    }
  },

  // ========== PHASE 7: HEAVY METAL (Weeks 25-28) ==========
  {
    id:7, name:'Heavy Metal', tag:'Peak Strength', weeks:4, liftDays:5, runDays:1, mode:'bulk',
    desc:'Peak of the bulk. Heaviest weights you\'ve ever touched. You are significantly stronger and bigger than when you started. Compound PRs across the board. Arms and shoulders should be visibly larger.',
    prog:'PR attempts on all compounds. If you hit all reps, add weight. You\'re eating surplus \u2014 use it. This is the strongest you\'ll be before the cut.',
    schedule:[
      {type:'lift',wk:'p5_push'}, {type:'lift',wk:'p5_pull'}, {type:'lift',wk:'p5_fb'}, {type:'lift',wk:'p6_arms'}, {type:'lift',wk:'p5_upper'}, {type:'run',wk:'p5_trail'}, {type:'rest'}
    ],
    workouts:{}
  },

  // ========== PHASE 8: TANK MODE (Weeks 29-32) ==========
  {
    id:8, name:'Tank Mode', tag:'Peak Bulk Volume', weeks:4, liftDays:5, runDays:1, mode:'bulk',
    desc:'Final bulk phase. Maximum volume. You\'re the biggest and strongest you\'ve ever been. After this, we start stripping fat to reveal everything you\'ve built. Enjoy the strength \u2014 savor these PRs.',
    prog:'Maintain or push PRs on compounds. High volume on isolation. This is the last phase of surplus eating \u2014 make it count.',
    schedule:[
      {type:'lift',wk:'p6_push'}, {type:'lift',wk:'p6_pull'}, {type:'lift',wk:'p6_fb'}, {type:'lift',wk:'p6_arms'}, {type:'lift',wk:'p6_upper'}, {type:'run',wk:'p6_trail'}, {type:'rest'}
    ],
    workouts:{}
  },

  // ========== BLOCK 3: THE CUT (Weeks 33-44) ==========

  // ========== PHASE 9: STRIP DOWN (Weeks 33-36) ==========
  {
    id:9, name:'Strip Down', tag:'The Cut Begins', weeks:4, liftDays:4, runDays:2, mode:'cut',
    desc:'Time to reveal the muscle. Caloric deficit starts. Protein goes UP to 1.3g/lb to preserve every pound of muscle. Running comes back to 2x/week for extra calorie burn. Keep lifting HEAVY \u2014 maintaining strength = maintaining muscle.',
    prog:'DO NOT drop weight on compounds. The #1 mistake during a cut is going lighter. Maintain your heavy weights. Reduce volume (fewer sets) but NOT intensity. Your body keeps muscle it needs.',
    schedule:[
      {type:'lift',wk:'p9_push'}, {type:'lift',wk:'p9_pull'}, {type:'run',wk:'p9_tempo'}, {type:'lift',wk:'p9_fb'}, {type:'lift',wk:'p9_upper'}, {type:'run',wk:'p9_trail'}, {type:'rest'}
    ],
    workouts:{
      p9_push:{name:'Push',focus:'Chest, Shoulders, Triceps',dur:'45-50 min',
        warmup:'5 min jog, arm circles, 2 warm-up sets bench',cooldown:'Stretch \u2014 5 min.',
        exercises:[
          {id:'db_bench',sets:4,reps:'5',rest:120,int:'heavy',rpe:'8-9',note:'MAINTAIN your bench weight. Do not go lighter just because you\'re cutting.'},
          {id:'db_incline',sets:3,reps:'8',rest:75,int:'mod',rpe:'8',note:'Keep it heavy.'},
          {id:'db_shoulder',sets:3,reps:'10',rest:60,int:'mod',rpe:'8',note:'Maintain shoulder strength.'},
          {id:'db_lateral',sets:3,reps:'15',rest:45,int:'light',rpe:'8',note:'Keep hitting laterals.'},
          {id:'db_tri_oh',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Tricep maintenance.'},
          {id:'db_skull',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Tricep finisher.'},
          {id:'tri_pushdown',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Cable pushdowns — extra tricep volume to preserve arm size during the cut.'}
        ]},
      p9_pull:{name:'Pull',focus:'Back, Biceps, Traps',dur:'45-50 min',
        warmup:'5 min jog, arm circles, 2 warm-up deadlift sets',cooldown:'Stretch \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:4,reps:'3',rest:150,int:'heavy',rpe:'8-9',note:'HEAVY. Maintain your deadlift. This signals your body to keep the muscle.'},
          {id:'trap_row',sets:4,reps:'6',rest:90,int:'heavy',rpe:'8',note:'Heavy rows.'},
          {id:'db_row',sets:3,reps:'8 ea',rest:75,int:'mod',rpe:'8',note:'Maintain back thickness.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'mod',rpe:'8',note:'Keep the arm size.'},
          {id:'db_hammer',sets:3,reps:'10',rest:45,int:'mod',rpe:'7',note:'Arm maintenance.'},
          {id:'trap_shrug',sets:3,reps:'10',rest:45,int:'mod',rpe:'7',note:'Trap maintenance.'},
          {id:'db_lateral',sets:3,reps:'15',rest:45,int:'light',rpe:'8',note:'Lateral delts — keep the width through the cut.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]},
      p9_fb:{name:'Full Body (Upper Focus)',focus:'Heavy Maintenance',dur:'45-50 min',
        warmup:'5 min jog, arm circles, leg swings',cooldown:'Stretch \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:4,reps:'5',rest:120,int:'heavy',rpe:'8-9',note:'MAINTAIN. Do not drop weight on the cut. Heavy compound preserves muscle.'},
          {id:'db_bench',sets:3,reps:'6',rest:90,int:'heavy',rpe:'8',note:'Maintain pressing strength.'},
          {id:'db_row',sets:3,reps:'6 ea',rest:90,int:'heavy',rpe:'8',note:'Maintain pulling strength.'},
          {id:'db_shoulder',sets:3,reps:'8',rest:75,int:'mod',rpe:'8',note:'Maintain shoulders.'},
          {id:'db_split',sets:2,reps:'10 ea',rest:60,int:'mod',rpe:'7',note:'Leg maintenance \u2014 2 sets.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'mod',rpe:'7',note:'Arm maintenance.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Posture work.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]},
      p9_upper:{name:'Upper',focus:'Full Upper Maintenance',dur:'45-50 min',
        warmup:'5 min jog, arm circles, push-ups',cooldown:'Stretch \u2014 5 min.',
        exercises:[
          {id:'db_incline',sets:3,reps:'8',rest:75,int:'mod',rpe:'8',note:'Maintain pressing strength.'},
          {id:'db_row',sets:3,reps:'8 ea',rest:75,int:'mod',rpe:'8',note:'Maintain pull strength.'},
          {id:'db_bench',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Chest volume.'},
          {id:'db_shoulder',sets:3,reps:'10',rest:60,int:'mod',rpe:'7',note:'Shoulders.'},
          {id:'db_lateral',sets:3,reps:'15',rest:45,int:'light',rpe:'8',note:'Keep the width.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Arm maintenance.'},
          {id:'db_tri_oh',sets:3,reps:'10',rest:45,int:'light',rpe:'7',note:'Tricep maintenance.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'}
        ]},
      p9_tempo:{name:'Tempo Run',type:'run',dur:'30-35 min',dist:'3-3.5 miles',effort:'Mixed',
        desc:'Tempo intervals are back. Higher EPOC = more fat burned at rest for hours after. You know how to execute these from Phase 3.',
        details:['Warm up: 10 min easy','Main: 4\u00d73 min tempo (marathon pace or faster) / 2 min easy','Cool down: 5 min easy','EPOC burns extra calories for 12-24 hours']},
      p9_trail:{name:'Trail Run',type:'run',dur:'40-55 min',dist:'4-5 miles',effort:'Easy',
        desc:'Saturday fat-burning run. Longer now to maximize calorie expenditure during the cut.',
        details:['Pace: easy, Zone 2','Longer distance burns more fat','Poles for upper body engagement','~400-500 cal burned']}
    }
  },

  // ========== PHASE 10: REVEAL (Weeks 37-40) ==========
  {
    id:10, name:'Reveal', tag:'Deeper Cut', weeks:4, liftDays:4, runDays:2, mode:'cut',
    desc:'You\'re getting lean. Abs are appearing. Vascularity increasing. Keep the deficit, keep the protein high, keep lifting heavy. The muscle is there \u2014 we\'re just removing what\'s covering it.',
    prog:'Maintain all compound weights. If you lose a rep or two on isolation, that\'s OK. Focus on keeping compounds HEAVY. The scale is dropping but the mirror is getting better.',
    schedule:[
      {type:'lift',wk:'p9_push'}, {type:'lift',wk:'p9_pull'}, {type:'run',wk:'p9_tempo'}, {type:'lift',wk:'p9_fb'}, {type:'lift',wk:'p9_upper'}, {type:'run',wk:'p9_trail'}, {type:'rest'}
    ],
    workouts:{}
  },

  // ========== PHASE 11: SHRED (Weeks 41-44) ==========
  {
    id:11, name:'Shred', tag:'Final Cut', weeks:4, liftDays:3, runDays:3, mode:'shred',
    desc:'The final push. Deficit deepens. Running increases to 3x/week \u2014 think of it like your marathon taper but in reverse. You\'re using your endurance background as a weapon now. Every run strips more fat. Every heavy lift says \u201ckeep this muscle.\u201d',
    prog:'3 lift days focused on HEAVY compounds. Keep the weight on the bar. Run 3x/week including tempo. Protein at 1.3g/lb. Refeed meal every Sunday (eat at maintenance) to prevent metabolic adaptation.',
    schedule:[
      {type:'lift',wk:'p11_upper_h'}, {type:'run',wk:'p11_tempo'}, {type:'lift',wk:'p11_fb'}, {type:'run',wk:'p11_easy'}, {type:'lift',wk:'p11_upper_v'}, {type:'run',wk:'p11_trail'}, {type:'rest'}
    ],
    workouts:{
      p11_upper_h:{name:'Upper Heavy',focus:'Compound Strength',dur:'45-50 min',
        warmup:'5 min jog, arm circles, 2 warm-up sets',cooldown:'Stretch \u2014 5 min.',
        exercises:[
          {id:'db_bench',sets:4,reps:'5',rest:120,int:'heavy',rpe:'8-9',note:'HEAVY bench. Maintain your strength. This keeps your muscle.'},
          {id:'db_row',sets:4,reps:'6 ea',rest:90,int:'heavy',rpe:'8-9',note:'Heavy rows.'},
          {id:'db_shoulder',sets:3,reps:'8',rest:75,int:'mod',rpe:'8',note:'Heavy press.'},
          {id:'db_curl',sets:3,reps:'10',rest:45,int:'mod',rpe:'8',note:'Arm maintenance.'},
          {id:'db_lateral',sets:3,reps:'15',rest:45,int:'light',rpe:'8',note:'Width maintenance.'},
          {id:'db_tri_oh',sets:3,reps:'10',rest:45,int:'mod',rpe:'7',note:'Tricep maintenance.'},
          {id:'db_skull',sets:3,reps:'10',rest:45,int:'mod',rpe:'7',note:'Second tricep movement — preserve arm size at peak shred.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]},
      p11_fb:{name:'Full Body (Upper Focus)',focus:'Heavy Maintenance',dur:'45-50 min',
        warmup:'5 min jog, arm circles, leg swings',cooldown:'Stretch \u2014 5 min.',
        exercises:[
          {id:'trap_dl',sets:4,reps:'5',rest:120,int:'heavy',rpe:'8-9',note:'HEAVY deads. Maintain the weight. Non-negotiable during the shred \u2014 your lower stimulus.'},
          {id:'db_bench',sets:3,reps:'5',rest:120,int:'heavy',rpe:'8-9',note:'Maintain heavy bench.'},
          {id:'db_row',sets:3,reps:'6 ea',rest:90,int:'heavy',rpe:'8',note:'Maintain heavy rows.'},
          {id:'db_shoulder',sets:3,reps:'8',rest:75,int:'mod',rpe:'8',note:'Maintain shoulder press.'},
          {id:'db_split',sets:2,reps:'10 ea',rest:60,int:'mod',rpe:'7',note:'Leg maintenance \u2014 2 sets.'},
          {id:'db_lateral',sets:3,reps:'15',rest:45,int:'light',rpe:'8',note:'Width maintenance.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Posture work.'}
        ]},
      p11_upper_v:{name:'Upper Volume',focus:'Pump & Maintain',dur:'40-45 min',
        warmup:'5 min jog, arm circles, push-ups',cooldown:'Stretch \u2014 5 min.',
        exercises:[
          {id:'db_incline',sets:3,reps:'10',rest:60,int:'mod',rpe:'7-8',note:'Upper chest.'},
          {id:'trap_row',sets:3,reps:'10',rest:60,int:'mod',rpe:'7-8',note:'Back volume.'},
          {id:'db_lateral',sets:4,reps:'15',rest:45,int:'light',rpe:'8',note:'Shoulder width.'},
          {id:'db_curl',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Arm pump.'},
          {id:'db_hammer',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Arm thickness.'},
          {id:'db_skull',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Tricep pump.'},
          {id:'tri_pushdown',sets:3,reps:'12',rest:45,int:'light',rpe:'7',note:'Cable pushdowns to keep weekly tricep volume mid-range.'},
          {id:'face_pull',sets:3,reps:'12',rest:60,int:'light',rpe:'7',note:'Critical for posture and shoulder health. Use rope, pull to face, aim past ears with external rotation at top.'},
          {id:'hang_knee',sets:3,reps:'10-12',rest:45,int:'light',rpe:'7',note:'Ab finisher.'}
        ]},
      p11_tempo:{name:'Tempo Run',type:'run',dur:'30-35 min',dist:'3-3.5 miles',effort:'Mixed',
        desc:'Tempo intervals. Maximum EPOC. You\'re a runner \u2014 this is your weapon for fat burning.',
        details:['Warm up: 10 min easy','Main: 5\u00d73 min tempo / 90 sec easy','Cool down: 5 min easy','Hardest running session of the week']},
      p11_easy:{name:'Easy Run',type:'run',dur:'25-30 min',dist:'2-3 miles',effort:'Zone 2',
        desc:'Easy recovery run. Zone 2. Burns fat, helps recovery from yesterday\'s legs.',
        details:['Pace: easy, conversational','Active recovery','Fat burning in Zone 2']},
      p11_trail:{name:'Trail Run',type:'run',dur:'45-60 min',dist:'4-5 miles',effort:'Easy',
        desc:'Long easy trail run. Peak fat-burning session of the week. Poles for extra calorie expenditure.',
        details:['Pace: easy','Distance: push to 5 if feeling good','Poles recommended','~500-600 cal burned, mostly fat']}
    }
  },

  // ========== PHASE 12: PEAK (Weeks 45-48) ==========
  {
    id:12, name:'Peak', tag:'Veins & Abs', weeks:4, liftDays:3, runDays:3, mode:'shred',
    desc:'The final phase. You are lean, muscular, and getting shredded. Abs are clearly visible. Veins appearing on arms and shoulders. This phase finishes the job. Sunday is a REFEED day \u2014 eat at maintenance to keep metabolism firing and muscles full. You\'re going to look incredible.',
    prog:'Maintain ALL compound weights. Do not drop. Protein stays at 1.3g/lb. Sunday refeed: eat at TDEE with extra carbs \u2014 you\'ll look your best the day after a refeed. Take progress photos on Monday mornings.',
    schedule:[
      {type:'lift',wk:'p11_upper_h'}, {type:'run',wk:'p11_tempo'}, {type:'lift',wk:'p11_fb'}, {type:'run',wk:'p11_easy'}, {type:'lift',wk:'p11_upper_v'}, {type:'run',wk:'p11_trail'}, {type:'rest'}
    ],
    workouts:{}
  }
];
(function(){ let w=1; PHASES.forEach(p=>{ p.startWeek=w; w+=p.weeks; }); })();

// ---- NUTRITION TEMPLATES ----
// Meal plans verified against USDA food data. All calorie counts are REAL.
// Lift ~2,440 | Run ~2,240 | Rest ~2,040. Protein ~180g on all days.
// Cooking oil/condiments add ~50-100 cal — accounted for in the buffer.
const MEALS = {
  lift:[ // 7 meals, target ~2,350 cal + ~90 buffer = ~2,440
    {time:'6-7 AM',name:'Pre-Adderall Breakfast',note:'Eat BEFORE Adderall kicks in. You have ~20 min. Target: ~430 cal.',
     ex:['2 eggs + 6oz Greek yogurt + 1 toast + \u00bd banana (415 cal, 31g P)','3 eggs + 1 toast + small glass 2% milk (400 cal, 27g P)','\u00bd cup oats w/ 8oz milk + 1 scoop whey (420 cal, 37g P)']},
    {time:'10 AM',name:'Shake',note:'Liquid calories bypass Adderall appetite suppression. Target: ~340 cal.',
     ex:['1 scoop whey + 1 banana + 8oz 2% milk (347 cal, 33g P)','1 scoop whey + \u00bd banana + 1 tbsp PB + water (267 cal, 29g P)','1 scoop whey + \u00bd cup berries + 8oz milk (282 cal, 33g P)']},
    {time:'12:30 PM',name:'Lunch',note:'Something you can get down even without appetite. Target: ~420 cal.',
     ex:['4oz chicken breast + \u00be cup rice + veggies + 1 tsp oil (410 cal, 39g P)','3oz turkey + 2 bread + 1 slice cheese + lettuce/tomato (370 cal, 28g P)','1 can tuna + 1 tbsp light mayo + 2 bread + apple (420 cal, 32g P)']},
    {time:'~60 min pre-lift',name:'Pre-Workout',note:'Small. Just enough to fuel the session. Target: ~120 cal.',
     ex:['1 banana (105 cal, 1g P)','1 rice cake + 1 tbsp PB (130 cal, 5g P)','Small handful pretzels (110 cal, 3g P)']},
    {time:'Post-lift',name:'Post-Workout Shake',note:'Protein + carbs to start recovery. Target: ~250 cal.',
     ex:['1 scoop whey + 8oz 2% milk (242 cal, 32g P)','1 scoop whey + 1 banana + water (225 cal, 25g P)','1 scoop whey + 8oz OJ (232 cal, 26g P)']},
    {time:'6:30-7:30 PM',name:'Dinner',note:'Adderall wearing off = appetite returns. Your biggest meal. Target: ~560 cal.',
     ex:['6oz sirloin + medium potato + 1 cup broccoli + pat butter (530 cal, 51g P)','5oz salmon + 1 cup rice + mixed veggies + tsp oil (555 cal, 36g P)','6oz chicken thigh + sweet potato + green beans + tsp oil (520 cal, 41g P)']},
    {time:'9 PM',name:'Before Bed',note:'Slow protein feeds muscles overnight. Target: ~180 cal.',
     ex:['\u00be cup cottage cheese + small handful berries (195 cal, 21g P)','6oz Greek yogurt + \u00bd oz almonds (182 cal, 20g P)','1 scoop casein + water (120 cal, 24g P)']}
  ],
  run:[ // 6 meals, target ~2,150 cal + ~90 buffer = ~2,240
    {time:'6-7 AM',name:'Pre-Adderall Breakfast',note:'Eat before Adderall. Target: ~420 cal.',
     ex:['2 eggs + 1 toast + banana + 6oz milk (420 cal, 24g P)','3 eggs + 1 toast + \u00bd banana (348 cal, 22g P)','\u00bd cup oats w/ 8oz milk + 1 scoop whey (420 cal, 37g P)']},
    {time:'10 AM',name:'Shake',note:'Target: ~340 cal.',
     ex:['1 scoop whey + banana + 8oz 2% milk (347 cal, 33g P)','1 scoop whey + \u00bd cup berries + 8oz milk (282 cal, 33g P)']},
    {time:'12:30 PM',name:'Lunch',note:'Target: ~400 cal.',
     ex:['4oz chicken breast + \u00be cup rice + veggies + tsp oil (410 cal, 39g P)','3oz turkey + 2 bread + cheese + apple (415 cal, 28g P)']},
    {time:'Pre/Post Run',name:'Run Fuel',note:'Banana before, whey after. Target: ~225 cal combined.',
     ex:['Before: banana (105 cal, 1g P)','After: 1 scoop whey + water (120 cal, 24g P)','Combined total: ~225 cal, 25g P']},
    {time:'6:30-7:30 PM',name:'Dinner',note:'Target: ~540 cal.',
     ex:['5oz salmon + 1 cup rice + veggies + tsp oil (555 cal, 36g P)','6oz chicken thigh + sweet potato + greens + tsp oil (500 cal, 41g P)','4oz ground beef + 1 cup pasta + \u00bd cup sauce (500 cal, 30g P)']},
    {time:'9 PM',name:'Before Bed',note:'Target: ~180 cal.',
     ex:['\u00be cup cottage cheese + berries (195 cal, 21g P)','6oz Greek yogurt + \u00bd oz almonds (182 cal, 20g P)','1 scoop casein + water (120 cal, 24g P)']}
  ],
  rest:[ // 6 meals, target ~1,960 cal + ~80 buffer = ~2,040
    {time:'6-7 AM',name:'Pre-Adderall Breakfast',note:'Smallest breakfast. Target: ~370 cal.',
     ex:['2 eggs + 6oz Greek yogurt + \u00bd banana (296 cal, 29g P) + toast (376 cal)','3 eggs + 1 toast (296 cal, 21g P) + small glass milk (418 cal, 29g P)','\u00bd cup oats + 1 scoop whey + \u00bd banana (322 cal, 30g P)']},
    {time:'10 AM',name:'Shake',note:'Target: ~310 cal.',
     ex:['1 scoop whey + \u00bd banana + 8oz 2% milk (295 cal, 33g P)','1 scoop whey + banana + water (225 cal, 25g P) \u2014 add tbsp PB for 320 cal']},
    {time:'12:30 PM',name:'Lunch',note:'Target: ~370 cal.',
     ex:['4oz chicken breast + big salad + 1 tbsp dressing + apple (415 cal, 38g P)','3oz turkey + 2 bread + cheese (370 cal, 28g P)']},
    {time:'3:30 PM',name:'Afternoon Snack',note:'Target: ~150 cal.',
     ex:['6oz Greek yogurt + drizzle honey (132 cal, 17g P)','1 string cheese + small handful almonds (150 cal, 10g P)']},
    {time:'6:30-7:30 PM',name:'Dinner',note:'Biggest rest day meal. Target: ~540 cal.',
     ex:['5oz chicken breast + sweet potato + veggies + tsp oil (480 cal, 46g P)','5oz salmon + 1 cup rice + veggies (530 cal, 33g P)','4oz ground beef + 1 cup rice + \u00bd cup beans (490 cal, 30g P)']},
    {time:'9 PM',name:'Before Bed',note:'Target: ~180 cal.',
     ex:['\u00be cup cottage cheese + berries (195 cal, 21g P)','1 scoop casein + water (120 cal, 24g P)']}
  ]
};

const SUPPS = [
  {name:'Whey Protein',dose:'1-2 scoops/day',note:'Non-negotiable for hitting protein targets. Get whatever brand tastes good to you.'},
  {name:'Creatine Monohydrate',dose:'5g every single day',note:'Most studied supplement in sports science. Increases strength, muscle, and recovery. Put it in your shake. Timing doesn\'t matter. Don\'t skip days.'},
  {name:'Vitamin D3',dose:'3000-5000 IU/day',note:'Most people are deficient. Important for testosterone, recovery, mood. Take with a meal containing fat. Get a blood test (25-hydroxyvitamin D) to dial in your exact dose.'},
  {name:'Fish Oil',dose:'2-3g EPA+DHA/day',note:'Anti-inflammatory, heart health, joint health. Especially helpful with heavy lifting.'},
  {name:'Magnesium Glycinate',dose:'200-400mg before bed',note:'Helps sleep quality, muscle recovery, and reduces cramps. Most people are deficient.'}
];

const GROCERY = {
  protein:['Chicken breast/thighs','Ground beef (80/20)','Eggs (3-4 dozen/week)','Whey protein powder','Greek yogurt (plain)','Cottage cheese','Salmon/fish','Steak (sirloin or strip)','Turkey deli meat','Whole milk'],
  carbs:['White rice (easy to digest)','Oats (rolled or steel cut)','Whole grain bread','Potatoes','Sweet potatoes','Bananas (buy a lot)','Pasta','Granola','Honey','Rice cakes'],
  fats:['Natural peanut butter','Avocados','Olive oil','Almonds/mixed nuts','Butter','Cheese (cheddar, mozzarella)'],
  other:['Frozen stir-fry vegetables','Frozen berries (for shakes)','Broccoli','Spinach','Tomato sauce','Salt, pepper, garlic powder','Hot sauce (0 cal flavor)']
};

const ADDERALL_TIPS = [
  'Eat a full breakfast BEFORE your Adderall kicks in (usually 20-30 min after taking it). This is your #1 strategy.',
  'Rely on shakes and smoothies during peak suppression hours \u2014 liquid calories bypass appetite much better than solid food.',
  'Set meal alarms on your phone for every 2.5-3 hours. You won\'t feel hungry. Eat by the clock, not by feel.',
  'Front-load calories early morning and feast in the evening when it wears off.',
  'High-calorie density foods when appetite is low: peanut butter, nuts, whole milk, cheese, olive oil on everything.',
  'If you absolutely can\'t eat a full meal, at MINIMUM get a protein shake in. Protein is non-negotiable.',
  'Coffee amplifies Adderall\'s appetite suppression \u2014 limit caffeine to morning only if eating is a struggle.',
  'On weekends (if you skip Adderall), eat MORE. Make up for any weekday deficits.'
];

const RECOMP_TIPS = [
  'You\'re doing body recomposition: building muscle while losing fat simultaneously. This works because you\'re a beginner lifter with excess body fat.',
  'Calorie cycling is the key: eat more on lift days (fuel for growth), less on rest days (tap into fat stores).',
  'PROTEIN IS KING. Hit your protein target every single day regardless of anything else. Muscle can\'t grow without it.',
  'You don\'t need to be perfect. If you hit your protein target and stay in the right calorie range 80% of the time, you\'ll transform.',
  'Weight on the scale may not change much at first \u2014 you\'re losing fat and gaining muscle simultaneously. Trust the mirror and how clothes fit.',
  'If after 4 weeks the scale hasn\'t moved at all AND you don\'t look different, reduce rest day calories by 200.',
  'Hydration: 120+ oz of water daily. More on lift days. Muscles are 75% water.',
  'Sleep: 7-8 hours minimum. Growth hormone peaks during deep sleep. This is when muscle is actually built.',
  'Alcohol is the enemy of body recomp. It directly inhibits muscle protein synthesis and promotes fat storage. Minimize it.'
];

// ---- STATE ----
const S = {
  _p:'ir_',
  get(k){ try{return JSON.parse(localStorage.getItem(this._p+k))}catch(e){return null} },
  set(k,v){ localStorage.setItem(this._p+k,JSON.stringify(v)) },
  get startDate(){
    const d=this.get('start'); if(!d) return null;
    // v2 format: "YYYY-MM-DD" local date string
    if(typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d)){
      const [y,m,day]=d.split('-').map(Number);
      return new Date(y,m-1,day);
    }
    // v1 format: ISO UTC string — parse and migrate to local-date form on next setter call
    return new Date(d);
  },
  set startDate(d){ this.set('start', d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')); },
  get profile(){ return this.get('profile')||{}; },
  set profile(v){ this.set('profile',v); },
  get completed(){ return this.get('done')||{}; },
  setDone(ds,v){ const c=this.completed; if(v)c[ds]=true; else delete c[ds]; this.set('done',c); },
  session(ds){ return this.get('s_'+ds)||{}; },
  saveSession(ds,d){ this.set('s_'+ds,d); },
  get weightLog(){ return this.get('wlog')||[]; },
  addWeight(date,w){ const l=this.weightLog; const i=l.findIndex(e=>e.d===date); if(i>=0)l[i].w=w; else l.push({d:date,w:w}); l.sort((a,b)=>a.d.localeCompare(b.d)); this.set('wlog',l); },
  delWeight(date){ this.set('wlog',this.weightLog.filter(e=>e.d!==date)); },
  // Day swaps: bidirectional map { 'YYYY-MM-DD': 'YYYY-MM-DD' } — both directions stored for O(1) lookup
  get daySwaps(){ return this.get('swaps')||{}; },
  set daySwaps(v){ this.set('swaps',v); },
  addSwap(a,b){ const s=this.daySwaps; s[a]=b; s[b]=a; this.daySwaps=s; },
  clearSwap(date){ const s=this.daySwaps; const partner=s[date]; if(partner) delete s[partner]; delete s[date]; this.daySwaps=s; }
};

// ---- UTILITIES ----
function ds(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function norm(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function fmt(d){ const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return days[d.getDay()]+', '+mo[d.getMonth()]+' '+d.getDate(); }
function weekStart(d){ const day=d.getDay(); return norm(new Date(d.getFullYear(),d.getMonth(),d.getDate()+(day===0?-6:1-day))); }
function weekDates(off){ const s=weekStart(norm(new Date())); s.setDate(s.getDate()+off*7); return Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(d.getDate()+i);return d;}); }
function nextMon(){ const t=new Date(),d=t.getDay(); const diff=d===1?0:d===0?1:8-d; const m=new Date(t);m.setDate(t.getDate()+diff);return m; }

function phaseFor(date){
  if(!S.startDate)return null;
  const diff=Math.round((norm(date)-norm(S.startDate))/864e5);
  if(diff<0)return null;
  const wk=Math.floor(diff/7)+1;
  let cum=0;
  for(const p of PHASES){ if(wk<=cum+p.weeks) return{phase:p,wip:wk-cum,wk:wk}; cum+=p.weeks; }
  return null;
}
function workoutFor(date){
  const pi=phaseFor(date); if(!pi)return null;
  // If this date is part of a day-swap, look up the OTHER date's workout content
  // (display phase stays as the actual date's phase via `pi`).
  const dStr=ds(norm(date));
  const swappedTo=S.daySwaps[dStr];
  const lookupDate = swappedTo ? new Date(swappedTo+'T00:00:00') : date;
  const lookupPi = swappedTo ? (phaseFor(lookupDate) || pi) : pi;
  const diff=Math.round((norm(lookupDate)-norm(S.startDate))/864e5);
  const dayIdx=((diff%7)+7)%7;
  const e=lookupPi.phase.schedule[dayIdx];
  if(!e||e.type==='rest')return{type:'rest',pi,swappedFrom:swappedTo?dStr:null,swappedTo};
  // Look up workout in current phase first, then search all phases (allows cross-phase references)
  let w=lookupPi.phase.workouts[e.wk];
  if(!w) for(const p of PHASES){ if(p.workouts&&p.workouts[e.wk]){w=p.workouts[e.wk];break;} }
  if(!w) return{type:'rest',pi,swappedFrom:swappedTo?dStr:null,swappedTo};
  return{...w,type:e.type,pi,swappedFrom:swappedTo?dStr:null,swappedTo};
}

// ---- BODY COMPOSITION ----
function calcBody(currentWt, raceWt){
  const raceBF = 0.055; // ~5.5% BF for elite marathoner at race weight (veins on abs = sub-6%)
  const leanMass = Math.round(raceWt * (1 - raceBF) * 10) / 10;
  const fatMass = Math.round((currentWt - leanMass) * 10) / 10;
  const bf = Math.round(fatMass / currentWt * 1000) / 10;
  const tdee = Math.round(currentWt * 15.5);
  // Target: 10% BF with +17 lbs lean mass from muscle gain (15-20 lb range)
  const targetLean = leanMass + 17;
  const targetWt = Math.round(targetLean / 0.90); // 10% BF = shredded, abs visible year-round
  const fatToLose = Math.round(fatMass - (targetWt * 0.10));
  // Timeline estimate: ~12 months for full transformation
  const muscleToGain = 17;
  return { leanMass, fatMass, bf, tdee, targetLean, targetWt, fatToLose, muscleToGain };
}

function calcNutri(weight, liftD, runD, mode){
  liftD=liftD||4; runD=runD||2; mode=mode||'recomp'; const restD=7-liftD-runD;
  const tdee = Math.round(weight * 15.5);
  // Higher protein during cut/shred to preserve muscle in deficit (Helms et al. 2014: 1.8-2.7g/kg)
  const protein = Math.round(weight * (mode==='cut'||mode==='shred' ? 1.3 : 1.1));
  const proCal = protein * 4;
  const offsets = {
    recomp:{lift:100,run:300,rest:500},
    bulk:{lift:-250,run:0,rest:200},     // SURPLUS on lift days to fuel muscle growth
    cut:{lift:300,run:500,rest:700},      // Moderate deficit, preserve muscle
    shred:{lift:450,run:650,rest:800}     // Aggressive deficit, short-term only
  };
  const off = offsets[mode]||offsets.recomp;
  const result = { tdee, protein, mode };
  result.days = {};
  for(const [key,lbl] of [['lift','Lift Day'],['run','Run Day'],['rest','Rest Day']]){
    const cal = tdee - off[key];
    const fat = Math.round(weight * 0.4);
    const fatCal = fat * 9;
    let carbs = Math.round((cal - proCal - fatCal) / 4);
    if(carbs < 100) carbs = 100;
    result.days[key] = { cal, protein, carbs, fat, label:lbl };
  }
  const wkCal = result.days.lift.cal * liftD + result.days.run.cal * runD + result.days.rest.cal * restD;
  result.weeklyAvg = Math.round(wkCal / 7);
  result.weeklyDeficit = tdee - result.weeklyAvg;
  result.weeklyChange = Math.round(Math.abs(result.weeklyDeficit) * 7 / 3500 * 10) / 10;
  result.isSurplus = result.weeklyDeficit < 0;
  return result;
}

// ---- PROGRESSION LOGIC (per-set tracking + conservative double progression) ----

// Smallest meaningful weight jump for an exercise
function stepFor(ex){
  if(!ex) return 5;
  const eq = (ex.equip || '').toLowerCase();
  if(eq.includes('trap bar') || eq.includes('machine') || eq.includes('cable')) return 5;
  if(ex.unit === 'each') return 2.5;
  return 5;
}

// Read a session's performance for one exercise. Returns an array of {w, r} per set
// (only completed sets — incomplete sets are absent). Supports both the new per-set
// storage (ses.perf[exId]) and the legacy storage (ses.sets[exId] boolean + ses.wts[exId]).
function sessionPerf(ses, exId){
  if(!ses) return null;
  // New format first
  if(ses.perf && Array.isArray(ses.perf[exId])){
    const out = ses.perf[exId].filter(p => p && typeof p.w === 'number' && typeof p.r === 'number');
    return out.length ? out : null;
  }
  // Legacy: boolean sets + single weight, infer from context
  const sets = ses.sets && ses.sets[exId];
  const wt = ses.wts && ses.wts[exId];
  if(Array.isArray(sets) && wt){
    // We don't know the target reps from old data — just mark completed sets as "hit target"
    // by recording a sentinel reps value equal to the prescribed target at suggest time.
    return sets.map(done => done ? { w: wt, r: null } : null).filter(Boolean);
  }
  return null;
}

// Walk back up to 180 days. Return the most recent session that has any perf data
// for this exercise, along with the "target reps" for that session (parsed from the
// scheduled workout, best-effort).
function lastPerformance(exId, beforeDate){
  const start = norm(beforeDate || new Date());
  for(let i=1;i<180;i++){
    const d = new Date(start); d.setDate(d.getDate()-i);
    const ses = S.session(ds(d));
    const perf = sessionPerf(ses, exId);
    if(perf && perf.length){
      // Try to find the prescribed reps from the scheduled workout on that day.
      let targetReps = null;
      try {
        const w = S.startDate ? workoutFor(d) : null;
        if(w && w.exercises){
          const match = w.exercises.find(e => e.id === exId);
          if(match) targetReps = parseInt(match.reps) || null;
        }
      } catch(e) {}
      return { date: ds(d), perf, targetReps };
    }
  }
  return null;
}

// Conservative double progression:
//   1. Group completed sets by weight attempted.
//   2. Find the heaviest weight where the user made a genuine attempt.
//   3. If ALL sets at that weight hit target reps -> bump to weight + step.
//   4. If SOME sets at that weight fell short -> hold the weight, try to finish next time.
//   5. If MOST sets at that weight fell well short (<60% of target reps, averaged) -> drop one step.
function suggestNext(exId, targetRepsHint){
  const ex = EX[exId]; if(!ex) return null;
  const last = lastPerformance(exId, new Date());
  if(!last) return { weight: ex.defaultBase, label: 'start', last: null, unit: ex.unit };
  const step = stepFor(ex);
  const { perf } = last;
  // Target reps: prefer the caller's hint (today's prescribed), fall back to last session's.
  const target = targetRepsHint || last.targetReps || null;

  // Top weight actually attempted
  const topWeight = perf.reduce((m, p) => Math.max(m, p.w), 0);
  const atTop = perf.filter(p => p.w === topWeight);

  // Count how many at top weight fully hit target reps. For legacy data (r === null),
  // treat completion as "hit target" — that's all the info we have.
  const hitTargetCount = atTop.filter(p => p.r === null || (target && p.r >= target)).length;
  const totalAtTop = atTop.length;

  // Average rep ratio at top weight (for drop detection)
  let avgRatio = 1;
  if(target){
    const ratios = atTop.map(p => p.r === null ? 1 : Math.min(1, p.r / target));
    avgRatio = ratios.reduce((s,x)=>s+x, 0) / ratios.length;
  }

  const summary = {
    topWeight,
    totalAtTop,
    hitTargetCount,
    avgRatio: Math.round(avgRatio * 100) / 100,
    targetReps: target,
  };

  // Conservative rules
  if(hitTargetCount >= totalAtTop && totalAtTop > 0){
    return { weight: topWeight + step, label: 'bump', last, summary, step, unit: ex.unit };
  }
  if(avgRatio < 0.6){
    return { weight: Math.max(0, topWeight - step), label: 'drop', last, summary, step, unit: ex.unit };
  }
  return { weight: topWeight, label: 'hold', last, summary, step, unit: ex.unit };
}

// ---- STRENGTH BALANCE (upper vs lower) ----
// Compares best estimated 1-rep max on trap_dl (lower) against db_bench × 2 (upper, total load).
// Marathon-background users typically start very lower-dominant; this card surfaces that fact
// and tells the user when they've closed the gap enough to bring leg days back.
function strengthBalance(){
  const targets = ['trap_dl', 'db_bench'];
  const best = {};
  for(let i=0; i<180; i++){
    const d = new Date(); d.setDate(d.getDate() - i);
    const ses = S.session(ds(norm(d)));
    targets.forEach(exId => {
      const perf = sessionPerf(ses, exId);
      if(!perf || !perf.length) return;
      perf.forEach(p => {
        if(p.w == null || p.r == null) return;
        // Epley e1RM. Cap reps at 12 to avoid overestimating from very high-rep sets.
        const r = Math.min(p.r, 12);
        const e1rm = p.w * (1 + r / 30);
        if(!best[exId] || e1rm > best[exId].e1rm){ best[exId] = { e1rm, w: p.w, r: p.r }; }
      });
    });
  }
  if(!best.trap_dl || !best.db_bench) return null;
  const lower = best.trap_dl.e1rm;
  const benchTotal = best.db_bench.e1rm * 2; // each DB is one side
  const ratio = lower / benchTotal;
  let level, msg;
  if(ratio > 2.5){
    level = 'Lower-dominant';
    msg = 'Your trap-bar deadlift is roughly ' + ratio.toFixed(1) + '× your bench. Years of marathon training built that lower body — the current upper-focused split is exactly the right move. Keep at it.';
  } else if(ratio > 2.0){
    level = 'Lower-leaning';
    msg = 'Lower body still leads upper. The upper-focus split is doing its job — keep pushing chest, back, and shoulders.';
  } else if(ratio > 1.4){
    level = 'Balanced';
    msg = 'Upper and lower are roughly balanced now. The upper-focus emphasis still helps hypertrophy distribution, but you could also consider reintroducing a leg day in the next phase.';
  } else {
    level = 'Upper-strong';
    msg = 'Upper body has caught up. Time to bring back a real leg session in the next phase to keep posterior-chain strength up.';
  }
  return { ratio, lower, benchTotal, best, level, msg };
}

// ---- LIFT PR TRACKING ----
function getLiftPRs(){
  const prs = {};
  for(let i=0;i<180;i++){
    const d=new Date(); d.setDate(d.getDate()-i);
    const ses=S.session(ds(norm(d)));
    if(ses.wts){
      for(const [exId,wt] of Object.entries(ses.wts)){
        if(wt && (!prs[exId] || wt > prs[exId])) prs[exId] = wt;
      }
    }
  }
  return prs;
}

// ---- PLAN MANAGEMENT ----
const Plans = {
  _key:'ir_plans',
  getAll(){ try{return JSON.parse(localStorage.getItem(this._key))||[];}catch(e){return[];} },
  save(name){
    const plans=this.getAll(), data={};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k.startsWith('ir_')&&k!==this._key) data[k]=localStorage.getItem(k);
    }
    const idx=plans.findIndex(p=>p.name===name);
    const plan={name, savedAt:new Date().toISOString(), data};
    if(idx>=0) plans[idx]=plan; else plans.push(plan);
    localStorage.setItem(this._key,JSON.stringify(plans));
  },
  load(name){
    const plan=this.getAll().find(p=>p.name===name);
    if(!plan) return false;
    // Clear current data (preserve saved plans list)
    Object.keys(localStorage).filter(k=>k.startsWith('ir_')&&k!==this._key).forEach(k=>localStorage.removeItem(k));
    for(const [k,v] of Object.entries(plan.data)) localStorage.setItem(k,v);
    return true;
  },
  del(name){
    localStorage.setItem(this._key,JSON.stringify(this.getAll().filter(p=>p.name!==name)));
  },
  reset(){
    Object.keys(localStorage).filter(k=>k.startsWith('ir_')&&k!==this._key).forEach(k=>localStorage.removeItem(k));
  }
};

// ---- APP ----
const App = {
  tab:'today', woff:0, ntab:'simple',

  init(){
    // Auto-clear stale data from old app versions
    if(S.get('appver')!==APP_VERSION){ Plans.reset(); S.set('appver',APP_VERSION); }
    document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
      this.tab=t.dataset.tab; this.woff=0; this.render();
    }));
    document.getElementById('menu-btn').addEventListener('click',()=>this.showPlansMenu());
    this.render();
  },

  render(){
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===this.tab));
    const b=document.getElementById('phase-badge');
    if(!S.startDate) b.textContent='NOT STARTED';
    else{ const pi=phaseFor(norm(new Date())); b.textContent=pi?`Phase ${pi.phase.id} \u00b7 Wk ${pi.wip}`:'COMPLETE'; }
    const el=document.getElementById('content');
    switch(this.tab){
      case'today':el.innerHTML=this.rToday();break;
      case'calendar':el.innerHTML=this.rCal();break;
      case'program':el.innerHTML=this.rProg();break;
      case'nutrition':el.innerHTML=this.rNutri();break;
      case'log':el.innerHTML=this.rLog();break;
    }
    this.bind();
  },

  // ---- TODAY ----
  rToday(){
    const today=norm(new Date());
    if(!S.startDate) return this.rSetup();
    if(today<norm(S.startDate)) return`<div class="rest-hero"><h2>Program Starts Soon</h2><p>Your program begins ${fmt(norm(S.startDate))}. Get your nutrition dialed in, stock up on groceries, and rest up.</p></div>`;
    const w=workoutFor(today);
    if(!w) return`<div class="rest-hero"><h2>Program Complete!</h2><p>You crushed all 16 weeks. Time to assess, take progress photos, and plan your next cycle.</p></div><div style="text-align:center;margin-top:16px"><button class="btn-secondary" id="reset-btn">Start New Cycle</button></div>`;
    if(w.type==='rest') return this.rRest(today,w.pi);
    if(w.type==='run') return this.rRun(w,today);
    return this.rLift(w,today);
  },

  rSetup(){
    const def=ds(norm(new Date()));
    return`<div class="setup">
      <h2>IRON<span class="accent">RUNNER</span></h2>
      <p class="sub">16-Week Body Recomposition</p>
      <div class="card">
        <p style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:16px">Lose fat. Build muscle. Get shredded. Built for your home gym and your running background. Calorie cycling + progressive overload + strategic running = body transformation.</p>
        <div class="equip-list"><h3>Your Equipment</h3><ul><li>Trap bar + plates + crash pads</li><li>Adjustable bench (incline/decline)</li><li>Adjustable dumbbells</li></ul></div>
        <div class="form-row"><div class="form-group"><label>Current Weight (lbs)</label><input type="number" id="start-wt" placeholder="164" inputmode="decimal"></div>
        <div class="form-group"><label>Race Weight (lbs)</label><input type="number" id="race-wt" placeholder="137" inputmode="decimal"></div></div>
        <div id="bc-preview"></div>
        <div class="form-group"><label>Start Date</label><input type="date" id="start-date" value="${def}"></div>
        <button class="btn-primary" id="setup-btn">START PROGRAM</button>
      </div></div>`;
  },

  rRest(date,pi){
    const wl=S.weightLog, cw=wl.length?wl[wl.length-1].w:(S.profile.currentWt||0);
    const n=cw?calcNutri(cw,pi.phase.liftDays,pi.phase.runDays,pi.phase.mode):null, m=n?n.days.rest:null;
    return`<div class="today-date">${fmt(date)}</div><div class="today-phase">Phase ${pi.phase.id} \u00b7 Week ${pi.wip}</div>
    ${this.swapBar(date)}
    <div class="rest-hero"><h2>Rest Day</h2><p>Recovery is when muscle actually grows. Your body is repairing and building right now. Stay active with a walk or easy 20-min jog if you want, but no lifting.</p></div>
    ${m?`<div class="card"><div class="section-title">Today's Targets</div><span class="day-type day-type-rest">Rest Day</span><div style="margin-top:8px"><div style="font-size:20px;font-weight:800">${m.cal.toLocaleString()} cal</div><div style="font-size:12px;color:var(--muted)">${m.protein}g protein \u00b7 ${m.carbs}g carbs \u00b7 ${m.fat}g fat</div></div></div>`:''}
    <div class="card"><div class="section-title">Recovery Checklist</div><ul class="tip-list"><li>Hit your protein target (${m?m.protein+'g':'~165g'}) \u2014 muscles can\'t recover without it</li><li>Stay hydrated \u2014 120+ oz water</li><li>Stretch or foam roll anything that\'s sore</li><li>7-8 hours sleep tonight (growth hormone peaks during deep sleep)</li><li>Take your creatine (every day, even rest days)</li><li>Optional: easy 20-min jog or walk for active recovery + extra fat burning</li></ul></div>`;
  },

  rRun(w,date){
    const d=ds(date),done=S.completed[d],wl=S.weightLog,cw=wl.length?wl[wl.length-1].w:(S.profile.currentWt||0);
    const n=cw?calcNutri(cw,w.pi.phase.liftDays,w.pi.phase.runDays,w.pi.phase.mode):null,m=n?n.days.run:null;
    return`<div class="today-date">${fmt(date)}</div><div class="today-phase">Phase ${w.pi.phase.id} \u00b7 Week ${w.pi.wip}</div>
    ${this.swapBar(date)}
    <div class="today-title">${w.name}</div><div style="font-size:13px;color:var(--run);font-weight:600;margin-bottom:4px">${w.dist} \u00b7 ${w.dur}</div>
    ${m?`<div style="margin-bottom:16px"><span class="day-type day-type-run">Run Day</span> <span style="font-size:12px;color:var(--muted)">${m.cal.toLocaleString()} cal \u00b7 ${m.protein}g protein</span></div>`:''}
    <div class="card"><p style="font-size:13px;line-height:1.5;margin-bottom:12px">${w.desc}</p>${w.details.map(t=>`<div style="padding:5px 0;font-size:13px;color:var(--muted)">\u2192 ${t}</div>`).join('')}</div>
    <button class="btn-complete${done?' completed':''}" id="complete-btn">${done?'RUN COMPLETE \u2713':'COMPLETE RUN'}</button>`;
  },

  rLift(w,date){
    const d=ds(date),ses=S.session(d),done=S.completed[d],wl=S.weightLog,cw=wl.length?wl[wl.length-1].w:(S.profile.currentWt||0);
    const n=cw?calcNutri(cw,w.pi.phase.liftDays,w.pi.phase.runDays,w.pi.phase.mode):null,m=n?n.days.lift:null;
    let h=`<div class="today-date">${fmt(date)}</div><div class="today-phase">Phase ${w.pi.phase.id} \u00b7 Week ${w.pi.wip}</div>
    ${this.swapBar(date)}
    <div class="today-title">${w.name}</div><div class="today-focus">${w.focus} \u00b7 ${w.dur}</div>
    ${m?`<div style="margin-bottom:12px"><span class="day-type day-type-lift">Lift Day</span> <span style="font-size:12px;color:var(--muted)">${m.cal.toLocaleString()} cal \u00b7 ${m.protein}g protein</span></div>`:''}
    <div class="wc"><strong>Warm Up</strong>${w.warmup}</div>`;

    w.exercises.forEach(ex=>{
      const info=EX[ex.id];
      const targetReps = parseInt(ex.reps) || null;
      const tgt = suggestNext(ex.id, targetReps);
      const numSets = parseInt(ex.sets);
      const intCls = ex.int==='heavy'?'int-heavy':ex.int==='light'?'int-light':'int-mod';
      const intLbl = ex.int==='heavy'?'HEAVY':ex.int==='light'?'LIGHT':'MODERATE';
      const unitLbl = tgt && tgt.unit==='each' ? 'lbs ea' : 'lbs';
      const perf = (ses.perf && ses.perf[ex.id]) || [];
      // Legacy fallback: if user used the old UI today, hydrate perf from ses.sets + ses.wts
      const legacySets = ses.sets && ses.sets[ex.id];
      const legacyWt = ses.wts && ses.wts[ex.id];
      const suggestedW = tgt ? tgt.weight : info.defaultBase;

      h+=`<div class="exercise">
        <div class="exercise-header">
          <span class="exercise-name" data-exid="${ex.id}">${info.name}</span>
          <span class="exercise-rx">${ex.sets} \u00d7 ${ex.reps}</span>
        </div>
        <div class="exercise-meta">
          <span class="int ${intCls}">${intLbl}</span>
          <span class="rpe-tag">RPE ${ex.rpe}</span>
          <a href="${info.yt}" target="_blank" class="yt-link">\u25b6 Watch Form</a>
        </div>
        <div class="exercise-note">${ex.note}</div>`;

      // Target weight row \u2014 conservative double progression based on per-set history
      if(tgt){
        if(tgt.label==='start'){
          h+=`<div class="target-row"><span class="target-wt">Suggested start: ~${tgt.weight} ${unitLbl}</span></div>`;
        } else if(tgt.label==='bump'){
          h+=`<div class="target-row"><span class="target-wt">Target: ${tgt.weight} ${unitLbl}</span> <span class="target-inc">\u2191${tgt.step} \u2014 ${tgt.summary.hitTargetCount}/${tgt.summary.totalAtTop} sets hit ${tgt.summary.targetReps||'target'} reps at ${tgt.summary.topWeight}</span></div>`;
        } else if(tgt.label==='hold'){
          const last = tgt.summary;
          const hitNote = last.targetReps ? `${last.hitTargetCount}/${last.totalAtTop} sets hit ${last.targetReps} reps at ${last.topWeight}` : `last: ${last.totalAtTop} sets at ${last.topWeight}`;
          h+=`<div class="target-row"><span class="target-wt">Target: ${tgt.weight} ${unitLbl}</span> <span class="target-inc" style="color:var(--muted)">Hold \u2014 ${hitNote}</span></div>`;
        } else if(tgt.label==='drop'){
          h+=`<div class="target-row"><span class="target-wt">Target: ${tgt.weight} ${unitLbl}</span> <span class="target-inc" style="color:var(--danger)">\u2193${tgt.step} \u2014 avg ${Math.round(tgt.summary.avgRatio*100)}% of target reps at ${tgt.summary.topWeight}</span></div>`;
        }
      }

      // Per-set rows: weight \u00d7 reps + check button
      h+=`<div class="set-list">`;
      for(let s=0; s<numSets; s++){
        const p = perf[s];
        // Derive initial values: prefer per-set perf, else legacy same-weight + legacy checkmark, else defaults
        let wVal = p ? p.w : (legacyWt || '');
        let rVal = p ? (p.r !== null ? p.r : (targetReps || '')) : '';
        const isDone = !!p || (Array.isArray(legacySets) && legacySets[s]);
        const wPh = suggestedW;
        const rPh = targetReps || '';
        h+=`<div class="set-row${isDone?' done':''}" data-exid="${ex.id}" data-set="${s}">
          <span class="set-num">${s+1}</span>
          <input type="number" class="set-wt" data-exid="${ex.id}" data-set="${s}" value="${wVal}" placeholder="${wPh}" inputmode="decimal">
          <span class="set-x">\u00d7</span>
          <input type="number" class="set-reps" data-exid="${ex.id}" data-set="${s}" value="${rVal}" placeholder="${rPh}" inputmode="numeric">
          <button class="set-check${isDone?' done':''}" data-exid="${ex.id}" data-set="${s}" data-rest="${ex.rest}" aria-label="Complete set ${s+1}">\u2713</button>
        </div>`;
      }
      h+=`</div>
        <div class="set-actions">
          <button class="rest-btn" data-rest="${ex.rest}">Rest ${ex.rest}s</button>
          <span class="set-hint">${info.unit==='each'?'lbs per DB':'total lbs'}</span>
        </div></div>`;
    });

    h+=`<div class="wc"><strong>Cool Down</strong>${w.cooldown}</div>
    <button class="btn-complete${done?' completed':''}" id="complete-btn">${done?'WORKOUT COMPLETE \u2713':'COMPLETE WORKOUT'}</button>`;
    return h;
  },

  // ---- CALENDAR ----
  rCal(){
    const dates=weekDates(this.woff),today=ds(norm(new Date())),done=S.completed;
    const dn=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const s1=dates[0].toLocaleDateString('en',{month:'short',day:'numeric'});
    const s2=dates[6].toLocaleDateString('en',{month:'short',day:'numeric'});
    let h=`<div class="week-nav"><button data-dir="-1">\u2190 Prev</button><span>${s1} \u2013 ${s2}</span><button data-dir="1">Next \u2192</button></div>`;
    dates.forEach((d,i)=>{
      const dd=ds(d),w=S.startDate?workoutFor(d):null,isT=dd===today,isD=done[dd];
      const isSwapped = !!(S.daySwaps && S.daySwaps[dd]);
      let badge='',nm='',det='';
      if(!w||!S.startDate){nm='Not Started';}
      else if(!phaseFor(d)){nm='Program Complete';}
      else if(w.type==='rest'){nm='Rest Day';det='Recovery + nutrition';}
      else if(w.type==='lift'){badge='<span class="badge badge-lift">LIFT</span>';nm=w.name;det=w.focus+' \u00b7 '+w.dur;}
      else if(w.type==='run'){badge='<span class="badge badge-run">RUN</span>';nm=w.name;det=w.dist+' \u00b7 '+w.effort;}
      const swapMark = isSwapped ? ' <span class="swap-glyph" title="swapped">\u2194</span>' : '';
      h+=`<div class="day-card${isT?' today':''}${isD?' completed':''}${isSwapped?' swapped':''}" data-date="${dd}"><div class="day-date"><div class="dow">${dn[i]}</div><div class="dom">${d.getDate()}</div></div><div class="day-info"><div class="dw">${nm} ${badge}${swapMark}</div><div class="dd">${det}</div></div>${isD?'<div class="day-check">\u2713</div>':''}</div>`;
    });
    return h;
  },

  // ---- PROGRAM ----
  rProg(){
    const pi=S.startDate?phaseFor(norm(new Date())):null;
    const tot=PHASES.reduce((s,p)=>s+p.weeks,0);
    const cw=pi?pi.wk:(S.startDate?tot+1:0);
    const pct=S.startDate?Math.min(cw/tot*100,100):0;
    // Show actual day names based on start date
    const startDow=S.startDate?norm(S.startDate).getDay():4;
    const dns=['Su','Mo','Tu','We','Th','Fr','Sa'];
    const dlab=Array.from({length:7},(_,i)=>dns[(startDow+i)%7]);
    let h=`<div class="section-title">Program Progress</div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:20px"><span>Week ${Math.min(cw,tot)} of ${tot}</span><span>${Math.round(pct)}%</span></div>`;
    PHASES.forEach(p=>{
      const cur=pi&&pi.phase.id===p.id,past=pi&&pi.phase.id>p.id,allDone=!pi&&S.startDate;
      h+=`<div class="phase-card${cur?' current':''}${past||allDone?' past':''}"><div class="phase-hdr"><span class="phase-name">Phase ${p.id}: ${p.name}</span><span class="phase-wk">Wks ${p.startWeek}\u2013${p.startWeek+p.weeks-1}</span></div><div class="phase-tag">${p.tag}</div><div class="phase-desc">${p.desc}</div><div class="phase-sched">${p.schedule.map((e,idx)=>{const t=e?e.type:'rest';return`<div class="phase-sched-day ${t}"><div class="dl">${dlab[idx]}</div><div>${t==='lift'?'L':t==='run'?'R':'\u2013'}</div></div>`;}).join('')}</div><div style="margin-top:8px;font-size:12px;color:var(--dim)">${p.liftDays} lift \u00b7 ${p.runDays} run \u00b7 ${7-p.liftDays-p.runDays} rest</div><div style="margin-top:6px;font-size:12px;color:var(--muted);line-height:1.4"><strong style="color:var(--text);font-size:11px">PROGRESSION:</strong> ${p.prog}</div></div>`;
    });
    if(S.startDate)h+=`<div style="text-align:center;margin-top:20px"><button class="btn-secondary" id="reset-btn" style="color:var(--danger);border-color:var(--danger)">Reset Program</button></div>`;
    return h;
  },

  // ---- NUTRITION ----
  rNutri(){
    const p=S.profile, wl=S.weightLog;
    const wt=wl.length?wl[wl.length-1].w:(p.currentWt||164);
    const today=norm(new Date()), pi=phaseFor(today), ph=pi?pi.phase:PHASES[0];
    const n=calcNutri(wt, ph.liftDays, ph.runDays, ph.mode);
    const w=S.startDate?workoutFor(today):null;
    const dayType=w?(w.type==='lift'?'lift':w.type==='run'?'run':'rest'):'rest';

    let h=`<div class="sub-tabs">
      <button class="sub-tab${this.ntab==='simple'?' active':''}" data-st="simple">Simple</button>
      <button class="sub-tab${this.ntab==='supps'?' active':''}" data-st="supps">Supps</button>
      <button class="sub-tab${this.ntab==='today'?' active':''}" data-st="today">Today</button>
      <button class="sub-tab${this.ntab==='macros'?' active':''}" data-st="macros">Macros</button>
      <button class="sub-tab${this.ntab==='grocery'?' active':''}" data-st="grocery">Grocery</button>
      <button class="sub-tab${this.ntab==='tips'?' active':''}" data-st="tips">Tips</button>
    </div>`;

    if(this.ntab==='simple'){
      const pTarget = Math.round(wt);
      h+=`<div class="card">
        <div class="section-title">Simple Eating (No Tracking)</div>
        <p style="font-size:13px;line-height:1.5;margin-bottom:12px">Skip the spreadsheets. These rules get you 90% of the way there without tracking a calorie.</p>
        <ul class="tip-list">
          <li><strong>Protein:</strong> ~${pTarget}g per day (your bodyweight in lbs). Hit 4 protein doses of 25–40g each.</li>
          <li><strong>Carbs:</strong> heavier around lifts (rice, toast, fruit). Lighter on rest days.</li>
          <li><strong>Fat:</strong> don't fear it. Eggs, cheese, avocado, olive oil. ~${Math.round(wt*0.4)}g/day.</li>
          <li><strong>Veggies:</strong> at dinner, every day. Frozen is fine.</li>
          <li><strong>Water:</strong> 120+ oz. More on lift days.</li>
        </ul>
      </div>
      <div class="card">
        <div class="section-title">Cut Day Template (your style)</div>
        <div class="meal"><div class="meal-time">Breakfast</div><div class="meal-name">Protein Shake</div><div class="meal-note">1 scoop whey + water or milk + coffee. ~25g P.</div></div>
        <div class="meal"><div class="meal-time">Lunch</div><div class="meal-name">Skip, or light</div><div class="meal-note">Tuna packet + Frank's Red Hot (no rice). ~17g P. Or just skip entirely.</div></div>
        <div class="meal"><div class="meal-time">Dinner</div><div class="meal-name">Family Meal + Lean Protein</div><div class="meal-note">Whatever's for dinner + 6oz of chicken/steak/fish. Eat normally with family.</div></div>
        <div class="meal"><div class="meal-time">If dying at night</div><div class="meal-name">Optional Snack</div><div class="meal-note">Cottage cheese, second shake, or Greek yogurt. Never skip protein.</div></div>
      </div>
      <div class="card">
        <div class="section-title">Build Day Template (lift days)</div>
        <div class="meal"><div class="meal-time">Breakfast</div><div class="meal-name">3 Eggs + Toast + Cheese</div><div class="meal-note">~35g P. Carbs for the lift ahead.</div></div>
        <div class="meal"><div class="meal-time">Lunch</div><div class="meal-name">Tuna Rice Bowl</div><div class="meal-note">Tuna packet + 1 cup rice + Frank's + sliced avocado. ~40g P.</div></div>
        <div class="meal"><div class="meal-time">Pre-workout</div><div class="meal-name">Banana or Rice Cake</div><div class="meal-note">Small carb hit ~30–60 min before lifting.</div></div>
        <div class="meal"><div class="meal-time">Post-workout</div><div class="meal-name">Whey Shake</div><div class="meal-note">1 scoop (25g P) with 5g creatine + 10g collagen. Your daily supp dose.</div></div>
        <div class="meal"><div class="meal-time">Dinner</div><div class="meal-name">Family Meal + Protein</div><div class="meal-note">Normal dinner. Steak when you have time. Chicken or fish otherwise.</div></div>
      </div>
      <div class="card">
        <div class="section-title">Protein Cheat Sheet (your foods)</div>
        <div class="list-item"><div><div class="nm">Tuna packet (2.6 oz)</div></div><div class="ds">17g</div></div>
        <div class="list-item"><div><div class="nm">3 eggs</div></div><div class="ds">18g</div></div>
        <div class="list-item"><div><div class="nm">1 cup cottage cheese</div></div><div class="ds">25g</div></div>
        <div class="list-item"><div><div class="nm">1 scoop whey</div></div><div class="ds">25g</div></div>
        <div class="list-item"><div><div class="nm">6 oz cooked steak</div></div><div class="ds">45g</div></div>
        <div class="list-item"><div><div class="nm">1 cup Greek yogurt</div></div><div class="ds">20g</div></div>
      </div>
      <div class="card">
        <div class="section-title">Adderall Timing</div>
        <ul class="tip-list">
          <li>Eat breakfast BEFORE Adderall kicks in (~20 min window).</li>
          <li>Liquid calories (shake) bypass appetite suppression mid-day.</li>
          <li>Dinner is your feast — appetite returns as it wears off.</li>
          <li>Weekends (if skipping Adderall): eat more to make up any deficit.</li>
        </ul>
      </div>`;
    }
    else if(this.ntab==='supps'){
      h+=`<div class="card">
        <div class="section-title">Creatine Monohydrate</div>
        <div style="font-size:13px;line-height:1.6;margin-bottom:8px"><strong style="color:var(--success)">Take it daily.</strong> Most studied supplement in sports science.</div>
        <ul class="tip-list">
          <li><strong>Dose:</strong> 3–5g/day. No loading phase needed — saturation arrives in 2–4 weeks either way.</li>
          <li><strong>When:</strong> any time, with or without food. Mixing into your protein shake is perfect.</li>
          <li><strong>Safety:</strong> 30+ years of research. Kidney/liver concerns are myths in healthy adults. No stomach issues at 3–5g.</li>
          <li><strong>Benefits:</strong> ~5–10% strength, muscle fullness (intracellular water), emerging cognitive benefits.</li>
          <li><strong>Buy:</strong> ON Micronized or BulkSupplements — <strong>$15–25 for 6+ months</strong>. Skip "HCL", "ethyl ester", or "buffered" variants — no better, much more expensive.</li>
        </ul>
      </div>
      <div class="card">
        <div class="section-title">Whey Protein</div>
        <div style="font-size:13px;line-height:1.6;margin-bottom:8px"><strong style="color:var(--success)">Concentrate is fine.</strong> Isolate is a luxury, not a requirement.</div>
        <ul class="tip-list">
          <li><strong>Target:</strong> 1–2 scoops (25–50g) per day to fill protein gaps.</li>
          <li><strong>Concentrate vs isolate:</strong> concentrate (70–80% protein) is fine for 99% of people. Isolate (90%+) only worth extra $ if lactose-intolerant or cutting hard. Hydrolyzed is marketing.</li>
          <li><strong>Good value:</strong> ON Gold Standard, Dymatize Elite, NOW Sports — ~$0.70–1.00 per serving.</li>
          <li><strong>Skip:</strong> mass gainers, proprietary blends, anything with "test boost" claims.</li>
        </ul>
      </div>
      <div class="card">
        <div class="section-title">Collagen Peptides</div>
        <div style="font-size:13px;line-height:1.6;margin-bottom:8px"><strong style="color:var(--success)">Probably worth it.</strong> Moderate evidence for joint and tendon support — relevant for a former marathoner.</div>
        <ul class="tip-list">
          <li><strong>Dose:</strong> 10–15g/day with vitamin C (OJ or tablet) to aid synthesis.</li>
          <li><strong>Gelatin vs peptides:</strong> same protein. Peptides dissolve in cold liquid. Gelatin needs hot liquid but costs half as much.</li>
          <li><strong>Best value:</strong> store-brand collagen peptides (Costco, Amazon Solimo) ~$0.50/scoop. Vital Proteins works too — you're paying for the label.</li>
          <li><strong>Caveat:</strong> collagen is an incomplete protein (low in tryptophan). Count it as supplemental, not toward your daily protein target.</li>
        </ul>
      </div>
      <div class="card">
        <div class="section-title">Skip These</div>
        <ul class="tip-list">
          <li><strong>BCAAs / EAAs:</strong> redundant if protein target is hit.</li>
          <li><strong>Testosterone boosters:</strong> none work. Sleep and lifting heavy does.</li>
          <li><strong>Fat burners:</strong> caffeine + placebo + stimulants. Coffee is cheaper.</li>
          <li><strong>Pre-workout:</strong> caffeine (100–200mg) + beta-alanine are the only active parts. Coffee + your creatine scoop = the same effect at $0.50.</li>
        </ul>
      </div>
      <div class="card">
        <div class="section-title">Your Daily Stack</div>
        <ul class="tip-list">
          <li><strong>Every day:</strong> 5g creatine + 10g collagen in your protein shake, splash of OJ.</li>
          <li><strong>Post-lift:</strong> whey scoop (25g).</li>
          <li><strong>As needed:</strong> second shake if protein target is short.</li>
          <li><strong>Optional:</strong> Vit D3 3000–5000 IU with fat (most people are deficient). Fish oil 2–3g EPA+DHA for joint/heart.</li>
          <li style="color:var(--muted)"><strong>Monthly cost:</strong> ~$35–50 total.</li>
        </ul>
      </div>`;
    }
    else if(this.ntab==='today'){
      const td=n.days[dayType];
      h+=`<div class="card"><span class="day-type day-type-${dayType}">${td.label}</span>
        <div style="margin-top:8px"><div style="font-size:24px;font-weight:800">${td.cal.toLocaleString()} cal</div>
        <div style="font-size:13px;color:var(--muted);margin-top:4px">${td.protein}g protein \u00b7 ${td.carbs}g carbs \u00b7 ${td.fat}g fat</div>
        <div style="font-size:11px;color:var(--dim);margin-top:8px">TDEE: ~${n.tdee.toLocaleString()} \u00b7 ${n.isSurplus?'Surplus':'Deficit'}: ${Math.abs(n.tdee-td.cal)} cal \u00b7 Weekly avg ${n.isSurplus?'surplus':'deficit'}: ~${Math.abs(n.weeklyDeficit)}/day \u00b7 ~${n.weeklyChange} lbs fat/week</div></div></div>`;
      h+=`<div class="section-title">${td.label} Meal Plan</div>`;
      MEALS[dayType].forEach(ml=>{h+=`<div class="meal"><div class="meal-time">${ml.time}</div><div class="meal-name">${ml.name}</div><div class="meal-note">${ml.note}</div><ul class="meal-examples">${ml.ex.map(e=>`<li>${e}</li>`).join('')}</ul></div>`;});
    }
    else if(this.ntab==='macros'){
      h+=`<div class="card"><div class="card-title">Calorie Cycling</div><div style="font-size:12px;color:var(--muted);margin:4px 0 12px">Based on your weight: ${wt} lbs \u00b7 TDEE: ~${n.tdee.toLocaleString()} cal</div>
        <div class="cal-cycle">`;
      for(const [key,d] of Object.entries(n.days)){
        const active=key===dayType;
        h+=`<div class="cal-day${active?' active':''}"><div class="cal-day-type" style="color:${key==='lift'?'var(--lift)':key==='run'?'var(--run)':'#666'}">${d.label}</div><div class="cal-day-num">${d.cal.toLocaleString()}</div><div class="cal-day-sub">-${n.tdee-d.cal} cal</div></div>`;
      }
      h+=`</div><div style="font-size:12px;color:var(--muted);text-align:center;margin-top:8px">Weekly avg: ${n.weeklyAvg.toLocaleString()} cal/day \u00b7 ${n.isSurplus?'~'+n.weeklyChange+' lbs lean gain potential/wk':'~'+n.weeklyChange+' lbs fat loss/wk'}</div></div>`;

      // Macro breakdown per day type
      for(const [key,d] of Object.entries(n.days)){
        const tc=d.cal,pc=d.protein*4,cc=d.carbs*4,fc=d.fat*9;
        h+=`<div class="card"><div class="card-title">${d.label} Macros</div><div style="margin-top:12px">`;
        [{l:'Protein',v:`${d.protein}g`,p:pc/tc*100,c:'#ef4444'},{l:'Carbs',v:`${d.carbs}g`,p:cc/tc*100,c:'#4a9eff'},{l:'Fat',v:`${d.fat}g`,p:fc/tc*100,c:'#34d399'}].forEach(x=>{
          h+=`<div class="macro-bar"><div class="macro-label"><span>${x.l}</span><span>${x.v} (${Math.round(x.p)}%)</span></div><div class="macro-track"><div class="macro-fill" style="width:${x.p}%;background:${x.c}"></div></div></div>`;
        });
        h+=`</div></div>`;
      }
    }
    else if(this.ntab==='grocery'){
      h+=`<div class="card">`;
      [{n:'Protein Sources',items:GROCERY.protein},{n:'Carb Sources',items:GROCERY.carbs},{n:'Healthy Fats',items:GROCERY.fats},{n:'Produce & Other',items:GROCERY.other}].forEach(c=>{h+=`<div class="grocery-cat"><h4>${c.n}</h4><ul>${c.items.map(i=>`<li>${i}</li>`).join('')}</ul></div>`;});
      h+=`</div>`;
    }
    else if(this.ntab==='tips'){
      h+=`<div class="card"><div class="section-title">Body Recomp Strategy</div><ul class="tip-list">${RECOMP_TIPS.map(t=>`<li>${t}</li>`).join('')}</ul></div>`;
      h+=`<div class="card"><div class="section-title">Adderall & Appetite</div><ul class="tip-list">${ADDERALL_TIPS.map(t=>`<li>${t}</li>`).join('')}</ul></div>`;
      h+=`<div class="card"><div class="section-title">Supplements</div>${SUPPS.map(s=>`<div class="list-item"><div><div class="nm">${s.name}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${s.note}</div></div><div class="ds">${s.dose}</div></div>`).join('')}</div>`;
    }
    return h;
  },

  // ---- LOG ----
  rLog(){
    const wl=S.weightLog, done=S.completed, today=ds(norm(new Date()));
    const p=S.profile, bc=p.currentWt&&p.raceWt?calcBody(p.currentWt,p.raceWt):null;

    // Streak
    let streak=0;
    for(let i=0;i<200;i++){const d=new Date();d.setDate(d.getDate()-i);const dd=ds(norm(d)),w=S.startDate?workoutFor(norm(d)):null;if(w&&w.type&&w.type!=='rest'){if(done[dd])streak++;else if(i>0)break;}}

    // Current weight (latest log entry)
    const latestWt = wl.length ? wl[wl.length-1].w : (p.currentWt||null);

    let h=`<div class="streak"><div class="streak-num">${streak}</div><div class="streak-lbl">Workout Streak</div></div>`;

    // Body composition card
    if(bc){
      const currentBC = latestWt && p.raceWt ? calcBody(latestWt, p.raceWt) : bc;
      h+=`<div class="card"><div class="section-title">Body Composition Estimate</div>
        <div class="bc-grid">
          <div class="bc-stat"><div class="bc-label">Current</div><div class="bc-val">${latestWt||p.currentWt}<span class="bc-unit"> lbs</span></div></div>
          <div class="bc-stat"><div class="bc-label">Est. Body Fat</div><div class="bc-val">${currentBC.bf}<span class="bc-unit">%</span></div></div>
          <div class="bc-stat"><div class="bc-label">Lean Mass</div><div class="bc-val">${currentBC.leanMass}<span class="bc-unit"> lbs</span></div></div>
          <div class="bc-stat"><div class="bc-label">Fat Mass</div><div class="bc-val">${currentBC.fatMass}<span class="bc-unit"> lbs</span></div></div>
        </div>
        <div class="bc-goal"><strong>Target:</strong> ~${bc.targetWt} lbs at ~10% body fat (shredded). Lose ~${Math.max(0,currentBC.fatMass - bc.targetWt*0.10).toFixed(0)} lbs fat, gain ~${bc.muscleToGain} lbs muscle. Timeline: ~12 months. You\u2019ll weigh about the same but look completely different. The mirror changes faster than the scale.</div></div>`;
    }

    // Weight log
    h+=`<div class="card"><div class="section-title">Log Body Weight</div><div class="log-input"><div class="form-group"><label>Date</label><input type="date" id="log-dt" value="${today}"></div><div class="form-group"><label>Weight (lbs)</label><input type="number" id="log-wt" placeholder="lbs" inputmode="decimal"></div><button id="log-btn">Log</button></div>${this.rChart(wl)}</div>`;

    // Weight history
    h+=`<div class="card"><div class="section-title">Weight History</div>`;
    if(!wl.length)h+=`<div style="font-size:13px;color:var(--muted);padding:8px 0">No entries yet. Weigh yourself first thing every morning for consistent tracking.</div>`;
    else wl.slice(-15).reverse().forEach(e=>{h+=`<div class="hist-item"><span class="hist-date">${e.d}</span><span class="hist-val">${e.w} lbs</span><button class="del-entry" data-wd="${e.d}">\u00d7</button></div>`;});
    h+=`</div>`;

    // Lift PRs
    const prs=getLiftPRs();
    const prEntries=Object.entries(prs);
    if(prEntries.length){
      h+=`<div class="card"><div class="section-title">Lift PRs (Personal Records)</div><div class="pr-grid">`;
      prEntries.forEach(([id,wt])=>{
        const ex=EX[id]; if(!ex)return;
        h+=`<div class="pr-item"><div class="pr-name">${ex.name}</div><div class="pr-val">${wt}<span class="bc-unit"> ${ex.unit==='each'?'ea':'lbs'}</span></div></div>`;
      });
      h+=`</div></div>`;
    }

    // Upper / Lower balance card (only shows when both trap_dl and db_bench have logged sets)
    const sb = strengthBalance();
    if(sb){
      h+=`<div class="card"><div class="section-title">Upper / Lower Balance</div>
        <div class="bc-grid">
          <div class="bc-stat"><div class="bc-label">Trap DL e1RM</div><div class="bc-val">${Math.round(sb.lower)}<span class="bc-unit"> lbs</span></div></div>
          <div class="bc-stat"><div class="bc-label">Bench e1RM (total)</div><div class="bc-val">${Math.round(sb.benchTotal)}<span class="bc-unit"> lbs</span></div></div>
          <div class="bc-stat"><div class="bc-label">DL ÷ Bench</div><div class="bc-val">${sb.ratio.toFixed(2)}<span class="bc-unit">×</span></div></div>
          <div class="bc-stat"><div class="bc-label">Status</div><div class="bc-val" style="font-size:13px;line-height:1.3">${sb.level}</div></div>
        </div>
        <div class="bc-goal">${sb.msg} <em style="display:block;margin-top:6px;color:var(--muted);font-style:normal;font-size:11px">Reference: trained males typically sit around 1.5–2× (deadlift to bench, total). Marathoners often start at 3×+.</em></div>
      </div>`;
    }

    return h;
  },

  rChart(log){
    if(log.length<2)return'<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">Log at least 2 weights to see your trend chart</div>';
    const W=320,H=160,pad={t:20,r:20,b:25,l:40},pW=W-pad.l-pad.r,pH=H-pad.t-pad.b;
    const ws=log.map(e=>e.w),mn=Math.floor(Math.min(...ws)-2),mx=Math.ceil(Math.max(...ws)+2),rng=mx-mn||1;
    const pts=log.map((e,i)=>({x:pad.l+(log.length>1?i/(log.length-1):0.5)*pW,y:pad.t+pH-((e.w-mn)/rng)*pH,...e}));
    const path=pts.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    let svg=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:160px">`;
    for(let i=0;i<=4;i++){const v=mn+(rng*i/4),y=pad.t+pH-(i/4)*pH;svg+=`<text x="${pad.l-5}" y="${y+4}" text-anchor="end" fill="#666" font-size="10">${Math.round(v)}</text><line x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}" stroke="#222" stroke-width="0.5"/>`;}
    svg+=`<path d="${path}" fill="none" stroke="#f59e0b" stroke-width="2"/>`;
    pts.forEach(p=>{svg+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#f59e0b"/>`;});
    if(pts.length>=2){svg+=`<text x="${pts[0].x}" y="${H-4}" text-anchor="start" fill="#666" font-size="9">${pts[0].d.slice(5)}</text><text x="${pts[pts.length-1].x}" y="${H-4}" text-anchor="end" fill="#666" font-size="9">${pts[pts.length-1].d.slice(5)}</text>`;}
    svg+='</svg>';
    return svg;
  },

  // ---- EVENT HANDLERS ----
  bind(){
    document.querySelectorAll('.sub-tab').forEach(t=>t.addEventListener('click',()=>{this.ntab=t.dataset.st;this.render();}));
    document.querySelectorAll('.week-nav button').forEach(b=>b.addEventListener('click',()=>{this.woff+=parseInt(b.dataset.dir);this.render();}));

    // Setup - body comp preview
    const wtIn=document.getElementById('start-wt'), rwIn=document.getElementById('race-wt'), bcPrev=document.getElementById('bc-preview');
    if(wtIn && rwIn && bcPrev){
      const updatePreview=()=>{
        const cw=parseFloat(wtIn.value),rw=parseFloat(rwIn.value);
        if(cw>0 && rw>0 && cw>rw){
          const bc=calcBody(cw,rw), n=calcNutri(cw);
          bcPrev.innerHTML=`<div class="card" style="text-align:left;margin-top:12px">
            <div class="section-title">Your Body Composition</div>
            <div class="bc-grid">
              <div class="bc-stat"><div class="bc-label">Est. Body Fat</div><div class="bc-val">${bc.bf}<span class="bc-unit">%</span></div></div>
              <div class="bc-stat"><div class="bc-label">Lean Mass</div><div class="bc-val">${bc.leanMass}<span class="bc-unit"> lbs</span></div></div>
              <div class="bc-stat"><div class="bc-label">Fat Mass</div><div class="bc-val">${bc.fatMass}<span class="bc-unit"> lbs</span></div></div>
              <div class="bc-stat"><div class="bc-label">Target</div><div class="bc-val">~${bc.targetWt}<span class="bc-unit"> lbs @ 10%</span></div></div>
            </div>
            <div class="bc-goal"><strong>The plan:</strong> Lose ~${bc.fatToLose} lbs fat, gain ~${bc.muscleToGain} lbs muscle over ~12 months. This 16-week program is your foundation. Calorie cycling: ${n.days.lift.cal.toLocaleString()} cal lift days, ${n.days.run.cal.toLocaleString()} run days, ${n.days.rest.cal.toLocaleString()} rest days. Expected: ~${n.weeklyChange} lbs fat loss/week. You\'ll weigh about the same at the end but look completely different.</div>
          </div>`;
        } else { bcPrev.innerHTML=''; }
      };
      wtIn.addEventListener('input',updatePreview);
      rwIn.addEventListener('input',updatePreview);
    }

    // Setup submit
    const sb=document.getElementById('setup-btn');
    if(sb)sb.addEventListener('click',()=>{
      const di=document.getElementById('start-date'),wi=document.getElementById('start-wt'),ri=document.getElementById('race-wt');
      if(!di||!di.value)return;
      const parts=di.value.split('-');
      S.startDate=new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
      const cw=wi?parseFloat(wi.value):0, rw=ri?parseFloat(ri.value):0;
      S.profile={currentWt:cw||164, raceWt:rw||137};
      if(cw) S.addWeight(ds(norm(new Date())),cw);
      this.render();
    });

    // Complete workout
    const cb=document.getElementById('complete-btn');
    if(cb)cb.addEventListener('click',()=>{const d=ds(norm(new Date()));S.setDone(d,!S.completed[d]);this.render();});

    // Per-set check buttons — log {w, r} for this set, fire rest timer
    document.querySelectorAll('.set-check').forEach(b=>b.addEventListener('click',()=>{
      const exId = b.dataset.exid;
      const si = parseInt(b.dataset.set);
      const rest = parseInt(b.dataset.rest) || 0;
      const d = ds(norm(new Date()));
      const ses = S.session(d);

      // Find the weight and reps inputs for this set row
      const row = b.closest('.set-row');
      const wIn = row.querySelector('.set-wt');
      const rIn = row.querySelector('.set-reps');

      if(!ses.perf) ses.perf = {};
      if(!Array.isArray(ses.perf[exId])) ses.perf[exId] = [];

      // Toggle: if already logged, unlog
      if(ses.perf[exId][si]){
        ses.perf[exId][si] = null;
        b.classList.remove('done');
        row.classList.remove('done');
      } else {
        // Parse weight (fall back to placeholder)
        const wRaw = wIn.value || wIn.placeholder;
        const rRaw = rIn.value || rIn.placeholder;
        const w = parseFloat(wRaw);
        const r = parseInt(rRaw);
        if(isNaN(w) || isNaN(r)){
          alert('Enter weight and reps for this set before checking it off.');
          return;
        }
        while(ses.perf[exId].length <= si) ses.perf[exId].push(null);
        ses.perf[exId][si] = { w, r };

        // Keep legacy sets[] and wts[] in sync so old views still work
        if(!ses.sets) ses.sets = {};
        if(!Array.isArray(ses.sets[exId])) ses.sets[exId] = [];
        while(ses.sets[exId].length <= si) ses.sets[exId].push(false);
        ses.sets[exId][si] = true;
        if(!ses.wts) ses.wts = {};
        ses.wts[exId] = w;

        b.classList.add('done', 'pop');
        row.classList.add('done');
        setTimeout(()=>b.classList.remove('pop'), 300);

        if(rest > 0) this.startTimer(rest);
      }
      S.saveSession(d, ses);
    }));

    // Per-set weight input change — auto-fill subsequent empty weight inputs
    // for the same exercise so pyramiding is easy but same-weight is automatic.
    document.querySelectorAll('.set-wt').forEach(inp=>inp.addEventListener('change',()=>{
      const exId = inp.dataset.exid;
      const si = parseInt(inp.dataset.set);
      const val = inp.value;
      if(!val) return;
      // Fill sibling rows with same exid after this one, but ONLY if they are
      // (a) not yet completed, and (b) currently empty.
      document.querySelectorAll(`.set-wt[data-exid="${exId}"]`).forEach(other=>{
        const osi = parseInt(other.dataset.set);
        if(osi <= si) return;
        const row = other.closest('.set-row');
        if(row && row.classList.contains('done')) return;
        if(!other.value) other.value = val;
      });
    }));

    // Rest buttons (manual)
    document.querySelectorAll('.rest-btn').forEach(b=>b.addEventListener('click',()=>this.startTimer(parseInt(b.dataset.rest))));
    // Exercise info
    document.querySelectorAll('.exercise-name').forEach(el=>el.addEventListener('click',()=>this.showExInfo(el.dataset.exid)));
    // Calendar day click
    document.querySelectorAll('.day-card').forEach(c=>c.addEventListener('click',()=>this.showDay(c.dataset.date)));
    // Day swap buttons
    document.querySelectorAll('.swap-day-btn').forEach(b=>b.addEventListener('click',()=>this.showSwapModal(b.dataset.date)));
    document.querySelectorAll('.swap-cancel-btn').forEach(b=>b.addEventListener('click',()=>{S.clearSwap(b.dataset.date);this.render();}));
    // Log weight
    const lb=document.getElementById('log-btn');
    if(lb)lb.addEventListener('click',()=>{
      const di=document.getElementById('log-dt'),wi=document.getElementById('log-wt');
      if(di&&di.value&&wi&&wi.value){S.addWeight(di.value,parseFloat(wi.value));this.render();}
    });
    // Delete weight
    document.querySelectorAll('.del-entry').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();S.delWeight(b.dataset.wd);this.render();}));
    // Reset
    const rb=document.getElementById('reset-btn');
    if(rb)rb.addEventListener('click',()=>{if(confirm('Reset your entire program? This clears ALL progress. Saved plans are kept.')){Plans.reset();this.render();}});
  },

  // ---- TIMER (persistent top banner — non-blocking) ----
  _timer:null, _ts:0,
  getSettings(){ return S.get('settings') || { restEnabled:true, restSound:true }; },
  saveSettings(s){ S.set('settings', s); },
  ensureBanner(){
    let b = document.getElementById('rest-banner');
    if(b) return b;
    b = document.createElement('div');
    b.id = 'rest-banner';
    b.className = 'rest-banner hidden';
    b.innerHTML = `
      <span class="rb-label">REST</span>
      <span class="rb-num" id="rb-num">0</span>
      <button class="rb-add" id="rb-add">+30s</button>
      <button class="rb-skip" id="rb-skip">Skip</button>`;
    document.body.appendChild(b);
    b.querySelector('#rb-skip').addEventListener('click', ()=>this.stopTimer());
    b.querySelector('#rb-add').addEventListener('click', ()=>{ this._ts += 30; this.renderBanner(); });
    return b;
  },
  renderBanner(){
    const b = this.ensureBanner();
    const el = document.getElementById('rb-num');
    if(el) el.textContent = this._ts + 's';
    b.classList.remove('hidden');
  },
  startTimer(sec){
    const settings = this.getSettings();
    if(!settings.restEnabled) return;
    this._ts = sec;
    this.renderBanner();
    if(this._timer) clearInterval(this._timer);
    this._timer = setInterval(()=>{
      this._ts--;
      const el = document.getElementById('rb-num');
      if(el) el.textContent = this._ts + 's';
      if(this._ts <= 0){ if(settings.restSound) this.beep(); this.stopTimer(); }
    }, 1000);
  },
  stopTimer(){
    if(this._timer) clearInterval(this._timer);
    this._timer = null;
    const b = document.getElementById('rest-banner');
    if(b) b.classList.add('hidden');
  },
  beep(){ try{ const c=new(window.AudioContext||window.webkitAudioContext),o=c.createOscillator(),g=c.createGain(); o.type='sine'; o.frequency.value=880; g.gain.value=0.3; o.connect(g); g.connect(c.destination); o.start(); setTimeout(()=>{o.stop();c.close();},300); if(navigator.vibrate) navigator.vibrate(200); }catch(e){} },

  // ---- EXERCISE INFO ----
  showExInfo(id){
    const ex=EX[id];if(!ex)return;
    const ov=document.getElementById('overlay');ov.classList.remove('hidden');
    ov.innerHTML=`<div class="overlay-content ex-info">
      <h3>${ex.name}</h3>
      <div class="muscle-tags">${ex.primary.map(m=>`<span class="muscle-tag">${m}</span>`).join('')}${ex.secondary.map(m=>`<span class="muscle-tag" style="opacity:.6">${m}</span>`).join('')}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${ex.equip}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">Weight: ${ex.unit==='each'?'per dumbbell':'total loaded'} \u00b7 Progress: double progression \u2014 hit all prescribed sets to earn +${stepFor(ex)} lbs next time</div>
      <a href="${ex.yt}" target="_blank" class="yt-link" style="margin-bottom:12px">\u25b6 Watch Form Demo on YouTube</a>
      <ol class="form-steps">${ex.form.map(s=>`<li>${s}</li>`).join('')}</ol>
      <button class="close-btn" id="close-ov">Got it</button>
    </div>`;
    document.getElementById('close-ov').addEventListener('click',()=>ov.classList.add('hidden'));
    ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.add('hidden');});
  },

  // ---- DAY SWAP ----
  swapBar(date){
    const dStr = ds(norm(date));
    const swappedTo = S.daySwaps[dStr];
    if(swappedTo){
      const [y,m,dd] = swappedTo.split('-').map(Number);
      const partner = new Date(y, m-1, dd);
      return `<div class="swap-row"><span class="swap-status">↔ Swapped with ${fmt(partner)}</span> <a class="swap-cancel-btn" data-date="${dStr}">Cancel swap</a></div>`;
    }
    return `<div class="swap-row"><a class="swap-day-btn" data-date="${dStr}">↔ Swap day</a></div>`;
  },

  showSwapModal(fromDate){
    const ov = document.getElementById('overlay'); ov.classList.remove('hidden');
    const today = norm(new Date());
    const [fy,fm,fd] = fromDate.split('-').map(Number);
    const fromD = new Date(fy, fm-1, fd);
    const candidates = [];
    for(let i = 1; i <= 6; i++){
      const d = new Date(fromD); d.setDate(d.getDate() + i);
      if(d < today) continue;
      const dStr = ds(norm(d));
      // skip days already swapped with someone other than fromDate
      if(S.daySwaps[dStr] && S.daySwaps[dStr] !== fromDate) continue;
      const w = workoutFor(d);
      const label = !w ? 'Rest' : (w.type === 'rest' ? 'Rest' : (w.name || w.type));
      candidates.push({ date: dStr, dateObj: d, label, type: w ? w.type : 'rest' });
    }
    let h = `<div class="overlay-content"><h3 style="margin-bottom:6px">Swap today's workout with…</h3>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px">Pick a day in the next 7 days. Today's workout moves to that day, and that day's workout moves here. Weekly lift and cardio counts stay the same.</div>`;
    if(!candidates.length){
      h += `<div style="font-size:13px;color:var(--muted);padding:12px 0">No swappable days in the next 7 days.</div>`;
    } else {
      candidates.forEach(c => {
        h += `<div class="swap-option" data-from="${fromDate}" data-to="${c.date}">
          <div class="swap-option-date">${fmt(c.dateObj)}</div>
          <div class="swap-option-label">${c.label}</div>
        </div>`;
      });
    }
    h += `<button class="close-btn" id="close-ov" style="margin-top:16px">Cancel</button></div>`;
    ov.innerHTML = h;
    document.getElementById('close-ov').addEventListener('click',()=>ov.classList.add('hidden'));
    ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.add('hidden');});
    document.querySelectorAll('.swap-option').forEach(el => el.addEventListener('click', () => {
      S.addSwap(el.dataset.from, el.dataset.to);
      ov.classList.add('hidden');
      this.render();
    }));
  },

  // ---- DAY DETAIL (calendar) ----
  showDay(dateStr){
    const parts=dateStr.split('-'),date=new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
    const w=S.startDate?workoutFor(date):null;
    if(!w||w.type==='rest')return;
    const ov=document.getElementById('overlay');ov.classList.remove('hidden');
    let c='';
    if(w.type==='lift'){
      c=`<div class="overlay-content"><h3 style="margin-bottom:4px">${w.name}</h3><div style="font-size:13px;color:var(--muted);margin-bottom:12px">${w.focus} \u00b7 ${w.dur}</div>`;
      w.exercises.forEach(ex=>{const info=EX[ex.id];const intCls=ex.int==='heavy'?'int-heavy':ex.int==='light'?'int-light':'int-mod';const intLbl=ex.int==='heavy'?'HEAVY':ex.int==='light'?'LIGHT':'MOD';
        c+=`<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600;font-size:14px">${info.name}</span><span style="color:var(--lift);font-size:13px">${ex.sets}\u00d7${ex.reps}</span></div><div style="margin-top:2px"><span class="int ${intCls}">${intLbl}</span><span class="rpe-tag">RPE ${ex.rpe}</span></div><div style="font-size:12px;color:var(--muted);margin-top:4px">${ex.note}</div></div>`;});
      c+=`<button class="close-btn" id="close-ov">Close</button></div>`;
    } else {
      c=`<div class="overlay-content"><h3 style="margin-bottom:4px">${w.name}</h3><div style="font-size:13px;color:var(--muted);margin-bottom:12px">${w.dist} \u00b7 ${w.effort}</div><p style="font-size:13px;line-height:1.5;margin-bottom:12px">${w.desc}</p>${w.details.map(d=>`<div style="padding:4px 0;font-size:13px;color:var(--muted)">\u2192 ${d}</div>`).join('')}<button class="close-btn" id="close-ov">Close</button></div>`;
    }
    ov.innerHTML=c;
    document.getElementById('close-ov').addEventListener('click',()=>ov.classList.add('hidden'));
    ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.add('hidden');});
  },

  // ---- PLANS MENU ----
  showPlansMenu(){
    const ov=document.getElementById('overlay'); ov.classList.remove('hidden');
    const plans=Plans.getAll(), hasData=!!S.startDate;
    const pi=hasData?phaseFor(norm(new Date())):null;
    let h=`<div class="overlay-content"><h3 style="margin-bottom:16px">Plan Management</h3>`;

    // Current plan info
    if(hasData){
      const p=S.profile;
      h+=`<div class="section-title">Current Plan</div>
        <div style="font-size:13px;margin-bottom:12px;line-height:1.6">
          Started: ${fmt(norm(S.startDate))}<br>
          ${pi?`Phase ${pi.phase.id}: ${pi.phase.name} \u00b7 Week ${pi.wip}`:'Program Complete'}
          ${p.currentWt?`<br>Weight: ${p.currentWt} lbs`:''}
        </div>`;
    } else {
      h+=`<div style="font-size:13px;color:var(--muted);margin-bottom:12px">No active plan. Set one up from the Today tab.</div>`;
    }

    // Rest timer settings
    const set = this.getSettings();
    h+=`<div class="section-title">Rest Timer</div>
      <div class="settings-row">
        <label><input type="checkbox" id="set-rest-enabled" ${set.restEnabled?'checked':''}> Auto-start rest timer after each set</label>
      </div>
      <div class="settings-row">
        <label><input type="checkbox" id="set-rest-sound" ${set.restSound?'checked':''}> Beep + vibrate when timer ends</label>
      </div>`;

    // Save current plan
    if(hasData){
      h+=`<div class="section-title">Save Current Plan</div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <input type="text" id="plan-name-in" placeholder="Plan name (e.g. Spring Recomp)" style="flex:1;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text);font-size:13px">
          <button id="save-plan-btn" style="padding:8px 16px;background:var(--primary);color:#000;border:none;border-radius:var(--rs);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">Save</button>
        </div>`;
    }

    // Saved plans list
    h+=`<div class="section-title">Saved Plans${plans.length?` (${plans.length})`:''}</div>`;
    if(plans.length){
      plans.forEach(p=>{
        const d=new Date(p.savedAt);
        const dStr=d.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});
        h+=`<div class="plan-item">
          <div class="plan-item-info"><div class="plan-item-name">${p.name}</div><div class="plan-item-date">Saved ${dStr}</div></div>
          <div class="plan-item-btns">
            <button class="plan-btn-load" data-pn="${p.name}">Load</button>
            <button class="plan-btn-del" data-pn="${p.name}">Del</button>
          </div></div>`;
      });
    } else {
      h+=`<div style="font-size:13px;color:var(--dim);padding:8px 0">No saved plans yet. Save your current plan to switch between different programs.</div>`;
    }

    // New plan from scratch
    h+=`<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
      <div class="section-title" style="margin-top:0">Start Fresh</div>
      <button id="new-plan-btn" style="width:100%;padding:10px;background:var(--card);border:1px solid var(--border);border-radius:var(--rs);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px">New Plan (Reset Everything)</button>
    </div>`;

    h+=`<button class="close-btn" id="close-ov">Close</button></div>`;
    ov.innerHTML=h;

    // Bind events
    const closeOv=()=>ov.classList.add('hidden');
    document.getElementById('close-ov').addEventListener('click',closeOv);
    ov.addEventListener('click',e=>{if(e.target===ov)closeOv();});

    const saveBtn=document.getElementById('save-plan-btn');
    if(saveBtn) saveBtn.addEventListener('click',()=>{
      const name=document.getElementById('plan-name-in').value.trim();
      if(!name){alert('Enter a plan name.');return;}
      Plans.save(name);
      this.showPlansMenu(); // refresh list
    });

    document.querySelectorAll('.plan-btn-load').forEach(b=>b.addEventListener('click',()=>{
      if(confirm(`Load "${b.dataset.pn}"? This replaces your current plan and all progress.`)){
        Plans.load(b.dataset.pn);
        closeOv();
        this.render();
      }
    }));

    document.querySelectorAll('.plan-btn-del').forEach(b=>b.addEventListener('click',()=>{
      if(confirm(`Delete saved plan "${b.dataset.pn}"?`)){
        Plans.del(b.dataset.pn);
        this.showPlansMenu();
      }
    }));

    document.getElementById('new-plan-btn').addEventListener('click',()=>{
      if(!hasData || confirm('This clears all current progress and starts fresh. Saved plans are NOT deleted.')){
        Plans.reset();
        closeOv();
        this.render();
      }
    });

    // Rest timer settings
    const restEn = document.getElementById('set-rest-enabled');
    const restSnd = document.getElementById('set-rest-sound');
    const persist = ()=>{
      const s = this.getSettings();
      s.restEnabled = restEn.checked;
      s.restSound = restSnd.checked;
      this.saveSettings(s);
      if(!s.restEnabled) this.stopTimer();
    };
    if(restEn) restEn.addEventListener('change', persist);
    if(restSnd) restSnd.addEventListener('change', persist);
  }
};

// ---- INIT ----
document.addEventListener('DOMContentLoaded',()=>App.init());
