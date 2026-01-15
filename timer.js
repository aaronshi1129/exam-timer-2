class ExamTimer {
  constructor() {
    this.digitalClock = document.getElementById('digitalClock');
    this.digitalDate = document.getElementById('digitalDate');
    this.countdownDisplay = document.getElementById('countdownDisplay');
    
    // Inputs
    this.examHoursInput = document.getElementById('examHours');
    this.examMinutesInput = document.getElementById('examMinutesInput');
    this.examEndTimeInput = document.getElementById('examEndTimeInput');
    this.examNameInput = document.getElementById('examNameInput');
    this.examInfoInput = document.getElementById('examInfoInput');
    
    // Containers
    this.countdownInputs = document.getElementById('countdownInputs');
    this.scheduledInputs = document.getElementById('scheduledInputs');
    
    // Mode Radios
    this.modeRadios = document.getElementsByName('timerMode');

    // Buttons
    this.setTimerBtn = document.getElementById('setTimerBtn');
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.backgroundToggleBtn = document.getElementById('backgroundToggle');
    this.soundToggleBtn = document.getElementById('soundToggle');
    this.zoomInBtn = document.getElementById('zoomIn');
    this.zoomOutBtn = document.getElementById('zoomOut');

    this.examTimerContainer = document.querySelector('.exam-timer-container');
    this.rightSection = document.querySelector('.right-section');

    // Logic Vars
    this.targetTime = null; // The exact Date timestamp when exam ends
    this.countdownInterval = null;
    this.currentBackground = 1;
    this.totalBackgrounds = 2;
    this.soundEnabled = false;
    this.alarmSound = new Audio('https://app.aaronshi.cc/exam-timer/sound.wav');
    this.zoomLevel = 1;
    this.timerIsSet = false;
    this.examInProgress = false;
    this.currentMode = 'countdown'; // 'countdown' or 'scheduled'

    // Initial States
    this.stopBtn.classList.add('hidden');
    this.resetBtn.disabled = true;
    this.startBtn.disabled = true;

    this.initializeEventListeners();
    this.updateDigitalClock();
    setInterval(() => this.updateDigitalClock(), 1000);
    this.setupInputValidation();
  }

  initializeEventListeners() {
    this.setTimerBtn.addEventListener('click', () => this.setExamDuration());
    
    this.startBtn.addEventListener('click', () => {
      if (!this.timerIsSet) {
        alert('Please set the timer before starting.');
        return;
      }
      this.startExam();
    });
    
    this.stopBtn.addEventListener('click', () => this.stopExam());
    this.resetBtn.addEventListener('click', () => this.resetExam());
    this.backgroundToggleBtn.addEventListener('click', () => this.toggleBackground());
    this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    this.zoomInBtn.addEventListener('click', () => this.zoomIn());
    this.zoomOutBtn.addEventListener('click', () => this.zoomOut());

    // Mode switching listeners
    this.modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => this.switchMode(e.target.value));
    });
  }

  setupInputValidation() {
    const validateInteger = (input) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value && !Number.isInteger(parseFloat(value))) {
          e.target.value = Math.floor(parseFloat(value)) || '';
        }
      });
    };
    validateInteger(this.examHoursInput);
    validateInteger(this.examMinutesInput);
  }

  switchMode(mode) {
      this.currentMode = mode;
      this.resetExam(); // Reset everything when mode changes

      if (mode === 'countdown') {
          this.countdownInputs.classList.remove('hidden');
          this.scheduledInputs.classList.add('hidden');
      } else {
          this.countdownInputs.classList.add('hidden');
          this.scheduledInputs.classList.remove('hidden');
      }
  }

  zoomIn() {
    if (this.zoomLevel < 1.5) {
      this.zoomLevel += 0.1;
      this.updateZoom();
    }
  }

  zoomOut() {
    if (this.zoomLevel > 0.7) {
      this.zoomLevel -= 0.1;
      this.updateZoom();
    }
  }

  updateZoom() {
    this.examTimerContainer.style.transform = `scale(${this.zoomLevel})`;
  }

