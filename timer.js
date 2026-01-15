class ExamTimer {
  constructor() {
    // DOM Elements
    this.els = {
      clock: document.getElementById('digitalClock'),
      date: document.getElementById('digitalDate'),
      status: document.getElementById('statusDisplay'),
      countdown: document.getElementById('countdownDisplay'),
      infoCard: document.getElementById('activeExamInfo'),
      infoName: document.getElementById('activeNameDisplay'),
      infoNote: document.getElementById('activeInfoDisplay'),
      // Tabs
      tabs: document.querySelectorAll('.tab-btn'),
      panels: {
        manual: document.getElementById('manualPanel'),
        schedule: document.getElementById('schedulePanel')
      },
      // Manual Inputs
      mHours: document.getElementById('manualHours'),
      mMins: document.getElementById('manualMinutes'),
      mName: document.getElementById('manualExamName'),
      mInfo: document.getElementById('manualExamInfo'),
      mStart: document.getElementById('manualStartBtn'),
      mStop: document.getElementById('manualStopBtn'),
      mReset: document.getElementById('manualResetBtn'),
      // Schedule Inputs
      sStart: document.getElementById('newExamStart'),
      sEnd: document.getElementById('newExamEnd'),
      sName: document.getElementById('newExamName'),
      sAdd: document.getElementById('addExamBtn'),
      sTable: document.querySelector('#scheduleTable tbody'),
      sClear: document.getElementById('clearScheduleBtn'),
      sExport: document.getElementById('exportCsvBtn'),
      sImport: document.getElementById('importCsvInput'),
      // Global
      bgToggle: document.getElementById('backgroundToggle'),
      soundToggle: document.getElementById('soundToggle'),
      zoomIn: document.getElementById('zoomIn'),
      zoomOut: document.getElementById('zoomOut'),
      container: document.querySelector('.exam-timer-container')
    };

    // State
    this.state = {
      mode: 'manual', // 'manual' | 'schedule'
      schedule: [],
      currentExam: null,
      manualTarget: null,
      soundEnabled: false,
      audioUnlocked: false, // Track if browser allowed audio
      bgIndex: 1,
      zoom: 1
    };

    // Audio Object
    this.alarmSound = new Audio('app.aaronshi.cc/exam-timer/sound.wav');

    this.init();
  }

  init() {
    this.loadSchedule();
    this.updateClock();
    
    // Tickers
    setInterval(() => this.updateClock(), 1000);
    setInterval(() => this.tick(), 500);

    // Event Bindings
    this.bindEvents();
    
    // Initial Render
    this.renderSchedule();
    
    // IMPORTANT: Try to unlock audio on first interaction
    document.body.addEventListener('click', () => this.unlockAudioContext(), { once: true });
    document.body.addEventListener('touchstart', () => this.unlockAudioContext(), { once: true });
  }

  // --- Audio Fix ---
  unlockAudioContext() {
    if (this.state.audioUnlocked) return;
    
    // Play silence to unlock the audio engine on iOS/Chrome
    this.alarmSound.play().then(() => {
        this.alarmSound.pause();
        this.alarmSound.currentTime = 0;
        this.state.audioUnlocked = true;
        console.log("Audio Context Unlocked");
    }).catch(error => {
        console.log("Audio unlock failed (waiting for interaction):", error);
    });
  }

  triggerAlarm(msg) {
    console.log("Alarm Triggered:", msg);
    if (this.state.soundEnabled) {
        // Try playing even if not "unlocked" flag (sometimes it works)
        this.alarmSound.currentTime = 0;
        this.alarmSound.play().catch(e => console.error("Play failed:", e));
    }
  }

  bindEvents() {
    // Tab Switching
    this.els.tabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchMode(e.target.dataset.tab);
      });
    });

    // Manual Controls
    this.els.mStart.addEventListener('click', () => this.startManual());
    this.els.mStop.addEventListener('click', () => this.stopManual());
    this.els.mReset.addEventListener('click', () => this.resetManual());

    // Schedule Controls
    this.els.sAdd.addEventListener('click', () => this.addExam());
    this.els.sClear.addEventListener('click', () => this.clearSchedule());
    this.els.sExport.addEventListener('click', () => this.exportCSV());
    this.els.sImport.addEventListener('change', (e) => this.importCSV(e));

    // Global
    this.els.bgToggle.addEventListener('click', () => this.toggleBg());
    this.els.soundToggle.addEventListener('click', () => this.toggleSound());
    this.els.zoomIn.addEventListener('click', () => this.zoom(0.1));
    this.els.zoomOut.addEventListener('click', () => this.zoom(-0.1));
  }

  // --- Mode Switching ---
  switchMode(mode) {
    this.state.mode = mode;
    
    // Update Tabs
    this.els.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
    
    // Update Panels
    if (mode === 'manual') {
        this.els.panels.manual.classList.remove('hidden');
        this.els.panels.schedule.classList.add('hidden');
        this.els.status.classList.add('hidden');
        this.els.countdown.textContent = "00:00:00";
        this.els.infoCard.classList.add('hidden');
    } else {
        this.els.panels.manual.classList.add('hidden');
        this.els.panels.schedule.classList.remove('hidden');
        this.els.status.classList.remove('hidden');
        this.checkSchedule(new Date()); // Immediate check
    }
  }

  // --- Tick Loop ---
  tick() {
    const now = new Date();
    
    if (this.state.mode === 'manual') {
        if (this.state.manualTarget) {
            const diff = this.state.manualTarget - now;
            if (diff <= 0) {
                this.updateDisplay(0);
                this.triggerAlarm("Manual Timer Finished");
                this.stopManual();
                alert("Time's Up!");
            } else {
                this.updateDisplay(diff);
            }
        }
    } else {
        this.checkSchedule(now);
    }
  }

  // --- Schedule Logic ---
  checkSchedule(now) {
    const timeStr = this.formatTimeHHMM(now);
    let activeExam = null;
    let nextExam = null;

    // Pre-process schedule dates
    const todaySchedule = this.state.schedule.map(ex => ({
        ...ex,
        startDate: this.getDateFromStr(ex.start),
        endDate: this.getDateFromStr(ex.end)
    }));

    // Find Active Exam
    for (const ex of todaySchedule) {
        if (now >= ex.startDate && now < ex.endDate) {
            activeExam = ex;
            break;
        }
    }

    // Find Next Exam
    if (!activeExam) {
        nextExam = todaySchedule.find(ex => ex.startDate > now);
    }

    // State Transition Logic
    if (activeExam) {
        // Exam Just Started
        if (!this.state.currentExam || this.state.currentExam.id !== activeExam.id) {
            this.state.currentExam = activeExam;
            this.triggerAlarm("Exam Started");
            this.renderSchedule(); // Update highlights
        }
        
        // Update UI
        this.els.status.textContent = "EXAM IN PROGRESS";
        this.els.status.className = "status-badge status-exam";
        this.els.infoCard.classList.remove('hidden');
        this.els.infoName.textContent = activeExam.name;
        this.els.infoNote.textContent = activeExam.info;
        
        const diff = activeExam.endDate - now;
        this.updateDisplay(diff);
        
    } else {
        // Exam Just Ended
        if (this.state.currentExam) {
            this.triggerAlarm("Exam Ended");
            this.state.currentExam = null;
            this.renderSchedule();
        }

        // Break Mode
        this.els.status.textContent = "STANDBY / BREAK";
        this.els.status.className = "status-badge status-break";
        this.els.infoCard.classList.add('hidden');
        
        if (nextExam) {
             const diffToStart = nextExam.startDate - now;
             this.els.countdown.textContent = "Next: " + this.formatDuration(diffToStart);
        } else {
             this.els.countdown.textContent = "No Exams";
        }
    }
  }

  // --- Manual Logic ---
  startManual() {
    const h = parseInt(this.els.mHours.value) || 0;
    const m = parseInt(this.els.mMins.value) || 0;
    if (h===0 && m===0) return alert("Set duration first");
    
    this.state.manualTarget = new Date(Date.now() + (h*3600 + m*60)*1000);
    this.els.mStart.classList.add('hidden');
    this.els.mStop.classList.remove('hidden');
    this.els.mReset.disabled = true;
    
    this.els.infoCard.classList.remove('hidden');
    this.els.infoName.textContent = this.els.mName.value || "Timer";
    this.els.infoNote.textContent = this.els.mInfo.value || "";
  }

  stopManual() {
    this.state.manualTarget = null;
    this.els.mStart.classList.remove('hidden');
    this.els.mStop.classList.add('hidden');
    this.els.mReset.disabled = false;
  }
  
  resetManual() {
      this.updateDisplay(0);
      this.els.infoCard.classList.add('hidden');
      this.els.mHours.value = '';
      this.els.mMins.value = '';
      this.els.mName.value = '';
  }

  // --- CRUD & Helpers ---
  addExam() {
      const start = this.els.sStart.value;
      const end = this.els.sEnd.value;
      if(!start || !end) return alert("Time required");
      if(start >= end) return alert("End time must be after start");

      this.state.schedule.push({
          id: Date.now().toString(),
          start, end,
          name: this.els.sName.value || "Subject",
          info: ""
      });
      this.saveSchedule();
      this.renderSchedule();
      this.els.sName.value = '';
  }

  renderSchedule() {
      this.els.sTable.innerHTML = '';
      const nowStr = this.formatTimeHHMM(new Date());
      
      this.state.schedule.sort((a,b) => a.start.localeCompare(b.start));

      this.state.schedule.forEach(ex => {
          const row = document.createElement('tr');
          if (nowStr >= ex.start && nowStr < ex.end) row.classList.add('active-row');
          if (nowStr >= ex.end) row.classList.add('past-row');

          row.innerHTML = `
            <td>${ex.start} - ${ex.end}</td>
            <td><strong>${ex.name}</strong></td>
            <td><button class="btn-icon-del">×</button></td>
          `;
          row.querySelector('.btn-icon-del').addEventListener('click', () => {
              this.state.schedule = this.state.schedule.filter(i => i.id !== ex.id);
              this.saveSchedule();
              this.renderSchedule();
          });
          this.els.sTable.appendChild(row);
      });
  }

  saveSchedule() {
      localStorage.setItem('examSchedule_v2', JSON.stringify(this.state.schedule));
  }
  
  loadSchedule() {
      const data = localStorage.getItem('examSchedule_v2');
      if(data) this.state.schedule = JSON.parse(data);
  }
  
  clearSchedule() {
      if(confirm("Clear all?")) {
          this.state.schedule = [];
          this.saveSchedule();
          this.renderSchedule();
      }
  }

  // --- CSV ---
  exportCSV() {
      const rows = [["Start", "End", "Subject", "Note"]];
      this.state.schedule.forEach(ex => rows.push([ex.start, ex.end, `"${ex.name}"`, `"${ex.info}"`]));
      const content = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(content));
      link.setAttribute("download", "schedule.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
  }

  importCSV(e) {
      const file = e.target.files[0];
      if(!file) return;
      const r = new FileReader();
      r.onload = (evt) => {
          const rows = evt.target.result.split('\n').slice(1); // skip header
          const newSched = [];
          rows.forEach((line, idx) => {
              // Basic CSV parse
              const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g); 
              if(cols && cols.length >= 2) {
                  const clean = cols.map(c => c.replace(/^"|"$/g, '').trim());
                  if(clean[0] && clean[1]) {
                      newSched.push({
                          id: Date.now() + idx,
                          start: clean[0], end: clean[1],
                          name: clean[2] || "Imported", info: clean[3] || ""
                      });
                  }
              }
          });
          if(newSched.length) {
              this.state.schedule = newSched;
              this.saveSchedule();
              this.renderSchedule();
              alert(`Imported ${newSched.length} items`);
          }
      };
      r.readAsText(file);
      e.target.value = '';
  }

  // --- Utils ---
  toggleBg() {
      if(this.state.bgIndex > 1) document.body.classList.remove(`background-${this.state.bgIndex}`);
      this.state.bgIndex = (this.state.bgIndex % 4) + 1; // 4 images max
      if(this.state.bgIndex > 1) document.body.classList.add(`background-${this.state.bgIndex}`);
  }
  
  toggleSound() {
      this.state.soundEnabled = !this.state.soundEnabled;
      this.els.soundToggle.textContent = this.state.soundEnabled ? "🔊 Sound On" : "🔈 Sound Off";
      this.els.soundToggle.classList.toggle('active', this.state.soundEnabled);
      // Try unlock on toggle
      if(this.state.soundEnabled) this.unlockAudioContext();
  }

  zoom(amount) {
      this.state.zoom = Math.max(0.5, Math.min(2, this.state.zoom + amount));
      this.els.container.style.transform = `scale(${this.state.zoom})`;
  }

  updateClock() {
      const now = new Date();
      this.els.clock.textContent = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit' });
      this.els.date.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatTimeHHMM(d) { return d.toTimeString().substring(0, 5); }
  getDateFromStr(s) {
      const [h, m] = s.split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0); return d;
  }
  formatDuration(ms) {
      if(ms < 0) ms = 0;
      const s = Math.ceil(ms/1000);
      const h = Math.floor(s/3600);
      const m = Math.floor((s%3600)/60);
      const sec = s%60;
      return [h,m,sec].map(v => v.toString().padStart(2,'0')).join(':');
  }
}

document.addEventListener('DOMContentLoaded', () => new ExamTimer());