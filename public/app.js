let eventsState = [];
let currentViewDate = new Date();
let selectedDate = new Date();
let calendarViewMode = localStorage.getItem('famcal-view-mode') || 'month';

const calendarEventsContainer = document.getElementById('calendar-events');
const eventForm = document.getElementById('event-form');
const formDrawer = document.getElementById('form-drawer');
const formHeading = document.getElementById('form-heading');
const toggleFormBtn = document.getElementById('toggle-form-btn');
const cancelBtn = document.getElementById('cancel-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');
const submitBtn = document.getElementById('submit-btn');
const eventIdInput = document.getElementById('event-id');
const eventSummaryInput = document.getElementById('event-summary');
const eventMemberSelect = document.getElementById('event-member');
const eventStartInput = document.getElementById('event-start');
const eventEndInput = document.getElementById('event-end');
const eventAllDayInput = document.getElementById('event-all-day');
const eventStartLabel = document.getElementById('event-start-label');
const eventEndLabel = document.getElementById('event-end-label');
const eventsCountSpan = document.getElementById('events-count');
const feedTitle = document.getElementById('events-heading');

const viewMonthBtn = document.getElementById('view-month-btn');
const viewWeekBtn = document.getElementById('view-week-btn');
const calendarMonthYear = document.getElementById('calendar-month-year');
const prevPeriodBtn = document.getElementById('prev-period-btn');
const nextPeriodBtn = document.getElementById('next-period-btn');
const todayBtn = document.getElementById('today-btn');
const calendarDaysGrid = document.getElementById('calendar-days-grid');

const themeToggleBtn = document.getElementById('theme-toggle-btn');
const iconMoon = themeToggleBtn ? themeToggleBtn.querySelector('.icon-moon') : null;
const iconSun = themeToggleBtn ? themeToggleBtn.querySelector('.icon-sun') : null;
const currentThemeLabel = document.getElementById('current-theme-label');
const metaThemeColor = document.querySelector('meta[name="theme-color"]');

const refreshBtn = document.getElementById('refresh-btn');
const menuBtn = document.getElementById('menu-btn');
const settingsDrawer = document.getElementById('settings-drawer');
const settingsDrawerBackdrop = document.getElementById('settings-drawer-backdrop');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const userProfileSelect = document.getElementById('user-profile-select');

const VALID_MEMBERS = ['Dad', 'Mum', 'Owen', 'Liv', 'Other'];

const DB_NAME = 'famcal_db';
const DB_VERSION = 1;
const SETTINGS_STORE = 'settings';

function openDatabase() {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => {
      console.warn('IndexedDB open error:', e.target.error);
      resolve(null);
    };
  });
}

async function getSetting(key, fallback = null) {
  try {
    const db = await openDatabase();
    if (!db) {
      const val = localStorage.getItem(`famcal-${key}`);
      return val !== null ? val : fallback;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(SETTINGS_STORE, 'readonly');
      const store = tx.objectStore(SETTINGS_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result;
        if (result !== undefined && result !== null) {
          resolve(result);
        } else {
          const localVal = localStorage.getItem(`famcal-${key}`);
          resolve(localVal !== null ? localVal : fallback);
        }
      };
      req.onerror = () => {
        const localVal = localStorage.getItem(`famcal-${key}`);
        resolve(localVal !== null ? localVal : fallback);
      };
    });
  } catch (_) {
    const val = localStorage.getItem(`famcal-${key}`);
    return val !== null ? val : fallback;
  }
}

