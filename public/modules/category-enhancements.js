(function () {
  // Lightweight canvas confetti engine
  let canvas = null;
  let ctx = null;
  let particles = [];
  let animId = null;

  function initCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'category-fx-canvas';
    canvas.className = 'category-fx-canvas';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  function triggerConfetti() {
    initCanvas();
    const colors = ['#ff9500', '#ff2d55', '#34c759', '#007aff', '#af52de', '#ffcc00'];
    const count = 70;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      particles.push({
        type: 'confetti',
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        life: 1,
        decay: Math.random() * 0.015 + 0.012
      });
    }

    if (!animId) animate();
  }

  function triggerFloatingHearts(rect) {
    initCanvas();
    const count = 12;
    const startX = rect ? (rect.left + rect.width / 2) : (window.innerWidth / 2);
    const startY = rect ? rect.top : (window.innerHeight * 0.6);

    for (let i = 0; i < count; i++) {
      particles.push({
        type: 'heart',
        x: startX + (Math.random() - 0.5) * 30,
        y: startY,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -(Math.random() * 3 + 2.5),
        size: Math.random() * 10 + 14,
        life: 1,
        decay: Math.random() * 0.018 + 0.012
      });
    }

    if (!animId) animate();
  }

  function animate() {
    if (particles.length === 0) {
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      animId = null;
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.type === 'confetti') {
        p.vy += 0.22; // gravity
        p.rotation += p.rotationSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      } else if (p.type === 'heart') {
        p.x += Math.sin(p.y * 0.05) * 0.8;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('❤️', p.x, p.y);
        ctx.restore();
      }

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    animId = requestAnimationFrame(animate);
  }

  // Acknowledgment for Urgent Notes
  async function toggleAcknowledge(noteId, db, currentUser) {
    if (!db || !noteId || !currentUser) return;
    const noteRef = db.collection('noticeboard_notes').doc(noteId);
    const snap = await noteRef.get();
    if (!snap.exists) return;
    const data = snap.data();
    const ack = Array.isArray(data.acknowledgedBy) ? data.acknowledgedBy : [];

    if (ack.includes(currentUser)) {
      await noteRef.update({
        acknowledgedBy: firebase.firestore.FieldValue.arrayRemove(currentUser)
      });
    } else {
      await noteRef.update({
        acknowledgedBy: firebase.firestore.FieldValue.arrayUnion(currentUser)
      });
    }
  }

  // Auto-expiry check
  function isNoteExpired(note) {
    if (!note.expiryHours) return false;
    const hours = parseInt(note.expiryHours, 10);
    if (!hours || isNaN(hours)) return false;

    let createdMs = 0;
    if (note.createdAt && note.createdAt.toDate) {
      createdMs = note.createdAt.toDate().getTime();
    } else if (note.createdAt) {
      createdMs = new Date(note.createdAt).getTime();
    }
    if (!createdMs) return false;

    const diffHours = (Date.now() - createdMs) / (1000 * 60 * 60);
    return diffHours >= hours;
  }

  window.FamCalCategoryEnhancements = {
    triggerConfetti,
    triggerFloatingHearts,
    toggleAcknowledge,
    isNoteExpired
  };
})();
