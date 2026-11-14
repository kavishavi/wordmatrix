// 3x3 Word Matrix - find three hidden 3-letter words by swapping letters.
const SITE_URL = 'https://kavishavi.github.io/wordmatrix/';
const K = (k) => 'wm3_' + k; // localStorage key prefix

let practice = false;
let tryMode = false;
let tryMarks = new Set(); // temporary highlights only, never saved
let dayNumber = 1;
let puzzle = null;          // {words:[w1,w2,w3], scramble:[...]}
let solvedLetters = [];     // 9 letters, solved order
let grid = [];              // 9 letters, current arrangement
let locked = [false,false,false]; // locked rows
let moves = 0;
let solveMoves = [];        // moves count at which each word was solved
let selected = -1;
let won = false;

// ---------- date helpers ----------
function localToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function dayIndex() {
  const [y,m,d] = FIRST_DATE.split('-').map(Number);
  const first = new Date(y, m-1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - first) / 86400000));
}

// ---------- storage ----------
function setV(k,v){ try { localStorage.setItem(K(k), String(v)); } catch(e){} }
function getV(k,d){ try { const v = localStorage.getItem(K(k)); return v===null ? d : v; } catch(e){ return d; } }

// ---------- setup ----------
function pickPuzzle() {
  const params = new URLSearchParams(location.search);
  practice = params.get('practice') === '1';
  if (practice) {
    puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    dayNumber = 0;
    return;
  }
  dayNumber = dayIndex() + 1;
  puzzle = PUZZLES[dayIndex() % PUZZLES.length];
}

function initGame() {
  pickPuzzle();
  solvedLetters = puzzle.words.join('').split('');
  const savedDay = getV('day','');
  const today = localToday();

  const sig = puzzle.words.join(',');
  const sigOk = getV('puzzleSig','') === sig;
  if (!practice && savedDay === today && sigOk && getV('grid','').length === 9) {
    grid = getV('grid','').split('');
    moves = parseInt(getV('moves','0'),10) || 0;
    solveMoves = getV('solveMoves','') ? getV('solveMoves','').split(',').map(Number) : [];
    won = getV('won','0') === '1';
  } else {
    grid = puzzle.scramble.map(i => solvedLetters[i]);
    moves = 0; solveMoves = []; won = false;
    if (!practice) {
      setV('day', today);
      setV('puzzleSig', sig);
      // count a "play" once per day
      if (getV('lastPlayed','') !== today) {
        setV('lastPlayed', today);
        setV('playCount', (parseInt(getV('playCount','0'),10)||0) + 1);
      }
      save();
    }
  }
  recomputeLocks();
  render();
  updateStatsText();
  if (won) setTimeout(showWinModal, 300);
}

function save() {
  if (practice) return;
  setV('grid', grid.join(''));
  setV('moves', moves);
  setV('solveMoves', solveMoves.join(','));
  setV('won', won ? '1' : '0');
}

// ---------- rendering ----------
function render() {
  const g = document.getElementById('grid');
  g.innerHTML = '';
  for (let r=0; r<3; r++) {
    const row = document.createElement('div');
    row.className = 'grid-row';
    for (let c=0; c<3; c++) {
      const i = r*3+c;
      const cell = document.createElement('div');
      cell.className = 'grid-item';
      cell.textContent = grid[i].toUpperCase();
      cell.dataset.idx = i;
      if (locked[r]) cell.classList.add('correct','disabled');
      if (selected === i) cell.classList.add('selected');
      if (tryMarks.has(i)) cell.classList.add('try-mark');
      cell.addEventListener('click', onCellClick);
      row.appendChild(cell);
    }
    g.appendChild(row);
  }
  document.getElementById('movesCounter').textContent = moves;
  const tryControl = document.getElementById('tryControl');
  const tryHint = document.getElementById('tryHint');
  if (tryControl) tryControl.hidden = won;
  if (tryHint) tryHint.hidden = !tryMode || won;
  document.getElementById('dayLabel').textContent = practice ? 'Practice' : '#' + dayNumber;
  document.getElementById('practiceBanner').style.display = practice ? 'block' : 'none';
}

function onCellClick(e) {
  const i = parseInt(e.currentTarget.dataset.idx, 10);
  const r = Math.floor(i/3);
  if (locked[r] || won) return;
  if (tryMode) {
    if (tryMarks.has(i)) tryMarks.delete(i);
    else tryMarks.add(i);
    render();
    return;
  }
  if (selected === -1) { selected = i; }
  else if (selected === i) { selected = -1; }
  else {
    const a = selected;
    [grid[a], grid[i]] = [grid[i], grid[a]];
    moves++;
    selected = -1;
    recomputeLocks(true);
    save();
    if (locked.every(x=>x)) onWin();
  }
  render();
}

