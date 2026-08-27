/* Rasheh logo integration — uses /rasheh-persian-arabic-logo.png */
(() => {
  const css = document.createElement('style');
  css.textContent = `
    .brand:before { display: none !important; }
    .brand { display: inline-flex !important; align-items: center !important; gap: 9px !important; color: #18314d !important; }
    .brand .rasheh-logo-image { width: 112px; height: 56px; object-fit: contain; object-position: center; display: inline-block; }
    .brand .rasheh-brand-text { display: inline-flex; flex-direction: column; align-items: flex-start; line-height: 1.1; }
    .brand .rasheh-brand-text strong { font-family: Arial, sans-serif; font-size: 25px; color: #b67e09; font-weight: 900; }
    .brand .rasheh-brand-text small { color: #526579 !important; font-size: 9px; letter-spacing: 2px; margin-top: 4px; }
    @media(max-width:760px){ .brand .rasheh-logo-image{ width: 78px; height: 42px; } .brand .rasheh-brand-text strong{font-size:20px} }
  `;
  document.head.appendChild(css);

  function replaceBrand(el) {
    if (el.dataset.logoReady === '1') return;
    const label = el.textContent.replace(/RASHEH TALENT/g, '').trim() || 'رَشّح';
    el.dataset.logoReady = '1';
    el.innerHTML = `
      <img class="rasheh-logo-image" src="/rasheh-persian-arabic-logo.png" alt="رَشّح">
      <span class="rasheh-brand-text">
        <strong>${label}</strong>
        <small>RASHEH TALENT</small>
      </span>
    `;
  }

  function install() {
    document.querySelectorAll('.brand').forEach(replaceBrand);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
