/* Physical AI — interactions: scroll reveal, use-case tabs, mobile nav, mailto form */
(function () {
  "use strict";

  /* ---- Scroll reveals ------------------------------------------------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Mobile nav toggle --------------------------------------------- */
  var toggle = document.getElementById("navtoggle");
  var links = document.getElementById("navlinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Use-case tabs -------------------------------------------------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".uc__tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".uc__panel"));
  function selectTab(tab) {
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
    panels.forEach(function (p) {
      var active = p.getAttribute("aria-labelledby") === tab.id;
      p.classList.toggle("is-active", active);
      if (active) { p.removeAttribute("hidden"); } else { p.setAttribute("hidden", ""); }
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab); });
    tab.addEventListener("keydown", function (e) {
      var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus(); selectTab(next);
    });
  });

  /* ---- Contact form: mailto fallback --------------------------------- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Native validation for required fields
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var endpoint = (form.getAttribute("data-endpoint") || "").trim();

      // If a real endpoint is ever configured, POST there instead of mailto.
      if (endpoint) {
        var data = new FormData(form);
        fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
          .then(function (r) {
            if (status) {
              status.textContent = r.ok
                ? "Danke — Ihre Anfrage ist eingegangen."
                : "Übermittlung fehlgeschlagen. Bitte per E-Mail an info@dj-bildung.de.";
              status.className = "form__status ok";
            }
            if (r.ok) form.reset();
          })
          .catch(function () {
            if (status) { status.textContent = "Netzwerkfehler. Bitte per E-Mail an info@dj-bildung.de."; status.className = "form__status"; }
          });
        return;
      }

      // Mailto fallback (default state): open user's mail client prefilled.
      var to = form.getAttribute("data-mailto") || "info@dj-bildung.de";
      var g = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ""; };
      var name = g("name"), org = g("organisation"), mail = g("email"),
          tel = g("telefon"), interest = g("interesse"), msg = g("vorhaben");

      var subject = "Physical AI — Anfrage" + (interest ? " · " + interest : "");
      var lines = [
        "Anfrage über die Physical-AI-Seite",
        "",
        "Name: " + name,
        org ? "Organisation: " + org : "",
        "E-Mail: " + mail,
        tel ? "Telefon: " + tel : "",
        "Interesse: " + interest,
        "",
        "Vorhaben:",
        msg || "—"
      ].filter(function (l) { return l !== ""; });

      var href = "mailto:" + to +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));

      if (status) {
        status.textContent = "Ihr E-Mail-Programm öffnet sich mit der vorausgefüllten Nachricht …";
        status.className = "form__status ok";
      }
      window.location.href = href;
    });
  }
})();
