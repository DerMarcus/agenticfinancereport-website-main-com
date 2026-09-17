(function () {
  'use strict';

  // Audience mode. Human = the designed page. Agent = the whole report as Markdown.
  // Both toggles (header + footer) share one value; it also re-points the header CTA.
  var KEY = 'afr-mode';
  var buttons = document.querySelectorAll('.mode button[data-mode]');
  var cta = document.querySelector('[data-cta]');
  var humanView = document.getElementById('human-view');
  var agentView = document.getElementById('agent-view');
  var mdView = document.getElementById('md-view');
  var mdSource = document.getElementById('report-md');

  function fillMarkdown() {
    if (mdView && mdSource && !mdView.textContent) {
      mdView.textContent = mdSource.textContent.replace(/^\n/, '').replace(/<\\\/script/g, '</script');
    }
  }

  function apply(mode, opts) {
    opts = opts || {};
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode));
    });
    if (cta && cta.tagName !== 'A') {
      cta.textContent = cta.getAttribute('data-' + mode + '-label');
    } else if (cta) {
      cta.href = cta.getAttribute('data-' + mode + '-href');
      cta.textContent = cta.getAttribute('data-' + mode + '-label');
      if (mode === 'agent') cta.setAttribute('download', ''); else cta.removeAttribute('download');
    }
    if (humanView && agentView) {
      if (mode === 'agent') fillMarkdown();
      humanView.hidden = mode === 'agent';
      agentView.hidden = mode !== 'agent';
    }
    if (opts.scroll) window.scrollTo(0, 0);
  }

  function setMode(mode, opts) {
    apply(mode, opts);
    try { localStorage.setItem(KEY, mode); } catch (e) {}
  }

  var saved = 'human';
  try { saved = localStorage.getItem(KEY) === 'agent' ? 'agent' : 'human'; } catch (e) {}
  if (location.hash === '#agent') saved = 'agent';
  apply(saved);

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      setMode(b.getAttribute('data-mode'), { scroll: true });
    });
  });
  document.querySelectorAll('[data-mode-switch]').forEach(function (b) {
    b.addEventListener('click', function () {
      setMode(b.getAttribute('data-mode-switch'), { scroll: true });
    });
  });
  // "Get the MD file" shows the Markdown on the page; the file itself stays one click away (Download .md).
  document.querySelectorAll('[data-show-agent]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let "open in new tab" work
      e.preventDefault();
      setMode('agent', { scroll: true });
    });
  });

  // Copy buttons: label -> "Copied" for 2s, resets even if the clipboard is unavailable.
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      if (btn.getAttribute('data-copy') === '#md-view') fillMarkdown();
      var el = document.querySelector(btn.getAttribute('data-copy'));
      var text = el ? el.textContent.trim() : '';
      var done = function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = label; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        done();
      }
    });
  });

  // "Read the full disclaimer" opens the collapsed block, also when arriving via #disclaimer.
  function openDisclaimer() {
    if (humanView && humanView.hidden) setMode('human');
    var d = document.querySelector('#disclaimer details');
    if (d) d.open = true;
  }
  document.querySelectorAll('[data-open-disclaimer]').forEach(function (a) {
    a.addEventListener('click', openDisclaimer);
  });
  if (location.hash === '#disclaimer') openDisclaimer();
  window.addEventListener('hashchange', function () {
    if (location.hash === '#disclaimer') openDisclaimer();
    if (location.hash === '#agent') setMode('agent', { scroll: true });
  });
})();
