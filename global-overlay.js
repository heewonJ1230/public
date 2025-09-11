// Global centered message overlay + normalizer + copy intercepts
;(function(){
  const ID = 'global-center-message';
  let el = null;
  let hideTimer = null;

  function ensureEl(){
    if (el) return el;
    el = document.createElement('div');
    el.id = ID;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = [
      'position:fixed',
      'top:50%','left:50%','transform:translate(-50%,-50%)',
      'max-width:80vw','text-align:center',
      'background:rgba(45,0,54,.9)','color:#FFE3F3',
      'padding:12px 18px','border-radius:12px',
      'border:2px solid #FD028F','box-shadow:0 10px 30px rgba(0,0,0,.25)',
      'font-size:16px','z-index:2147483647',
      'opacity:0','transition:opacity .2s ease','pointer-events:none'
    ].join(';');
    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  function normalizeMessage(text){
    try {
      const t = (text == null ? '' : String(text));
      if (/청소|모드|눈더미/.test(t)) return '🧹 청소 모드! 눈더미를 클릭하세요!';
      if (/모든.*눈.*치웠|치웠어요/.test(t)) return '✨ 모든 눈을 치웠어요!';
      if (/계좌번호|copied/i.test(t)) return '🔗 계좌번호 복사됨!';
      if (/복사.*실패|copy.*fail/i.test(t)) return '😢 복사 실패';
      return t;
    } catch { return text; }
  }

  window.showMessage = function(text, opts = {}){
    const { duration = 1600 } = opts;
    const box = ensureEl();
    box.textContent = normalizeMessage(text);
    box.style.opacity = '1';
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { box.style.opacity = '0'; }, duration);
  };

  async function write(text){
    try {
      if (window.writeToClipboard) return await window.writeToClipboard(text);
    } catch {}
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch { return false; }
  }

  // Intercept scratch-copy button clicks (centered message)
  document.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest?.('.scratch-copy');
    if (!copyBtn) return;
    const card = copyBtn.closest('.scratch-card');
    const account = (card?.dataset.number || '').trim();
    const text = copyBtn.getAttribute('data-copy') || account || '';
    if (!text) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const ok = await write(text);
    showMessage(ok ? '🔗 계좌번호 복사됨!' : '😢 복사 실패');
  }, { capture: true });

  // Intercept number-area clicks (both covered and revealed)
  document.addEventListener('click', async (e) => {
    const card = e.target.closest?.('.scratch-card');
    if (!card) return;
    // Ignore dedicated copy button (handled above)
    if (e.target.closest?.('.scratch-copy')) return;

    const stripEl = e.target.closest?.('.scratch-strip');
    const numEl = card.querySelector?.('.scratch-number');
    const numClicked = e.target.closest?.('.scratch-number');

    let insideNumber = false;
    if (numClicked) {
      insideNumber = true;
    } else if (stripEl && numEl) {
      const x = e.clientX, y = e.clientY;
      if (x != null && y != null) {
        const r = numEl.getBoundingClientRect();
        insideNumber = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      }
    }
    if (!insideNumber) return;

    const account = (card.dataset.number || '').trim();
    if (!account) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    const ok = await write(account);
    showMessage(ok ? '🔗 계좌번호 복사됨!' : '😢 복사 실패');
  }, { capture: true });
})();