toggleBackground() {
    // 1. 先移除當前的背景 class (如果不是第1張的話)
    if (this.currentBackground > 1) {
      document.body.classList.remove(`background-${this.currentBackground}`);
    }

    // 2. 計算下一張的號碼
    this.currentBackground++;

    // 3. 如果超過總張數，就回到第 1 張
    if (this.currentBackground > this.totalBackgrounds) {
      this.currentBackground = 1;
    }

    // 4. 如果新號碼不是第 1 張，就加上對應的 class
    // (因為第 1 張是預設 body 樣式，不需要加 class)
    if (this.currentBackground > 1) {
      document.body.classList.add(`background-${this.currentBackground}`);
    }
    
    console.log(`Switched to background ${this.currentBackground}`);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.soundToggleBtn.textContent = this.soundEnabled ? 'Sound Effect: On' : 'Sound Effect: Off';
    this.soundToggleBtn.classList.toggle('active', this.soundEnabled);
  }

  updateDigitalClock() {
    const now = new Date();
    this.digitalClock.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    this.digitalDate.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  setExamDuration() {
    let durationMs = 0;
    const now = new Date();

    if (this.currentMode === 'countdown') {
        const hours = parseInt(this.examHoursInput.value) || 0;
        const minutes = parseInt(this.examMinutesInput.value) || 0;

        if (hours === 0 && minutes === 0) {
            alert('Please enter a valid duration.');
            return;
        }
        durationMs = (hours * 3600 + minutes * 60) * 1000;
        this.targetTime = new Date(now.getTime() + durationMs);

    } else if (this.currentMode === 'scheduled') {
        const timeValue = this.examEndTimeInput.value; // Format "HH:MM"
        if (!timeValue) {
            alert('Please select an end time.');
            return;
        }

        const [hours, minutes] = timeValue.split(':').map(Number);
        
        // Create date object for today with input time
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        // If the scheduled time has already passed for today, assume they mean tomorrow? 
        // Or simpler: just warn. Let's start with warning or accepting it (could be negative).
        if (scheduledTime <= now) {
           // Allow setting for short past times? Or maybe next day?
           // Usually for exams, if time passed, it's invalid.
           // However, let's just use it. If negative, display 00:00:00.
        }
        
        this.targetTime = scheduledTime;
        durationMs = this.targetTime - now;
        
        if (durationMs <= 0) {
            alert('The selected time is in the past.');
            return;
        }
    }
    
    // Update Display immediately
    this.updateCountdownDisplay(durationMs);
    
    // Set timer state to ready
    this.timerIsSet = true;
    
    // UI Updates
    this.startBtn.disabled = false;
    this.resetBtn.disabled = false;
    this.stopBtn.classList.add('hidden');
    
    this.examHoursInput.disabled = true;
    this.examMinutesInput.disabled = true;
    this.examEndTimeInput.disabled = true;
    this.setTimerBtn.disabled = true;
    
    // Disable mode switching while set
    this.modeRadios.forEach(r => r.disabled = true);
  }

  startExam() {
    this.examInProgress = true;
    this.rightSection.classList.add('exam-started');

    // Create exam info
    const existingInfo = this.rightSection.querySelector('.exam-info');
    if(!existingInfo) {
        const examInfoDiv = document.createElement('div');
        examInfoDiv.classList.add('exam-info');
        examInfoDiv.innerHTML = `
        <div> ${this.examNameInput.value || ' '}</div>
        <div> ${this.examInfoInput.value || ' '}</div>
        `;
        this.rightSection.insertBefore(examInfoDiv, this.rightSection.firstChild);
    }

    this.startBtn.classList.add('hidden');
    this.stopBtn.classList.remove('hidden');
    this.stopBtn.disabled = false;
    this.resetBtn.classList.add('hidden');
    
    // If Scheduled Mode, we recalculate targetTime every start? 
    // No, targetTime is fixed when Set was clicked.
    // Actually, for Countdown mode, if we PAUSE (Stop) and Start again, logic gets complex.
    // The current requirement is simpler: Stop = Abort. Reset = Clear.
    // So we don't need to support "Pause/Resume".
    // BUT for countdown mode, "Set" creates a TargetTime relative to THAT moment.
    // If I wait 5 mins to click Start, I lose 5 mins.
    // FIX: For COUNTDOWN mode, we should recalculate TargetTime upon clicking START.
    
    if (this.currentMode === 'countdown') {
        // Recalculate target based on inputs again to ensure full duration starts NOW
        const hours = parseInt(this.examHoursInput.value) || 0;
        const minutes = parseInt(this.examMinutesInput.value) || 0;
        const durationMs = (hours * 3600 + minutes * 60) * 1000;
        this.targetTime = new Date(Date.now() + durationMs);
    } 
    // For Scheduled mode, TargetTime is fixed (absolute time).

    // Ticker Loop
    this.tick(); // Run once immediately
    this.countdownInterval = setInterval(() => this.tick(), 100); // 100ms for responsiveness
  }

  tick() {
      const now = new Date();
      const remainingMs = this.targetTime - now;

      if (remainingMs <= 0) {
          this.updateCountdownDisplay(0);
          this.finishExam();
      } else {
          this.updateCountdownDisplay(remainingMs);
      }
  }

  updateCountdownDisplay(ms) {
    // Ensure non-negative
    ms = Math.max(0, ms);
    this.countdownDisplay.textContent = this.formatTime(ms);
  }

  finishExam() {
      clearInterval(this.countdownInterval);
      if (this.soundEnabled) this.playAlarmSound();
      
      setTimeout(() => {
          alert('Exam time is over!');
          this.stopExam();
      }, 100);
  }

  playAlarmSound() {
    this.alarmSound.currentTime = 0;
    this.alarmSound.play().catch(e => console.error(e));
  }

  stopExam() {
    clearInterval(this.countdownInterval);
    this.examInProgress = false;
    
    this.stopBtn.classList.add('hidden');
    this.resetBtn.classList.remove('hidden');
    this.resetBtn.disabled = false;
  }

  resetExam() {
    clearInterval(this.countdownInterval);
    
    if (this.rightSection.classList.contains('exam-started')) {
      this.rightSection.classList.remove('exam-started');
      const examInfoDiv = this.rightSection.querySelector('.exam-info');
      if (examInfoDiv) examInfoDiv.remove();
    }
    
    // Clear Inputs
    this.examHoursInput.value = '';
    this.examMinutesInput.value = '';
    this.examEndTimeInput.value = '';
    this.examNameInput.value = '';
    this.examInfoInput.value = '';
    this.countdownDisplay.textContent = '00:00:00';
    
    // Reset Buttons
    this.examHoursInput.disabled = false;
    this.examMinutesInput.disabled = false;
    this.examEndTimeInput.disabled = false;
    
    this.startBtn.disabled = true;
    this.startBtn.classList.remove('hidden');
    this.stopBtn.classList.add('hidden');
    this.resetBtn.disabled = true;
    this.setTimerBtn.disabled = false;
    
    this.modeRadios.forEach(r => r.disabled = false);
    
    this.timerIsSet = false;
    this.examInProgress = false;
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000); // Ceil helps avoids showing 00:00:00 when 900ms left
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map(num => num.toString().padStart(2, '0'))
      .join(':');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const examTimer = new ExamTimer();
});
