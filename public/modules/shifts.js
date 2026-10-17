// Fam Cal - Shift Templates Module
(function () {
  const DEFAULT_SHIFTS = [
    { id: 'shift_dad_early', member: 'Dad', name: 'Early Shift', start: '07:00', end: '15:30' },
    { id: 'shift_dad_late', member: 'Dad', name: 'Late Shift', start: '15:00', end: '23:30' },
    { id: 'shift_dad_night', member: 'Dad', name: 'Night Shift', start: '23:00', end: '07:30' },
    { id: 'shift_mum_early', member: 'Mum', name: 'Early Shift', start: '07:00', end: '15:30' },
    { id: 'shift_mum_late', member: 'Mum', name: 'Late Shift', start: '15:00', end: '23:30' },
    { id: 'shift_mum_night', member: 'Mum', name: 'Night Shift', start: '23:00', end: '07:30' },
    { id: 'shift_owen_early', member: 'Owen', name: 'Early Shift', start: '07:00', end: '15:30' },
    { id: 'shift_owen_late', member: 'Owen', name: 'Late Shift', start: '15:00', end: '23:30' },
    { id: 'shift_owen_night', member: 'Owen', name: 'Night Shift', start: '23:00', end: '07:30' },
    { id: 'shift_liv_early', member: 'Liv', name: 'Early Shift', start: '07:00', end: '15:30' },
    { id: 'shift_liv_late', member: 'Liv', name: 'Late Shift', start: '15:00', end: '23:30' },
    { id: 'shift_liv_night', member: 'Liv', name: 'Night Shift', start: '23:00', end: '07:30' }
  ];

  let cachedShifts = [];
  let storageGet = null;
  let storageSet = null;
  let getSelectedDateFn = () => new Date();
  let currentSettingsUser = 'Dad';
  let currentEventUser = 'Dad';

  // DOM elements
  const quickShiftSelect = document.getElementById('quick-shift-select');
  const shiftDatalist = document.getElementById('shift-datalist');
  const shiftsList = document.getElementById('shifts-list');
  const addShiftBtn = document.getElementById('add-shift-btn');
  const shiftModalBackdrop = document.getElementById('shift-modal-backdrop');
  const shiftModalCloseBtn = document.getElementById('shift-modal-close-btn');
  const cancelShiftBtn = document.getElementById('cancel-shift-btn');
  const shiftForm = document.getElementById('shift-form');
  const shiftIdInput = document.getElementById('shift-id');
  const shiftModalHeading = document.getElementById('shift-modal-heading');
  const saveShiftBtn = document.getElementById('save-shift-btn');
  const confirmModalBackdrop = document.getElementById('confirm-modal-backdrop');
  const confirmModalTitle = document.getElementById('confirm-modal-title');
  const confirmModalMessage = document.getElementById('confirm-modal-message');
  const confirmModalDeleteBtn = document.getElementById('confirm-modal-delete-btn');
  const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');
  const shiftNameInput = document.getElementById('shift-name');
  const shiftStartInput = document.getElementById('shift-start');
  const shiftEndInput = document.getElementById('shift-end');
  const eventSummaryInput = document.getElementById('event-summary');
  const eventStartInput = document.getElementById('event-start');
  const eventEndInput = document.getElementById('event-end');

  let activeModalShiftMember = 'Dad';

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function padZero(num) {
    return String(num).padStart(2, '0');
  }

  function getDateParts(d) {
    return {
      year: d.getFullYear(),
      month: padZero(d.getMonth() + 1),
      day: padZero(d.getDate())
    };
  }

  function applyShiftToDate(shift, targetDate) {
    if (!shift || !shift.start || !shift.end || !eventStartInput || !eventEndInput) {
      return;
    }
    const baseDate = targetDate ? new Date(targetDate) : new Date();
    const { year, month, day } = getDateParts(baseDate);

    const startStr = `${year}-${month}-${day}T${shift.start}`;

    let endStr = '';
    if (shift.end <= shift.start) {
      // Overnight shift: finish is on the following day
      const nextDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
      const nextParts = getDateParts(nextDay);
      endStr = `${nextParts.year}-${nextParts.month}-${nextParts.day}T${shift.end}`;
    } else {
      endStr = `${year}-${month}-${day}T${shift.end}`;
    }

    eventStartInput.value = startStr;
    eventEndInput.value = endStr;
  }

  function renderShiftsUI(userForEvent = null) {
    const targetEventUser = userForEvent || currentEventUser || currentSettingsUser;

    // 1. Update quick shift select dropdown for event form
    const userEventShifts = cachedShifts.filter((s) => (s.member || 'Dad') === targetEventUser);
    if (quickShiftSelect) {
      quickShiftSelect.innerHTML = '<option value="" selected disabled>Select Shift</option>';
      userEventShifts.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.start} - ${s.end})`;
        quickShiftSelect.appendChild(opt);
      });
    }

    // 2. Update datalist for Event Title input
    if (shiftDatalist) {
      shiftDatalist.innerHTML = '';
      userEventShifts.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.name;
        shiftDatalist.appendChild(opt);
      });
    }

    // 3. Update shift templates list in Settings drawer for currentSettingsUser
    if (shiftsList) {
      const userSettingsShifts = cachedShifts.filter((s) => (s.member || 'Dad') === currentSettingsUser);
      if (userSettingsShifts.length === 0) {
        shiftsList.innerHTML = `
          <div class="empty-state">
            <p class="state-text">No shifts saved for ${escapeHtml(currentSettingsUser)}. Tap + above to add one.</p>
          </div>
        `;
        return;
      }

      shiftsList.innerHTML = userSettingsShifts
        .map(
          (s) => `
        <div class="shift-item" data-id="${escapeHtml(s.id)}">
          <div class="shift-info" data-action="edit-shift" data-id="${escapeHtml(s.id)}" role="button" tabindex="0" title="Tap to edit ${escapeHtml(s.name)}">
            <span class="shift-title">${escapeHtml(s.name)}</span>
            <span class="shift-times">${escapeHtml(s.start)} – ${escapeHtml(s.end)}</span>
          </div>
          <div class="shift-actions">
            <button type="button" class="btn-edit-shift" data-action="edit-shift" data-id="${escapeHtml(s.id)}" aria-label="Edit ${escapeHtml(s.name)}">
              <span class="material-symbols-rounded">edit</span>
            </button>
            <button type="button" class="btn-delete-shift" data-action="delete-shift" data-id="${escapeHtml(s.id)}" aria-label="Delete ${escapeHtml(s.name)}">
              <span class="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
      `
        )
        .join('');
    }
  }

  function openShiftModal(shift = null) {
    if (shiftModalBackdrop) {
      shiftModalBackdrop.classList.remove('hidden');
      shiftModalBackdrop.setAttribute('aria-hidden', 'false');
      if (shiftForm) shiftForm.reset();

      if (shift) {
        activeModalShiftMember = shift.member || currentSettingsUser;
        if (shiftModalHeading) shiftModalHeading.textContent = `Edit Shift (${activeModalShiftMember})`;
        if (saveShiftBtn) saveShiftBtn.textContent = 'Update Shift';
        if (shiftIdInput) shiftIdInput.value = shift.id;
        if (shiftNameInput) shiftNameInput.value = shift.name;
        if (shiftStartInput) shiftStartInput.value = shift.start;
        if (shiftEndInput) shiftEndInput.value = shift.end;
      } else {
        activeModalShiftMember = currentSettingsUser;
        if (shiftModalHeading) shiftModalHeading.textContent = `New Shift (${activeModalShiftMember})`;
        if (saveShiftBtn) saveShiftBtn.textContent = 'Save Shift';
        if (shiftIdInput) shiftIdInput.value = '';
      }

      if (shiftNameInput) shiftNameInput.focus();
    }
  }

  function closeShiftModal() {
    if (shiftModalBackdrop) {
      shiftModalBackdrop.classList.add('hidden');
      shiftModalBackdrop.setAttribute('aria-hidden', 'true');
      if (shiftForm) shiftForm.reset();
      if (shiftIdInput) shiftIdInput.value = '';
      if (shiftModalHeading) shiftModalHeading.textContent = 'New Shift Template';
      if (saveShiftBtn) saveShiftBtn.textContent = 'Save Shift';
    }
  }

  let pendingDeleteShiftId = null;

  function openConfirmModal(shift) {
    if (!confirmModalBackdrop || !shift) return;
    pendingDeleteShiftId = shift.id;
    if (confirmModalTitle) confirmModalTitle.textContent = `Delete "${shift.name}"?`;
    if (confirmModalMessage) confirmModalMessage.textContent = `Are you sure you want to delete this shift for ${shift.member || currentSettingsUser}?`;
    confirmModalBackdrop.classList.remove('hidden');
    confirmModalBackdrop.setAttribute('aria-hidden', 'false');
  }

  function closeConfirmModal() {
    pendingDeleteShiftId = null;
    if (confirmModalBackdrop) {
      confirmModalBackdrop.classList.add('hidden');
      confirmModalBackdrop.setAttribute('aria-hidden', 'true');
    }
  }

  async function saveShifts(newShifts) {
    cachedShifts = newShifts;
    if (storageSet) {
      await storageSet('shift-templates', JSON.stringify(cachedShifts));
    }
    renderShiftsUI();
  }

  async function initShifts({ getSetting, setSetting, getSelectedDate, getCurrentUser }) {
    storageGet = getSetting;
    storageSet = setSetting;
    if (getSelectedDate) {
      getSelectedDateFn = getSelectedDate;
    }
    if (getCurrentUser) {
      const u = getCurrentUser();
      if (u) {
        currentSettingsUser = u;
        currentEventUser = u;
      }
    }

    // Load shifts from storage
    try {
      const raw = await storageGet('shift-templates', null);
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        // Migrate legacy shifts without member
        cachedShifts = parsed.map((s) => {
          let member = s.member || 'Dad';
          if (member === 'Olivia') member = 'Liv';
          return { ...s, member };
        });
      } else {
        cachedShifts = [...DEFAULT_SHIFTS];
        await storageSet('shift-templates', JSON.stringify(cachedShifts));
      }
    } catch (_) {
      cachedShifts = [...DEFAULT_SHIFTS];
    }

    renderShiftsUI();

    // Event listener: Add shift button in Settings
    if (addShiftBtn) {
      addShiftBtn.addEventListener('click', () => openShiftModal(null));
    }

    // Event listener: Close shift modal
    if (shiftModalCloseBtn) {
      shiftModalCloseBtn.addEventListener('click', closeShiftModal);
    }
    if (cancelShiftBtn) {
      cancelShiftBtn.addEventListener('click', closeShiftModal);
    }
    if (shiftModalBackdrop) {
      shiftModalBackdrop.addEventListener('click', (e) => {
        if (e.target === shiftModalBackdrop) {
          closeShiftModal();
        }
      });
    }

    // Event listener: Shift form submit
    if (shiftForm) {
      shiftForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = shiftIdInput ? shiftIdInput.value.trim() : '';
        const name = shiftNameInput.value.trim();
        const start = shiftStartInput.value;
        const end = shiftEndInput.value;

        if (!name || !start || !end) {
          alert('Please fill in shift title, start time, and finish time.');
          return;
        }

        let updated;
        if (id) {
          updated = cachedShifts.map((s) => (s.id === id ? { ...s, name, start, end } : s));
        } else {
          const newShift = {
            id: `shift_${Date.now()}`,
            member: activeModalShiftMember || currentSettingsUser,
            name,
            start,
            end
          };
          updated = [...cachedShifts, newShift];
        }

        await saveShifts(updated);
        closeShiftModal();
      });
    }

    // Event listener: Edit & Delete shift in Settings list
    if (shiftsList) {
      shiftsList.addEventListener('click', (e) => {
        const editTrigger = e.target.closest('[data-action="edit-shift"]');
        if (editTrigger) {
          const shiftId = editTrigger.dataset.id;
          const shift = cachedShifts.find((s) => s.id === shiftId);
          if (shift) openShiftModal(shift);
          return;
        }

        const deleteBtn = e.target.closest('[data-action="delete-shift"]');
        if (deleteBtn) {
          const shiftId = deleteBtn.dataset.id;
          const shift = cachedShifts.find((s) => s.id === shiftId);
          if (shift) openConfirmModal(shift);
        }
      });
    }

    // Event listeners: Confirm delete modal
    if (confirmModalDeleteBtn) {
      confirmModalDeleteBtn.addEventListener('click', async () => {
        if (!pendingDeleteShiftId) return;
        const updated = cachedShifts.filter((s) => s.id !== pendingDeleteShiftId);
        await saveShifts(updated);
        closeConfirmModal();
      });
    }

    if (confirmModalCancelBtn) {
      confirmModalCancelBtn.addEventListener('click', closeConfirmModal);
    }

    if (confirmModalBackdrop) {
      confirmModalBackdrop.addEventListener('click', (e) => {
        if (e.target === confirmModalBackdrop) {
          closeConfirmModal();
        }
      });
    }

    // Event listener: Quick shift select dropdown
    if (quickShiftSelect) {
      quickShiftSelect.addEventListener('change', () => {
        const shiftId = quickShiftSelect.value;
        if (!shiftId) return;

        const shift = cachedShifts.find((s) => s.id === shiftId);
        if (shift) {
          if (eventSummaryInput) {
            eventSummaryInput.value = shift.name;
          }
          applyShiftToDate(shift, getSelectedDateFn());
        }
        quickShiftSelect.value = '';
      });
    }

    // Event listener: Picking/typing shift in Event Title input
    if (eventSummaryInput) {
      const handleTitleInput = () => {
        const val = eventSummaryInput.value.trim().toLowerCase();
        if (!val) return;
        const targetUser = currentEventUser || currentSettingsUser;
        const matched = cachedShifts.find(
          (s) => (s.member || 'Dad') === targetUser && s.name.trim().toLowerCase() === val
        );
        if (matched) {
          applyShiftToDate(matched, getSelectedDateFn());
        }
      };

      eventSummaryInput.addEventListener('change', handleTitleInput);
      eventSummaryInput.addEventListener('input', handleTitleInput);
    }
  }

  window.FamCalShifts = {
    initShifts,
    getShifts: () => cachedShifts,
    applyShiftToDate,
    setCurrentUser: (member) => {
      currentSettingsUser = member || 'Dad';
      currentEventUser = member || 'Dad';
      renderShiftsUI();
    },
    renderShiftsForUser: (member) => {
      currentEventUser = member || currentSettingsUser || 'Dad';
      renderShiftsUI(currentEventUser);
    }
  };
})();
