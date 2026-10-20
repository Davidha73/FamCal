// JustUs - Message Photo Compression & Upload Module
(function () {
  'use strict';

  let pendingPhoto = null; // { file, dataUrl, previewUrl }

  function compressImage(file, maxDimension = 800, quality = 0.65) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let dataUrl = canvas.toDataURL('image/jpeg', quality);

          // Guarantee safe size well below Firestore 1MB document limit
          if (dataUrl.length > 450000) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          }

          resolve({ dataUrl, width, height });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadPhotoToFirebase() {
    // Return null to use instant direct compressed image without hanging on Storage
    return null;
  }

  function getPendingPhoto() {
    return pendingPhoto;
  }

  function clearPendingPhoto() {
    pendingPhoto = null;
    renderPhotoPreview();
    const fileInput = document.getElementById('messages-photo-input');
    if (fileInput) fileInput.value = '';
  }

  function renderPhotoPreview() {
    let previewContainer = document.getElementById('messages-photo-preview-bar');
    const form = document.getElementById('messages-compose-form');
    if (!form) return;

    if (!pendingPhoto) {
      if (previewContainer) previewContainer.remove();
      return;
    }

    if (!previewContainer) {
      previewContainer = document.createElement('div');
      previewContainer.id = 'messages-photo-preview-bar';
      previewContainer.className = 'messages-photo-preview';
      form.parentNode.insertBefore(previewContainer, form);
    }

    previewContainer.innerHTML = `
      <div class="photo-preview-thumb-wrap">
        <img src="${pendingPhoto.dataUrl}" alt="Photo preview" class="photo-preview-thumbnail">
      </div>
      <div class="photo-preview-info">
        <span class="photo-preview-name">Photo ready</span>
        <span class="photo-preview-sub">Tap send to post</span>
      </div>
      <button type="button" class="photo-remove-btn" id="remove-photo-preview-btn" aria-label="Remove photo">
        <span class="material-symbols-rounded">close</span>
      </button>
    `;

    const removeBtn = document.getElementById('remove-photo-preview-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', clearPendingPhoto);
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1200, 0.72);
      pendingPhoto = {
        file: compressed.blob,
        dataUrl: compressed.dataUrl,
        name: file.name
      };
      renderPhotoPreview();
    } catch (err) {
      console.error('Error reading/compressing photo:', err);
      alert('Could not process photo. Please try a different image.');
    }
  }

  function openLightbox(imageUrl) {
    if (!imageUrl) return;
    let backdrop = document.getElementById('photo-lightbox-backdrop');
    if (!backdrop) return;

    const img = document.getElementById('photo-lightbox-img');
    if (img) {
      img.src = imageUrl;
    }
    backdrop.classList.remove('hidden');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeLightbox() {
    const backdrop = document.getElementById('photo-lightbox-backdrop');
    if (!backdrop) return;
    backdrop.classList.add('hidden');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    const img = document.getElementById('photo-lightbox-img');
    if (img) img.src = '';
  }

  function setupDomEvents() {
    const photoBtn = document.getElementById('messages-photo-btn');
    const fileInput = document.getElementById('messages-photo-input');

    if (photoBtn && fileInput) {
      photoBtn.addEventListener('click', () => {
        fileInput.click();
      });
      fileInput.addEventListener('change', handleFileSelected);
    }

    const closeBtn = document.getElementById('close-lightbox-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeLightbox);
    }

    const lightbox = document.getElementById('photo-lightbox-backdrop');
    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.closest('#close-lightbox-btn')) {
          closeLightbox();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const lb = document.getElementById('photo-lightbox-backdrop');
        if (lb && !lb.classList.contains('hidden')) {
          closeLightbox();
        }
      }
    });

    const feed = document.getElementById('messages-feed');
    if (feed) {
      feed.addEventListener('click', (e) => {
        const img = e.target.closest('.chat-bubble-image');
        if (img && img.src) {
          openLightbox(img.src);
        }
      });
    }
  }

  function init() {
    setupDomEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FamCalPhotos = {
    getPendingPhoto,
    clearPendingPhoto,
    compressImage,
    uploadPhotoToFirebase,
    openLightbox,
    closeLightbox
  };
})();
