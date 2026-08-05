/* =========================================================================
   Physical AI — panel navigation app + interactions
   ========================================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var stage   = $("#stage");
  if (!stage) return;                 // legal pages: no app shell
  var panels  = $$(".panel", stage);
  var ids     = panels.map(function (p) { return p.id; });
  var total   = panels.length;
  var cur     = 0;
  var TOTAL_STR = String(total);
  var indexOpen = false;
  var suppressHash = false;

  panels.forEach(function (p) { p.tabIndex = -1; });

  /* ---- Build rail + index list ---------------------------------------- */
  var rail = $("#rail");
  var indexList = $("#indexList");
  panels.forEach(function (p, i) {
    var title = p.getAttribute("data-title") || p.id;
    var num = ("0" + (i + 1)).slice(-2);

    var dot = document.createElement("button");
    dot.className = "rail__dot";
    dot.type = "button";
    dot.setAttribute("aria-label", "Bereich " + (i + 1) + ": " + title);
    dot.innerHTML = '<span class="mk" aria-hidden="true"></span><span class="tip"><b>' + num + "</b>" + title + "</span>";
    dot.addEventListener("click", function () { goTo(i); });
    rail.appendChild(dot);

    var li = document.createElement("li");
    var link = document.createElement("button");
    link.className = "indexlink";
    link.type = "button";
    link.innerHTML = '<span class="n">' + num + '</span><span class="t">' + title + "</span>";
    link.addEventListener("click", function () { closeIndex(); goTo(i); });
    li.appendChild(link);
    indexList.appendChild(li);
  });
  var dots = $$(".rail__dot", rail);
  var indexLinks = $$(".indexlink", indexList);

  var counter  = $("#counter");
  var progress = $("#progressFill");
  var prevBtn  = $("#prevBtn");
  var nextBtn  = $("#nextBtn");

  /* ---- Core navigation ------------------------------------------------ */
  function activeScrollable() {
    var p = panels[cur];
    return p.scrollHeight > p.clientHeight + 4;
  }

  function goTo(i, opts) {
    i = Math.max(0, Math.min(total - 1, i));
    var changed = i !== cur;
    cur = i;

    panels.forEach(function (p, idx) {
      p.classList.toggle("is-active", idx === i);
      p.classList.toggle("is-prev", idx < i);
      if (idx === i) p.scrollTop = 0;
    });
    dots.forEach(function (d, idx) { d.setAttribute("aria-current", idx === i ? "true" : "false"); });
    indexLinks.forEach(function (d, idx) { d.setAttribute("aria-current", idx === i ? "true" : "false"); });

    var num = ("0" + (i + 1)).slice(-2);
    counter.innerHTML = "<b>" + num + "</b> / " + TOTAL_STR;
    if (progress) progress.style.width = ((i) / (total - 1) * 100) + "%";
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === total - 1;

    if (!suppressHash) {
      try { history.replaceState(null, "", "#" + ids[i]); } catch (e) { location.hash = ids[i]; }
    }

    playReveal(panels[i]);
    if (!(opts && opts.noFocus)) { try { panels[i].focus({ preventScroll: true }); } catch (e) { panels[i].focus(); } }

    if (ids[i] === "usecases") runDialog();
  }
  function next() { goTo(cur + 1); }
  function prev() { goTo(cur - 1); }

  function playReveal(panel) {
    var els = $$(".reveal", panel);
    if (reduce) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    els.forEach(function (el) { el.classList.remove("in"); });
    void panel.offsetWidth;
    requestAnimationFrame(function () { els.forEach(function (el) { el.classList.add("in"); }); });
  }

  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);

  /* ---- Index overlay -------------------------------------------------- */
  var indexView = $("#indexView");
  var indexBtn = $("#indexBtn");
  function openIndex()  { indexOpen = true;  indexView.classList.add("open");  indexBtn.setAttribute("aria-expanded", "true");  $("#indexClose").focus(); }
  function closeIndex() { indexOpen = false; indexView.classList.remove("open"); indexBtn.setAttribute("aria-expanded", "false"); indexBtn.focus(); }
  indexBtn.addEventListener("click", function () { indexOpen ? closeIndex() : openIndex(); });
  $("#indexClose").addEventListener("click", closeIndex);
  indexView.addEventListener("click", function (e) { if (e.target === indexView) closeIndex(); });

  /* ---- In-page anchor links ------------------------------------------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1);
      var idx = ids.indexOf(id);
      if (idx > -1) { e.preventDefault(); goTo(idx); }
    });
  });

  /* ---- Hash routing --------------------------------------------------- */
  window.addEventListener("hashchange", function () {
    var idx = ids.indexOf(location.hash.slice(1));
    if (idx > -1 && idx !== cur) { suppressHash = true; goTo(idx); suppressHash = false; }
  });

  /* ---- Keyboard ------------------------------------------------------- */
  document.addEventListener("keydown", function (e) {
    if (indexOpen) { if (e.key === "Escape") closeIndex(); return; }
    var t = e.target;
    if (t.matches("input, textarea, select") || t.isContentEditable) return;
    var inWidget = t.closest(".techsel, .autostep, .uc__tabs");

    switch (e.key) {
      case "PageDown": e.preventDefault(); next(); break;
      case "PageUp":   e.preventDefault(); prev(); break;
      case "Home":     e.preventDefault(); goTo(0); break;
      case "End":      e.preventDefault(); goTo(total - 1); break;
      case "ArrowRight": if (!inWidget) { e.preventDefault(); next(); } break;
      case "ArrowLeft":  if (!inWidget) { e.preventDefault(); prev(); } break;
      case "ArrowDown":  if (!inWidget && !activeScrollable()) { e.preventDefault(); next(); } break;
      case "ArrowUp":    if (!inWidget && !activeScrollable()) { e.preventDefault(); prev(); } break;
    }
  });

  /* ---- Touch swipe (horizontal) --------------------------------------- */
  var tsx = 0, tsy = 0;
  stage.addEventListener("touchstart", function (e) { var t = e.changedTouches[0]; tsx = t.clientX; tsy = t.clientY; }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - tsx, dy = t.clientY - tsy;
    if (Math.abs(dx) > 62 && Math.abs(dx) > Math.abs(dy) * 1.4) { dx < 0 ? next() : prev(); }
  }, { passive: true });

  /* ---- Scanner cursor (ambient signature) ----------------------------- */
  var scanner = $("#scanner");
  if (scanner && finePointer && !reduce) {
    var sx = 0, sy = 0, tx = 0, ty = 0, shown = false;
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; scanner.classList.add("on"); }
    });
    document.addEventListener("mouseleave", function () { shown = false; scanner.classList.remove("on"); });
    (function loop() {
      sx += (tx - sx) * 0.18; sy += (ty - sy) * 0.18;
      scanner.style.transform = "translate(" + sx + "px," + sy + "px)";
      requestAnimationFrame(loop);
    })();
  }

  /* ---- Hero 3D tilt --------------------------------------------------- */
  var tiltWrap = $("#tiltWrap"), tilt = $("#tilt");
  if (tiltWrap && tilt && finePointer && !reduce) {
    tiltWrap.addEventListener("mousemove", function (e) {
      var r = tiltWrap.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = "rotateX(" + (-py * 7) + "deg) rotateY(" + (px * 8) + "deg) translateZ(0)";
    });
    tiltWrap.addEventListener("mouseleave", function () { tilt.style.transform = ""; });
  }

  /* ---- Use-case tabs -------------------------------------------------- */
  var tabs = $$(".uc__tab");
  var ucPanels = $$(".uc__panel");
  function selectTab(tab) {
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
    ucPanels.forEach(function (p) {
      var active = p.getAttribute("aria-labelledby") === tab.id;
      p.classList.toggle("is-active", active);
      if (active) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
    });
    if (tab.id === "tab01") runDialog();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab); });
    tab.addEventListener("keydown", function (e) {
      var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      e.preventDefault(); e.stopPropagation();
      var nx = tabs[(i + dir + tabs.length) % tabs.length];
      nx.focus(); selectTab(nx);
    });
  });

  /* ---- Typewriter dialogue -------------------------------------------- */
  var dialog = $("#dialog01");
  var twToken = 0;
  function buildTurn(turn, p) {
    var who = turn.dataset.who, dir = turn.dataset.stagedir;
    turn.innerHTML = '<span class="turn__who">' + who + "</span><p></p>" +
      (dir ? '<span class="stage-dir" style="opacity:' + (p ? "1" : "0") + '">' + dir + "</span>" : "");
    return turn.querySelector("p");
  }
  function fillInstant() {
    if (!dialog) return;
    $$(".turn", dialog).forEach(function (turn) {
      var p = buildTurn(turn, true);
      p.textContent = turn.dataset.text;
      turn.classList.add("tw-show");
    });
  }
  function runDialog() {
    if (!dialog) return;
    var turns = $$(".turn", dialog);
    twToken++;
    var token = twToken;
    if (reduce) { fillInstant(); return; }

    turns.forEach(function (turn) { turn.classList.remove("tw-show"); turn.innerHTML = ""; });

    var ti = 0;
    function typeTurn() {
      if (token !== twToken) return;
      if (ti >= turns.length) return;
      var turn = turns[ti];
      var p = buildTurn(turn, false);
      p.classList.add("tw-caret");
      turn.classList.add("tw-show");
      var text = turn.dataset.text, ci = 0;
      (function type() {
        if (token !== twToken) return;
        if (ci <= text.length) {
          p.textContent = text.slice(0, ci);
          ci++;
          setTimeout(type, 16);
        } else {
          p.classList.remove("tw-caret");
          var dir = turn.querySelector(".stage-dir");
          if (dir) dir.style.opacity = "1";
          ti++;
          setTimeout(typeTurn, 260);
        }
      })();
    }
    typeTurn();
  }
  if (dialog) {
    dialog.addEventListener("click", function () { twToken++; fillInstant(); });
  }

  /* ---- Tech selector -------------------------------------------------- */
  var techOpts = $$(".techsel__opt");
  var techViews = $$(".techsel__view");
  function selectTech(opt) {
    techOpts.forEach(function (o) { o.setAttribute("aria-selected", String(o === opt)); });
    var id = opt.getAttribute("data-tech");
    techViews.forEach(function (v) { v.classList.toggle("is-active", v.id === id); });
  }
  techOpts.forEach(function (opt, i) {
    opt.addEventListener("click", function () { selectTech(opt); });
    opt.addEventListener("keydown", function (e) {
      var dir = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1 :
                (e.key === "ArrowUp" || e.key === "ArrowLeft") ? -1 : 0;
      if (!dir) return;
      e.preventDefault(); e.stopPropagation();
      var nx = techOpts[(i + dir + techOpts.length) % techOpts.length];
      nx.focus(); selectTech(nx);
    });
  });

  /* ---- Governance autonomy stepper ------------------------------------ */
  var nodes = $$(".autonode");
  var autoFill = $("#autoFill"), autoBig = $("#autoBig"), autoName = $("#autoName"),
      autoDesc = $("#autoDesc"), autoEx = $("#autoEx"), autoMid = $("#autoMid");
  function selectLvl(node) {
    nodes.forEach(function (n) { n.setAttribute("aria-selected", String(n === node)); });
    var lvl = +node.dataset.lvl;
    autoFill.style.width = ((lvl - 1) / (nodes.length - 1) * 88) + "%";
    autoBig.textContent = lvl;
    autoName.textContent = node.dataset.name;
    autoDesc.textContent = node.dataset.desc;
    autoEx.textContent = node.dataset.ex;
    if (autoMid && !reduce) { autoMid.style.animation = "none"; void autoMid.offsetWidth; autoMid.style.animation = ""; }
  }
  nodes.forEach(function (node, i) {
    node.addEventListener("click", function () { selectLvl(node); });
    node.addEventListener("keydown", function (e) {
      var dir = (e.key === "ArrowRight" || e.key === "ArrowUp") ? 1 :
                (e.key === "ArrowLeft" || e.key === "ArrowDown") ? -1 : 0;
      if (!dir) return;
      e.preventDefault(); e.stopPropagation();
      var nx = nodes[Math.max(0, Math.min(nodes.length - 1, i + dir))];
      nx.focus(); selectLvl(nx);
    });
  });

  /* ---- Contact form: mailto fallback ---------------------------------- */
  var form = $("#contactForm");
  var status = $("#formStatus");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var endpoint = (form.getAttribute("data-endpoint") || "").trim();

      if (endpoint) {
        var data = new FormData(form);
        fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
          .then(function (r) {
            if (status) {
              status.textContent = r.ok ? "Danke — Ihre Anfrage ist eingegangen." : "Übermittlung fehlgeschlagen. Bitte per E-Mail an info@dj-bildung.de.";
              status.className = "form__status ok";
            }
            if (r.ok) form.reset();
          })
          .catch(function () { if (status) { status.textContent = "Netzwerkfehler. Bitte per E-Mail an info@dj-bildung.de."; status.className = "form__status"; } });
        return;
      }

      var to = form.getAttribute("data-mailto") || "info@dj-bildung.de";
      var g = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ""; };
      var interest = g("interesse");
      var subject = "Physical AI — Anfrage" + (interest ? " · " + interest : "");
      var lines = [
        "Anfrage über die Physical-AI-Seite", "",
        "Name: " + g("name"),
        g("organisation") ? "Organisation: " + g("organisation") : "",
        "E-Mail: " + g("email"),
        g("telefon") ? "Telefon: " + g("telefon") : "",
        "Interesse: " + interest, "",
        "Vorhaben:", g("vorhaben") || "—"
      ].filter(function (l) { return l !== ""; });

      var href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
      if (status) { status.textContent = "Ihr E-Mail-Programm öffnet sich mit der vorausgefüllten Nachricht …"; status.className = "form__status ok"; }
      window.location.href = href;
    });
  }

  /* ---- Boot ----------------------------------------------------------- */
  var startIdx = ids.indexOf(location.hash.slice(1));
  suppressHash = startIdx > -1;
  goTo(startIdx > -1 ? startIdx : 0, { noFocus: true });
  suppressHash = false;
})();