// Like the original's विकल्प जाँच: mark letters, do not swap or score.
function toggleTryMode() {
  tryMode = document.getElementById('tryModeToggle').checked;
  selected = -1;
  tryMarks.clear();
  render();
}

// ---------- solving ----------
function recomputeLocks(countNew) {
  for (let r=0; r<3; r++) {
    if (locked[r]) continue;
    const row = grid.slice(r*3, r*3+3).join('');
    if (puzzle.words.includes(row)) {
      locked[r] = true;
      if (countNew) solveMoves.push(moves);
    }
  }
}

function onWin() {
  won = true;
  save();
  if (!practice) {
    setV('winCount', (parseInt(getV('winCount','0'),10)||0) + 1);
    const today = localToday();
    const lastWin = getV('lastWin','');
    let streak = parseInt(getV('streak','0'),10) || 0;
    if (lastWin === today) {
      // already counted today
    } else {
      const y = new Date(); y.setDate(y.getDate()-1);
      const yesterday = y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
      streak = (lastWin === yesterday) ? streak + 1 : 1;
      setV('streak', streak);
      setV('lastWin', today);
      const mx = parseInt(getV('maxStreak','0'),10) || 0;
      if (streak > mx) setV('maxStreak', streak);
    }
  }
  setTimeout(showWinModal, 600);
}

// ---------- stats / modal ----------
function updateStatsText() {
  const p = parseInt(getV('playCount','0'),10)||0;
  const w = parseInt(getV('winCount','0'),10)||0;
  document.getElementById('playCount').textContent = p;
  document.getElementById('winCount').textContent = p === 0 ? '0%' : Math.round(100*w/p) + '%';
  document.getElementById('playStreak').textContent = parseInt(getV('streak','0'),10)||0;
  document.getElementById('maxStreak').textContent = parseInt(getV('maxStreak','0'),10)||0;
}

function showWinModal() {
  updateStatsText();
  document.getElementById('moveCount1').textContent = moves;
  document.getElementById('winSteps').textContent = won ? barChart() : '';
  document.getElementById('pWin').style.display = won ? 'block' : 'none';
  document.getElementById('pPlay').style.display = won ? 'none' : 'block';
  document.getElementById('moveCount2').textContent = moves;
  document.getElementById('winModal').style.display = 'block';
  updateCountdown();
}
function closeWinModal(){ document.getElementById('winModal').style.display = 'none'; }

function barChart() {
  const boxes = {green:'🟩', yellow:'🟨', red:'🟥'};
  let out = '', prev = 0;
  solveMoves.slice(-3).forEach(mv => {
    let n = mv - prev;
    const capped = Math.min(n, 10);
    const box = n >= 10 ? boxes.red : n > 3 ? boxes.yellow : boxes.green;
    out += box.repeat(Math.max(capped,0)) + (n > 10 ? ' (' + n + ')' : '') + '\n';
    prev = mv;
  });
  return out;
}

function updateCountdown() {
  const now = new Date();
  const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0,0,0,0);
  const s = Math.max(0, Math.floor((mid - now)/1000));
  const hh = String(Math.floor(s/3600)).padStart(2,'0');
  const mm = String(Math.floor(s%3600/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  document.getElementById('countdownTimer').textContent = hh+':'+mm+':'+ss;
}
setInterval(updateCountdown, 1000);

// pick up the new day without a manual reload
let seenDay = localToday();
setInterval(() => { if (localToday() !== seenDay) location.reload(); }, 60000);

// ---------- share ----------
async function shareResult() {
  let text = '🧩 3x3 Word Matrix ' + (practice ? '(practice)' : '#' + dayNumber) + '\n' +
             'Solved in ' + moves + ' moves!\n\n' + barChart() + '\n' + SITE_URL;
  if (navigator.share) {
    try { await navigator.share({title: '3x3 Word Matrix', text: text}); }
    catch(e) { if (e && e.name !== 'AbortError') fallbackShare(text); }
  } else fallbackShare(text);
}
function fallbackShare(text) {
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); alert('Result copied to clipboard!'); } catch(e){}
  document.body.removeChild(ta);
}

// ---------- menus / theme ----------
function toggleMenu(which) {
  const el = document.querySelector('.' + which + '-sidebar');
  const overlay = document.querySelector('.overlay');
  const opening = !el.classList.contains('active');
  closeAllMenus();
  if (opening) { el.classList.add('active'); overlay.classList.add('active'); }
}
function closeAllMenus() {
  document.querySelectorAll('.sidebar').forEach(s => s.classList.remove('active'));
  document.querySelector('.overlay').classList.remove('active');
}
function toggleDarkMode() {
  const on = document.getElementById('darkModeToggle').checked;
  document.body.classList.toggle('dark-mode', on);
  setV('dark', on ? '1' : '0');
}

window.onload = function() {
  const dark = getV('dark','0') === '1';
  document.getElementById('darkModeToggle').checked = dark;
  document.body.classList.toggle('dark-mode', dark);
  initGame();
};
