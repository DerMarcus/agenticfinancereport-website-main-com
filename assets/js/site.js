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

(function () {
  'use strict';

  // Evidence module (#findings): one module, a dark vertical tab list (left, auto-advancing every
  // 6s) and a light content panel (right) — replacing the old five stat cards plus a separate
  // tabbed chart block. No-op if the block isn't on the page. Bars carry a pre-computed --v inline
  // style as a no-JS fallback (see index.template.html); this recomputes the same percentage from
  // data-value so the underlying numbers only appear once in the markup. All four panels ship
  // visible in the markup (no JS, no story); this script hides everything but the first on init.
  var root = document.querySelector('.ev2');
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll('.ev2-tab'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('.ev2-panel'));
  if (!tabs.length || !panels.length) return;

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var AUTO_MS = 6000;

  function panelFor(tab) {
    var id = tab.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  }

  function computePercents(panel) {
    var bars = Array.prototype.slice.call(panel.querySelectorAll('.ev-bar[data-value]'));
    if (!bars.length) return;
    var max = 0;
    bars.forEach(function (b) {
      var v = parseFloat(b.getAttribute('data-value'));
      if (!isNaN(v) && v > max) max = v;
    });
    if (max <= 0) return;
    bars.forEach(function (b) {
      var v = parseFloat(b.getAttribute('data-value')) || 0;
      var pct = Math.round((v / max) * 1000) / 10;
      b.style.setProperty('--v', pct + '%');
    });
  }
  panels.forEach(computePercents);

  function animatePanel(panel) {
    var bars = Array.prototype.slice.call(panel.querySelectorAll('.ev-bar'));
    var values = Array.prototype.slice.call(panel.querySelectorAll('.ev-value'));
    if (!bars.length && !values.length) return;
    if (reduceMotion) {
      bars.forEach(function (b) {
        b.style.transitionDelay = '';
        b.style.height = '';   // stylesheet height: var(--v), no transition to run
      });
      values.forEach(function (v) {
        v.style.transitionDelay = '0s';
        v.style.opacity = '1';
        v.style.transform = 'none';
      });
      return;
    }
    // Targets in pixels, measured from the track after the panel is visible. A percentage height
    // applied while the panel was still display:none does not resolve, and re-setting the same
    // string is a no-op, so a freshly revealed panel would sit at 0. The inline height is removed
    // when the transition ends, handing the bar back to the stylesheet's height: var(--v).
    var targets = bars.map(function (b) {
      var track = b.parentElement;
      var pct = parseFloat(b.style.getPropertyValue('--v')) || 0;
      return Math.round((track.clientHeight * pct) / 100) + 'px';
    });
    bars.forEach(function (b) { b.style.transitionDelay = '0s'; b.style.height = '0px'; });
    values.forEach(function (v) {
      v.style.transitionDelay = '0s';
      v.style.opacity = '0';
      v.style.transform = 'translateY(8px)';
    });
    // force a reflow so height:0 is committed before transitioning back up
    void panel.offsetWidth;
    bars.forEach(function (b, i) {
      b.style.transitionDelay = (i * 80) + 'ms';
      b.style.height = targets[i];
      var done = function (e) {
        if (e && e.propertyName !== 'height') return;
        b.removeEventListener('transitionend', done);
        b.style.height = '';          // back to height: var(--v), so it stays right on resize
        b.style.transitionDelay = '';
      };
      b.addEventListener('transitionend', done);
      setTimeout(done, 1200 + i * 80); // in case the transition never fires (background tab)
    });
    values.forEach(function (v, i) {
      v.style.transitionDelay = (150 + i * 80) + 'ms';
      v.style.opacity = '1';
      v.style.transform = 'translateY(0)';
    });
  }

  // -------- tabs / panels --------
  var current = 0;

  function activateTab(tab, opts) {
    opts = opts || {};
    var idx = tabs.indexOf(tab);
    if (idx < 0) return;
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      if (!selected) stopFill(t);
    });
    current = idx;
    panels.forEach(function (p, i) { p.hidden = i !== idx; });
    if (opts.animate) animatePanel(panels[idx]);
    if (opts.focus) tab.focus();
  }

  // Markup ships all four panels visible (no [hidden]) so the module reads without JavaScript;
  // hide everything but the first as soon as the script runs.
  panels.forEach(function (p, i) { p.hidden = i !== 0; });

  tabs.forEach(function (tab, idx) {
    tab.addEventListener('click', function () {
      stopAuto();
      activateTab(tab, { animate: true });
    });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next !== null) {
        e.preventDefault();
        stopAuto();
        activateTab(tabs[next], { animate: true, focus: true });
      }
    });
  });

  // Bars/figs grow the first time the module is ~20% visible; every later switch (click, keyboard
  // or auto-advance) re-runs the growth animation via activateTab's opts.animate.
  var revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    animatePanel(panels[current]);
  }

  // -------- auto-advance: a CSS animation on the active tab's progress bar, advanced on its
  // animationend (not requestAnimationFrame, which does not fire in a hidden/background tab) --------
  var stopped = reduceMotion;   // reduced motion: no auto-advance at all, ever
  var flags = { hover: false, focus: false, hidden: !!document.hidden, offscreen: true };

  function fillOf(tab) { return tab.querySelector('.ev2-tab-fill'); }
  function barOf(tab) { return tab.querySelector('.ev2-tab-bar'); }

  function isPaused() {
    return flags.hover || flags.focus || flags.hidden || flags.offscreen;
  }

  function onFillEnd(e) {
    if (e && e.animationName !== 'ev2-fill') return;
    if (stopped) return;
    advance();
  }

  function startFill(tab) {
    if (stopped) return;
    var fill = fillOf(tab), bar = barOf(tab);
    if (!fill || !bar) return;
    bar.style.display = 'block';
    fill.style.animation = 'none';
    void fill.offsetWidth; // restart from 0 even if this tab's fill ran before
    fill.style.animation = 'ev2-fill ' + AUTO_MS + 'ms linear forwards';
    fill.style.animationPlayState = isPaused() ? 'paused' : 'running';
    fill.addEventListener('animationend', onFillEnd);
    tab.classList.add('is-running');
    tab.setAttribute('aria-label', 'Pause');
  }

  function stopFill(tab) {
    var fill = fillOf(tab), bar = barOf(tab);
    if (fill) { fill.removeEventListener('animationend', onFillEnd); fill.style.animation = 'none'; }
    if (bar) bar.style.display = 'none';
    tab.classList.remove('is-running');
    tab.removeAttribute('aria-label');
  }

  function applyPause() {
    if (stopped) return;
    var fill = fillOf(tabs[current]);
    if (fill) fill.style.animationPlayState = isPaused() ? 'paused' : 'running';
  }

  function advance() {
    var nextTab = tabs[(current + 1) % tabs.length];
    activateTab(nextTab, { animate: true });
    startFill(nextTab);
  }

  // The visitor took over (click or keyboard select): auto-advance stops for good.
  function stopAuto() {
    if (stopped) return;
    stopped = true;
    tabs.forEach(stopFill);
  }

  if (!stopped) {
    startFill(tabs[current]);

    root.addEventListener('pointerenter', function () { flags.hover = true; applyPause(); });
    root.addEventListener('pointerleave', function () { flags.hover = false; applyPause(); });
    root.addEventListener('focusin', function () { flags.focus = true; applyPause(); });
    root.addEventListener('focusout', function (e) {
      if (root.contains(e.relatedTarget)) return;
      flags.focus = false;
      applyPause();
    });
    document.addEventListener('visibilitychange', function () {
      flags.hidden = !!document.hidden;
      applyPause();
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          flags.offscreen = !entry.isIntersecting;
          if (entry.isIntersecting) reveal();
          applyPause();
        });
      }, { threshold: 0.2 });
      io.observe(root);
    } else {
      flags.offscreen = false;
      reveal();
      applyPause();
    }
  } else {
    reveal();
  }
})();
