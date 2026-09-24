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

  // Evidence charts (#findings, after .cards): tabbed bar chart, plain divs with a CSS height
  // percentage. No-op if the block isn't on the page. Bars carry a pre-computed --v inline style as
  // a no-JS fallback (see index.template.html); this recomputes the same percentage from
  // data-value so the underlying numbers only appear once in the markup.
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function setupChart(chart) {
    var tabs = Array.prototype.slice.call(chart.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(chart.querySelectorAll('[role="tabpanel"]'));
    if (!tabs.length || !panels.length) return;

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

    function activateTab(tab, opts) {
      opts = opts || {};
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(function (p) { p.hidden = true; });
      var panel = panelFor(tab);
      if (panel) {
        panel.hidden = false;
        if (opts.animate) animatePanel(panel);
      }
      if (opts.focus) tab.focus();
    }

    tabs.forEach(function (tab, idx) {
      tab.addEventListener('click', function () { activateTab(tab, { animate: true }); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          activateTab(tabs[next], { animate: true, focus: true });
        }
      });
    });

    // Bars mount at height 0 and grow the first time the block is ~35% visible; tabs do not
    // rotate on their own.
    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      var active = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
      var panel = panelFor(active);
      if (panel) animatePanel(panel);
    }

    if (!reduceMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { reveal(); io.disconnect(); }
        });
      }, { threshold: 0.35 });
      io.observe(chart);
    } else {
      reveal();
    }
  }

  document.querySelectorAll('.ev-chart').forEach(setupChart);
})();