async function setSetting(key, value) {
  try {
    localStorage.setItem(`famcal-${key}`, value);
    const db = await openDatabase();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(SETTINGS_STORE, 'readwrite');
      const store = tx.objectStore(SETTINGS_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn(`Failed to set setting ${key} in IndexedDB:`, err);
  }
}

const headerUserTag = document.getElementById('header-user-tag');
const headerUserName = document.getElementById('header-user-name');

function updateHeaderUser(userName) {
  if (!headerUserName) return;
  const name = userName || 'Dad';
  headerUserName.textContent = name;
  headerUserName.className = `header-user-name user-${name.toLowerCase()}`;
}

async function initUserProfile() {
  const savedProfile = await getSetting('user-profile', 'Dad');
  const userDropdownBtn = document.getElementById('user-dropdown-btn');
  const userDropdownMenu = document.getElementById('user-dropdown-menu');
  const userDropdownDot = document.getElementById('user-dropdown-dot');
  const userDropdownLabel = document.getElementById('user-dropdown-label');
  const userDropdownGroup = document.getElementById('user-profile-dropdown');
  const dropdownItems = userDropdownGroup ? userDropdownGroup.querySelectorAll('.custom-dropdown-item') : [];

  const closeDropdown = () => {
    if (userDropdownMenu) userDropdownMenu.classList.add('hidden');
    if (userDropdownGroup) userDropdownGroup.classList.remove('is-open');
    if (userDropdownBtn) userDropdownBtn.setAttribute('aria-expanded', 'false');
  };

  const syncUserSelection = async (user) => {
    if (userProfileSelect) {
      userProfileSelect.value = user;
    }
    if (userDropdownDot) {
      userDropdownDot.className = `member-dot dot-${(user || 'other').toLowerCase()}`;
    }
    if (userDropdownLabel) {
      userDropdownLabel.textContent = user;
    }
    dropdownItems.forEach(item => {
      const isMatch = item.getAttribute('data-user') === user;
      item.classList.toggle('is-selected', isMatch);
      item.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });
    updateHeaderUser(user);
    if (window.FamCalShifts) {
      window.FamCalShifts.setCurrentUser(user);
    }
    await setSetting('user-profile', user);
  };

  await syncUserSelection(savedProfile);

  if (userDropdownBtn && userDropdownMenu) {
    userDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !userDropdownMenu.classList.contains('hidden');
      if (isOpen) {
        closeDropdown();
      } else {
        userDropdownMenu.classList.remove('hidden');
        if (userDropdownGroup) userDropdownGroup.classList.add('is-open');
        userDropdownBtn.setAttribute('aria-expanded', 'true');
      }
    });

    dropdownItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const user = item.getAttribute('data-user');
        if (user) {
          syncUserSelection(user);
        }
        closeDropdown();
      });
    });

    document.addEventListener('click', (e) => {
      if (userDropdownGroup && !userDropdownGroup.contains(e.target)) {
        closeDropdown();
      }
    });
  }

  if (userProfileSelect) {
    userProfileSelect.addEventListener('change', async () => {
      syncUserSelection(userProfileSelect.value);
    });
  }
  if (headerUserTag) {
    headerUserTag.addEventListener('click', openSettingsDrawer);
  }
}

const eventMemberDropdownGroup = document.getElementById('event-member-dropdown');
const eventMemberDropdownBtn = document.getElementById('event-member-dropdown-btn');
const eventMemberDropdownMenu = document.getElementById('event-member-dropdown-menu');
const eventMemberDropdownDot = document.getElementById('event-member-dropdown-dot');
const eventMemberDropdownLabel = document.getElementById('event-member-dropdown-label');

function syncEventMemberUI(member) {
  const cleanMember = member || 'Dad';
  if (eventMemberSelect) {
    eventMemberSelect.value = cleanMember;
  }
  if (eventMemberDropdownDot) {
    eventMemberDropdownDot.className = `member-dot dot-${cleanMember.toLowerCase()}`;
  }
  if (eventMemberDropdownLabel) {
    eventMemberDropdownLabel.textContent = cleanMember;
  }
  if (eventMemberDropdownMenu) {
    const items = eventMemberDropdownMenu.querySelectorAll('.custom-dropdown-item');
    items.forEach((item) => {
      const isMatch = item.getAttribute('data-member') === cleanMember;
      item.classList.toggle('is-selected', isMatch);
      item.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });
  }
  if (window.FamCalShifts) {
    window.FamCalShifts.renderShiftsForUser(cleanMember);
  }
}

function closeEventMemberDropdown() {
  if (eventMemberDropdownMenu) eventMemberDropdownMenu.classList.add('hidden');
  if (eventMemberDropdownGroup) eventMemberDropdownGroup.classList.remove('is-open');
  if (eventMemberDropdownBtn) eventMemberDropdownBtn.setAttribute('aria-expanded', 'false');
}

function setupEventMemberDropdown() {
  if (!eventMemberDropdownBtn || !eventMemberDropdownMenu) return;

  eventMemberDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !eventMemberDropdownMenu.classList.contains('hidden');
    if (isOpen) {
      closeEventMemberDropdown();
    } else {
      eventMemberDropdownMenu.classList.remove('hidden');
      if (eventMemberDropdownGroup) eventMemberDropdownGroup.classList.add('is-open');
      eventMemberDropdownBtn.setAttribute('aria-expanded', 'true');
    }
  });

  const items = eventMemberDropdownMenu.querySelectorAll('.custom-dropdown-item');
  items.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const member = item.getAttribute('data-member');
      if (member) {
        syncEventMemberUI(member);
      }
      closeEventMemberDropdown();
    });
  });

  document.addEventListener('click', (e) => {
    if (eventMemberDropdownGroup && !eventMemberDropdownGroup.contains(e.target)) {
      closeEventMemberDropdown();
    }
  });
}

function applyTheme(theme) {
  const themeColor = theme === 'dark' ? '#090d16' : '#f2f2f7';
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (iconMoon) iconMoon.classList.add('hidden');
    if (iconSun) iconSun.classList.remove('hidden');
    if (currentThemeLabel) currentThemeLabel.textContent = 'Dark Mode';
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (iconMoon) iconMoon.classList.remove('hidden');
    if (iconSun) iconSun.classList.add('hidden');
    if (currentThemeLabel) currentThemeLabel.textContent = 'Light Mode';
  }
  const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
  themeMetas.forEach((m) => m.setAttribute('content', themeColor));
}

async function initTheme() {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const defaultTheme = prefersDark ? 'dark' : 'light';
  const savedTheme = await getSetting('theme', defaultTheme);
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', async () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      await setSetting('theme', newTheme);
    });
  }
}

function formatDateOnly(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setAllDayMode(isAllDay) {
  if (!eventStartInput || !eventEndInput) return;
  if (eventAllDayInput) eventAllDayInput.checked = isAllDay;

  if (isAllDay) {
    if (eventStartLabel) eventStartLabel.textContent = 'Start Date';
    if (eventEndLabel) eventEndLabel.textContent = 'End Date';

    const currStart = eventStartInput.value;
    const currEnd = eventEndInput.value;

    eventStartInput.type = 'date';
    eventEndInput.type = 'date';

    eventStartInput.value = currStart ? currStart.slice(0, 10) : formatDateOnly(selectedDate);
    eventEndInput.value = currEnd ? currEnd.slice(0, 10) : (eventStartInput.value || formatDateOnly(selectedDate));
  } else {
    if (eventStartLabel) eventStartLabel.textContent = 'Start Time';
    if (eventEndLabel) eventEndLabel.textContent = 'End Time';

    const currStart = eventStartInput.value;
    const currEnd = eventEndInput.value;

    eventStartInput.type = 'datetime-local';
    eventEndInput.type = 'datetime-local';

    const d = new Date(selectedDate);
    const now = new Date();
    d.setHours(now.getHours() + 1, 0, 0, 0);
    eventStartInput.value = currStart && currStart.length === 10 ? `${currStart}T09:00` : formatForDateTimeLocal(d.toISOString());
    const dEnd = new Date(d.getTime() + 60 * 60 * 1000);
    eventEndInput.value = currEnd && currEnd.length === 10 ? `${currEnd}T10:00` : formatForDateTimeLocal(dEnd.toISOString());
  }
}

function formatForDateTimeLocal(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
}

function formatDisplayDate(isoString) {
  if (!isoString) return 'TBD';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('default', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function formatEventTimeRange(rawStart, rawEnd, isAllDay = false) {
  if (!rawStart) return 'TBD';
  if (isAllDay || /^\d{4}-\d{2}-\d{2}$/.test(rawStart)) {
    const sDate = new Date(rawStart + (rawStart.includes('T') ? '' : 'T00:00:00'));
    const sDateStr = new Intl.DateTimeFormat('default', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(sDate);
    if (!rawEnd || rawEnd === rawStart) {
      return `All Day · ${sDateStr}`;
    }
    const eDate = new Date(rawEnd + (rawEnd.includes('T') ? '' : 'T00:00:00'));
    const diffDays = Math.round((eDate.getTime() - sDate.getTime()) / 86400000);
    if (diffDays <= 1) {
      return `All Day · ${sDateStr}`;
    }
    const inclusiveEnd = new Date(eDate.getTime() - 86400000);
    const eDateStr = new Intl.DateTimeFormat('default', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(inclusiveEnd);
    return `All Day · ${sDateStr} — ${eDateStr}`;
  }

  const startD = new Date(rawStart);
  if (isNaN(startD.getTime())) return rawStart;

  const dateStr = new Intl.DateTimeFormat('default', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(startD);

  const startTimeStr = new Intl.DateTimeFormat('default', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(startD);

  if (!rawEnd) {
    return `${dateStr}, ${startTimeStr}`;
  }

  const endD = new Date(rawEnd);
  if (isNaN(endD.getTime())) {
    return `${dateStr}, ${startTimeStr}`;
  }

  const endTimeStr = new Intl.DateTimeFormat('default', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(endD);

  if (isSameDay(startD, endD)) {
    return `${dateStr}, ${startTimeStr} — ${endTimeStr}`;
  } else {
    const endDateStr = new Intl.DateTimeFormat('default', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(endD);
    return `${dateStr}, ${startTimeStr} — ${endDateStr}, ${endTimeStr}`;
  }
}

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEventMember(evt) {
  const desc = evt.description || '';
  const matchDesc = desc.match(/\[Member:\s*(Dad|Mum|Owen|Liv|Olivia|Other)\]/i);
  if (matchDesc && matchDesc[1]) {
    let formatted = matchDesc[1].charAt(0).toUpperCase() + matchDesc[1].slice(1).toLowerCase();
    if (formatted === 'Olivia') formatted = 'Liv';
    if (VALID_MEMBERS.includes(formatted)) return formatted;
  }

  const summary = evt.summary || '';
  const matchSummary = summary.match(/^\[?(Dad|Mum|Owen|Liv|Olivia|Other)\]?[:\s-]/i);
  if (matchSummary && matchSummary[1]) {
    let formatted = matchSummary[1].charAt(0).toUpperCase() + matchSummary[1].slice(1).toLowerCase();
    if (formatted === 'Olivia') formatted = 'Liv';
    if (VALID_MEMBERS.includes(formatted)) return formatted;
  }

  return 'Other';
}

function getEventsForDay(date) {
  return eventsState.filter((evt) => {
    const isAllDay = Boolean(evt.start?.date && !evt.start?.dateTime);
    if (isAllDay) {
      const startDateStr = evt.start.date;
      const endDateStr = evt.end?.date || evt.start.date;
      const [sY, sM, sD] = startDateStr.split('-').map(Number);
      const startD = new Date(sY, sM - 1, sD, 0, 0, 0);
      const [eY, eM, eD] = endDateStr.split('-').map(Number);
      const endExclusiveD = new Date(eY, eM - 1, eD, 0, 0, 0);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      return startD <= dayEnd && endExclusiveD > dayStart;
    }
    const rawStart = evt.start?.dateTime;
    const rawEnd = evt.end?.dateTime;
    if (!rawStart) return false;
    const startD = new Date(rawStart);
    if (isSameDay(startD, date)) return true;
    if (rawEnd) {
      const endD = new Date(rawEnd);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      if (startD <= dayEnd && endD >= dayStart) return true;
    }
    return false;
  });
}

function renderCalendar() {
  if (viewMonthBtn && viewWeekBtn) {
    if (calendarViewMode === 'month') {
      viewMonthBtn.classList.add('is-active');
      viewMonthBtn.setAttribute('aria-selected', 'true');
      viewWeekBtn.classList.remove('is-active');
      viewWeekBtn.setAttribute('aria-selected', 'false');
    } else {
      viewWeekBtn.classList.add('is-active');
      viewWeekBtn.setAttribute('aria-selected', 'true');
      viewMonthBtn.classList.remove('is-active');
      viewMonthBtn.setAttribute('aria-selected', 'false');
    }
  }

  if (calendarViewMode === 'week') {
    renderCalendarWeek();
  } else {
    renderCalendarMonth();
  }
}

function renderCalendarMonth() {
  if (!calendarDaysGrid || !calendarMonthYear) return;

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  calendarMonthYear.textContent = new Intl.DateTimeFormat('default', {
    month: 'long',
    year: 'numeric'
  }).format(currentViewDate);

  calendarDaysGrid.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, dayNum);
    calendarDaysGrid.appendChild(createDayElement(dateObj, true));
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateObj = new Date(year, month, d);
    calendarDaysGrid.appendChild(createDayElement(dateObj, false));
  }

  // Next month padding to balance grid
  const totalRendered = firstDayIndex + daysInCurrentMonth;
  const targetCells = totalRendered > 35 ? 42 : 35;
  const remaining = targetCells - totalRendered;
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(year, month + 1, d);
    calendarDaysGrid.appendChild(createDayElement(dateObj, true));
  }
}

function renderCalendarWeek() {
  if (!calendarDaysGrid || !calendarMonthYear) return;

  const startOfWeek = getStartOfWeek(currentViewDate);
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 86400000);

  const startMonthName = new Intl.DateTimeFormat('default', { month: 'short' }).format(startOfWeek);
  const endMonthName = new Intl.DateTimeFormat('default', { month: 'short' }).format(endOfWeek);
  const yearStr = endOfWeek.getFullYear();

  if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
    calendarMonthYear.textContent = `${startMonthName} ${startOfWeek.getDate()} – ${endOfWeek.getDate()}, ${yearStr}`;
  } else {
    calendarMonthYear.textContent = `${startMonthName} ${startOfWeek.getDate()} – ${endMonthName} ${endOfWeek.getDate()}, ${yearStr}`;
  }

  calendarDaysGrid.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const dateObj = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
    calendarDaysGrid.appendChild(createDayElement(dateObj, false));
  }
}

function createDayElement(dateObj, isOtherMonth) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'calendar-day-cell';
  if (isOtherMonth) btn.classList.add('other-month');

  const today = new Date();
  if (isSameDay(dateObj, today)) {
    btn.classList.add('is-today');
  }

  if (isSameDay(dateObj, selectedDate)) {
    btn.classList.add('is-selected');
    btn.setAttribute('aria-selected', 'true');
  }

  const dayEvents = getEventsForDay(dateObj);
  const uniqueMembers = [...new Set(dayEvents.map(getEventMember))];

  if (uniqueMembers.length > 0) {
    btn.classList.add('has-events');
  }

  const numSpan = document.createElement('span');
  numSpan.className = 'day-number';
  numSpan.textContent = dateObj.getDate();
  btn.appendChild(numSpan);

  if (uniqueMembers.length > 0) {
    const dotsRow = document.createElement('div');
    dotsRow.className = 'event-dots-row';
    uniqueMembers.forEach((member) => {
      const dot = document.createElement('span');
      dot.className = `member-dot dot-${member.toLowerCase()}`;
      dotsRow.appendChild(dot);
    });
    btn.appendChild(dotsRow);
  }

  btn.addEventListener('click', () => {
    selectedDate = dateObj;
    currentViewDate = new Date(dateObj);
    renderCalendar();
    renderDayEvents();
  });

  return btn;
}

function renderDayEvents() {
  if (!calendarEventsContainer) return;

  const today = new Date();
  const isSelectedToday = isSameDay(selectedDate, today);

  const formattedDay = new Intl.DateTimeFormat('default', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(selectedDate);

  if (feedTitle) {
    feedTitle.textContent = isSelectedToday ? `Today (${formattedDay})` : formattedDay;
  }

  const dayEvents = getEventsForDay(selectedDate);
  eventsCountSpan.textContent = `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`;

  calendarEventsContainer.innerHTML = '';

  if (dayEvents.length === 0) {
    calendarEventsContainer.innerHTML = `
      <div class="empty-state">
        <p class="state-title">No events scheduled</p>
        <p class="state-text">No family events for ${formattedDay}. Tap + to add one.</p>
      </div>
    `;
    return;
  }

  dayEvents.forEach((evt) => {
    const card = document.createElement('article');
    const member = getEventMember(evt);
    const memberKey = (member || 'other').toLowerCase();
    card.className = `event-card member-border-${memberKey}`;
    card.dataset.id = evt.id;

    const rawStart = evt.start?.dateTime || evt.start?.date || '';
    const rawEnd = evt.end?.dateTime || evt.end?.date || '';

    const titleEl = document.createElement('h3');
    titleEl.className = 'event-title';
    const rawTitle = evt.summary || '(Untitled Event)';
    titleEl.textContent = rawTitle.replace(/^\[(Dad|Mum|Owen|Liv|Olivia|Other)\]/i, '$1').replace(/^Olivia\b/i, 'Liv');

    const bottomRow = document.createElement('div');
    bottomRow.className = 'event-bottom-row';

    const isAllDay = Boolean(evt.start?.date && !evt.start?.dateTime);
    const timeEl = document.createElement('div');
    timeEl.className = 'event-time-range';
    timeEl.textContent = formatEventTimeRange(rawStart, rawEnd, isAllDay);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'event-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-action btn-edit';
    editBtn.innerHTML = '<span class="material-symbols-rounded">edit</span>';
    editBtn.setAttribute('aria-label', 'Edit event');
    editBtn.dataset.action = 'edit';
    editBtn.dataset.id = evt.id;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-action btn-delete';
    deleteBtn.innerHTML = '<span class="material-symbols-rounded">delete</span>';
    deleteBtn.setAttribute('aria-label', 'Delete event');
    deleteBtn.dataset.action = 'delete';
    deleteBtn.dataset.id = evt.id;

    actionsRow.appendChild(editBtn);
    actionsRow.appendChild(deleteBtn);

    bottomRow.appendChild(timeEl);
    bottomRow.appendChild(actionsRow);

    card.appendChild(titleEl);
    card.appendChild(bottomRow);

    calendarEventsContainer.appendChild(card);
  });
}

function openForm(isEdit = false) {
  formDrawer.classList.remove('hidden');
  formDrawer.setAttribute('aria-hidden', 'false');
  if (isEdit) {
    formHeading.textContent = 'Edit Event';
    submitBtn.textContent = 'Update Event';
    const currentMember = eventMemberSelect ? eventMemberSelect.value : 'Dad';
    syncEventMemberUI(currentMember);
  } else {
    formHeading.textContent = 'New Event';
    submitBtn.textContent = 'Save Event';

    const defaultMember = userProfileSelect ? userProfileSelect.value : (localStorage.getItem('famcal-user-profile') || 'Dad');
    syncEventMemberUI(defaultMember);
    setAllDayMode(false);

    const d = new Date(selectedDate);
    const now = new Date();
    d.setHours(now.getHours() + 1, 0, 0, 0);
    eventStartInput.value = formatForDateTimeLocal(d.toISOString());
    const dEnd = new Date(d.getTime() + 60 * 60 * 1000);
    eventEndInput.value = formatForDateTimeLocal(dEnd.toISOString());
    const quickShift = document.getElementById('quick-shift-select');
    if (quickShift) quickShift.value = '';
  }

  if (window.FamCalShifts && eventMemberSelect) {
    window.FamCalShifts.renderShiftsForUser(eventMemberSelect.value);
  }
}

window.FamCalOpenEventForm = (prefill = {}) => {
  openForm(false);
  if (prefill.summary && eventSummaryInput) {
    eventSummaryInput.value = prefill.summary;
    setTimeout(() => eventSummaryInput.focus(), 100);
  }
};

if (eventMemberSelect) {
  eventMemberSelect.addEventListener('change', () => {
    syncEventMemberUI(eventMemberSelect.value);
  });
}

function closeForm() {
  eventForm.reset();
  eventIdInput.value = '';
  closeEventMemberDropdown();
  const quickShift = document.getElementById('quick-shift-select');
  if (quickShift) quickShift.value = '';
  formHeading.textContent = 'New Event';
  submitBtn.textContent = 'Save Event';
  formDrawer.classList.add('hidden');
  formDrawer.setAttribute('aria-hidden', 'true');
}

async function loadEvents() {
  eventsCountSpan.textContent = 'Syncing...';

  try {
    const response = await fetch('/api/calendar');
    if (!response.ok) {
      let errMsg = `Server returned HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errMsg = typeof errJson.error === 'object' ? (errJson.error.message || JSON.stringify(errJson.error)) : errJson.error;
        }
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    eventsState = Array.isArray(data) ? data : [];

    renderCalendar();
    renderDayEvents();
  } catch (error) {
    eventsCountSpan.textContent = 'Offline';
    calendarEventsContainer.innerHTML = `
      <div class="empty-state error-state">
        <p class="state-title">Unable to load events</p>
        <p class="state-text">${error.message}</p>
        <button type="button" class="btn btn-secondary retry-btn" id="retry-fetch-btn">Retry</button>
      </div>
    `;
    const retryBtn = document.getElementById('retry-fetch-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', loadEvents);
    }
  }
}

calendarEventsContainer.addEventListener('click', async (e) => {
  const target = e.target.closest('button');
  if (!target) return;

  const action = target.dataset.action;
  const eventId = target.dataset.id;
  if (!action || !eventId) return;

  if (action === 'delete') {
    const item = eventsState.find((ev) => ev.id === eventId);
    const itemTitle = item ? (item.summary || 'Event') : 'Event';
    const confirmModalBackdrop = document.getElementById('confirm-modal-backdrop');
    const confirmModalTitle = document.getElementById('confirm-modal-title');
    const confirmModalMessage = document.getElementById('confirm-modal-message');
    const confirmModalDeleteBtn = document.getElementById('confirm-modal-delete-btn');
    const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');

    if (!confirmModalBackdrop || !confirmModalDeleteBtn) {
      if (!window.confirm(`Delete "${itemTitle}"?`)) return;
      try {
        target.disabled = true;
        const response = await fetch(`/api/calendar?eventId=${encodeURIComponent(eventId)}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error(`Failed to delete event: ${response.statusText}`);
        await loadEvents();
      } catch (err) {
        alert(`Error deleting event: ${err.message}`);
        target.disabled = false;
      }
      return;
    }

    const onConfirmDelete = async () => {
      cleanup();
      try {
        target.disabled = true;
        const response = await fetch(`/api/calendar?eventId=${encodeURIComponent(eventId)}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error(`Failed to delete event: ${response.statusText}`);
        await loadEvents();
      } catch (err) {
        alert(`Error deleting event: ${err.message}`);
        target.disabled = false;
      }
    };

    const onClose = () => {
      cleanup();
    };

    function cleanup() {
      if (confirmModalBackdrop) {
        confirmModalBackdrop.classList.add('hidden');
        confirmModalBackdrop.setAttribute('aria-hidden', 'true');
      }
      confirmModalDeleteBtn?.removeEventListener('click', onConfirmDelete);
      confirmModalCancelBtn?.removeEventListener('click', onClose);
      confirmModalBackdrop?.removeEventListener('click', onBackdropClick);
    }

    function onBackdropClick(e) {
      if (e.target === confirmModalBackdrop) onClose();
    }

    if (confirmModalTitle) confirmModalTitle.textContent = `Delete "${itemTitle}"?`;
    if (confirmModalMessage) confirmModalMessage.textContent = 'Are you sure you want to delete this event from the calendar?';
    confirmModalDeleteBtn.addEventListener('click', onConfirmDelete);
    confirmModalCancelBtn?.addEventListener('click', onClose);
    confirmModalBackdrop.addEventListener('click', onBackdropClick);
    confirmModalBackdrop.classList.remove('hidden');
    confirmModalBackdrop.setAttribute('aria-hidden', 'false');
  } else if (action === 'edit') {
    const item = eventsState.find((ev) => ev.id === eventId);
    if (!item) return;

    eventIdInput.value = item.id;
    const rawSummary = item.summary || '';
    eventSummaryInput.value = rawSummary.replace(/^\[?(Dad|Mum|Owen|Liv|Olivia|Other)\]?\s*-\s*/i, '').trim();

    if (eventMemberSelect) {
      eventMemberSelect.value = getEventMember(item);
    }

    const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
    setAllDayMode(isAllDay);

    if (isAllDay) {
      eventStartInput.value = item.start.date;
      let endDateVal = item.end?.date || item.start.date;
      const [ey, em, ed] = endDateVal.split('-').map(Number);
      const endD = new Date(ey, em - 1, ed);
      endD.setDate(endD.getDate() - 1);
      const [sy, sm, sd] = item.start.date.split('-').map(Number);
      const startD = new Date(sy, sm - 1, sd);
      if (endD >= startD) {
        eventEndInput.value = formatDateOnly(endD);
      } else {
        eventEndInput.value = item.start.date;
      }
    } else {
      const startVal = item.start?.dateTime || '';
      const endVal = item.end?.dateTime || '';
      eventStartInput.value = formatForDateTimeLocal(startVal);
      eventEndInput.value = formatForDateTimeLocal(endVal);
    }

    openForm(true);
  }
});

if (eventAllDayInput) {
  eventAllDayInput.addEventListener('change', () => {
    setAllDayMode(eventAllDayInput.checked);
  });
}

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = eventIdInput.value.trim();
  const summary = eventSummaryInput.value.trim();
  const member = eventMemberSelect ? eventMemberSelect.value : 'Other';
  const start = eventStartInput.value;
  const end = eventEndInput.value;

  if (!summary || !start || !end) {
    alert('Please complete all required fields.');
    return;
  }

  const cleanSummary = summary.replace(/^\[?(Dad|Mum|Owen|Liv|Olivia|Other)\]?\s*-\s*/i, '').trim();
  const isOther = (member || '').toLowerCase() === 'other';
  const prefixedSummary = isOther ? cleanSummary : `${member} - ${cleanSummary}`;

  localStorage.setItem('famcal-member-pref', member);

  const isUpdating = Boolean(id);
  const method = isUpdating ? 'PUT' : 'POST';
  const isAllDay = Boolean(eventAllDayInput && eventAllDayInput.checked);
  const payload = {
    summary: prefixedSummary,
    description: `[Member: ${member}]`,
    allDay: isAllDay,
    start: isAllDay ? eventStartInput.value : new Date(start).toISOString(),
    end: isAllDay ? eventEndInput.value : new Date(end).toISOString()
  };

  if (isUpdating) {
    payload.eventId = id;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = isUpdating ? 'Updating...' : 'Saving...';

  try {
    const res = await fetch('/api/calendar', {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Server returned status ${res.status}: ${err}`);
    }

    closeForm();
    await loadEvents();
  } catch (error) {
    alert(`Failed to save event: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isUpdating ? 'Update Event' : 'Save Event';
  }
});

toggleFormBtn.addEventListener('click', () => {
  if (formDrawer.classList.contains('hidden')) {
    openForm(false);
  } else {
    closeForm();
  }
});

cancelBtn.addEventListener('click', () => {
  closeForm();
});

if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', () => {
    closeForm();
  });
}

if (formDrawer) {
  formDrawer.addEventListener('click', (e) => {
    if (e.target === formDrawer) {
      closeForm();
    }
  });
}

if (viewMonthBtn) {
  viewMonthBtn.addEventListener('click', async () => {
    calendarViewMode = 'month';
    await setSetting('view-mode', 'month');
    currentViewDate = new Date(selectedDate);
    renderCalendar();
  });
}

if (viewWeekBtn) {
  viewWeekBtn.addEventListener('click', async () => {
    calendarViewMode = 'week';
    await setSetting('view-mode', 'week');
    currentViewDate = new Date(selectedDate);
    renderCalendar();
  });
}

if (prevPeriodBtn) {
  prevPeriodBtn.addEventListener('click', () => {
    if (calendarViewMode === 'week') {
      currentViewDate = new Date(currentViewDate.getTime() - 7 * 86400000);
    } else {
      currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1);
    }
    renderCalendar();
  });
}

if (nextPeriodBtn) {
  nextPeriodBtn.addEventListener('click', () => {
    if (calendarViewMode === 'week') {
      currentViewDate = new Date(currentViewDate.getTime() + 7 * 86400000);
    } else {
      currentViewDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1);
    }
    renderCalendar();
  });
}

if (todayBtn) {
  todayBtn.addEventListener('click', () => {
    currentViewDate = new Date();
    selectedDate = new Date();
    renderCalendar();
    renderDayEvents();
  });
}

function openSettingsDrawer() {
  if (settingsDrawer && settingsDrawerBackdrop) {
    document.body.classList.add('drawer-open');
    settingsDrawerBackdrop.classList.remove('hidden');
    settingsDrawer.classList.add('is-open');
    settingsDrawer.setAttribute('aria-hidden', 'false');
  }
}

function closeSettingsDrawer() {
  if (settingsDrawer && settingsDrawerBackdrop) {
    document.body.classList.remove('drawer-open');
    settingsDrawer.classList.remove('is-open');
    settingsDrawer.setAttribute('aria-hidden', 'true');
    settingsDrawerBackdrop.classList.add('hidden');
  }
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    const icon = refreshBtn.querySelector('.material-symbols-rounded');
    if (icon) icon.classList.add('is-spinning');
    refreshBtn.disabled = true;
    try {
      await loadEvents();
    } finally {
      setTimeout(() => {
        if (icon) icon.classList.remove('is-spinning');
        refreshBtn.disabled = false;
      }, 500);
    }
  });
}

if (menuBtn) {
  menuBtn.addEventListener('click', openSettingsDrawer);
}

if (closeDrawerBtn) {
  closeDrawerBtn.addEventListener('click', closeSettingsDrawer);
}

if (settingsDrawerBackdrop) {
  settingsDrawerBackdrop.addEventListener('click', closeSettingsDrawer);
}

window.addEventListener('load', async () => {
  const persistedView = await getSetting('view-mode', calendarViewMode);
  if (persistedView && persistedView !== calendarViewMode) {
    calendarViewMode = persistedView;
  }
  await initTheme();
  await initUserProfile();
  setupEventMemberDropdown();
  if (window.FamCalShifts) {
    await window.FamCalShifts.initShifts({
      getSetting,
      setSetting,
      getSelectedDate: () => selectedDate,
      getCurrentUser: () => (userProfileSelect ? userProfileSelect.value : 'Dad')
    });
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }
  loadEvents();
});
