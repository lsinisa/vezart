// Click-to-enlarge lightbox.
// Clicking a thumbnail opens the full-size image on a dark overlay;
// clicking the overlay (or pressing Escape) closes it.

// Theme toggle.
// The site follows the OS colour scheme until the header button is
// clicked; after that the choice is remembered for the rest of the visit.
document.addEventListener("DOMContentLoaded", function () {
  var root = document.documentElement;
  var button = document.getElementById("theme-toggle");
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function stored() {
    try {
      var value = localStorage.getItem("theme");
      if (value === "dark" || value === "light") return value;
    } catch (e) {}
    return null;
  }

  function remember(choice) {
    try {
      localStorage.setItem("theme", choice);
    } catch (e) {}
  }

  function apply(choice) {
    theme = choice;
    root.dataset.theme = choice;
    if (!button) return;
    var next = choice === "dark" ? "light" : "dark";
    button.textContent = next === "dark" ? "Dark" : "Light";
    button.setAttribute("aria-label", "Switch to " + next + " mode");
  }

  var theme = stored() || (media.matches ? "dark" : "light");
  apply(theme);

  if (button) {
    button.addEventListener("click", function () {
      apply(theme === "dark" ? "light" : "dark");
      remember(theme);
    });
  }

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", function () {
      if (stored()) return;
      apply(media.matches ? "dark" : "light");
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // The veil lives in the document from the first click onward and is
  // faded in and out with the .open class (see style.css), so closing
  // has something to fade rather than yanking the plate off the page
  // mid-decode.
  var veil = null;
  var plate = null;

  // Thumbnails live in images/thumbs/, the full plates one level up.
  function fullSource(thumb) {
    var src = thumb.getAttribute("src") || thumb.src;
    return src.replace("thumbs/", "");
  }

  function isOpen() {
    return veil !== null && veil.classList.contains("open");
  }

  function closeLightbox() {
    if (!isOpen()) return;
    veil.classList.remove("open");
  }

  function reveal() {
    if (plate && plate.complete) veil.classList.add("open");
  }

  function openLightbox(thumb) {
    if (!veil) {
      veil = document.createElement("div");
      veil.className = "lightbox";
      plate = document.createElement("img");
      veil.appendChild(plate);
      veil.addEventListener("click", closeLightbox);
      document.body.appendChild(veil);

      // The listeners live on the plate once, so they fire again when a
      // later viewing points it at a different work.
      plate.addEventListener("load", reveal);
      plate.addEventListener("error", closeLightbox);
    }

    plate.alt = thumb.alt;
    plate.src = fullSource(thumb);

    // Carry the thumbnail's intrinsic ratio over to the plate so the
    // browser reserves the right box before the full image decodes.
    var tw = thumb.getAttribute("width");
    var th = thumb.getAttribute("height");
    plate.setAttribute("width", tw || "1600");
    plate.setAttribute("height", th || "1600");

    veil.classList.remove("open");

    if (plate.complete) {
      reveal();
    }
    // Otherwise the load listener above reveals it once the plate has
    // decoded, so the veil never shows a blank box.
  }

  document.querySelectorAll("main img").forEach(function (thumb) {
    thumb.setAttribute("tabindex", "0");

    thumb.addEventListener("click", function () {
      if (isOpen()) closeLightbox(); else openLightbox(thumb);
    });

    thumb.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        if (isOpen()) closeLightbox(); else openLightbox(thumb);
      }
    });
  });

  document.addEventListener("keydown", function (event) {
    if (isOpen() && event.key === "Escape") closeLightbox();
  });
});

// Gallery entrance.
// Each cell is stamped with its position so the CSS stagger can pace
// itself across the grid; the delay itself lives in the stylesheet.
document.addEventListener("DOMContentLoaded", function () {
  var cells = document.querySelectorAll("main.gallery figure");
  for (var n = 0; n < cells.length; n++) {
    cells[n].style.setProperty("--i", String(n));
  }
});

// Page traversal.
// Following a link to another page runs an exit beat first (see the
// page-out keyframes in style.css), so the arrival animation on the
// next page reads as one continuous move rather than a hard cut.
// Only a plain left click or an Enter on a page link is taken over:
// anything with a modifier key, a middle click, a mail: link, a link
// that opens elsewhere or a link to this same document keeps its
// default behaviour, and under reduced motion nothing is taken over at
// all — the jump is simply instant.
document.addEventListener("DOMContentLoaded", function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // The exit beat, read from the stylesheet so the wait and the
  // animation cannot drift apart.
  var beat = 300;
  var declared = getComputedStyle(document.documentElement)
    .getPropertyValue("--leave-beat").trim();
  if (declared) {
    var seconds = parseFloat(declared);
    if (seconds >= 0) beat = declared.indexOf("ms") !== -1 ? seconds : seconds * 1000;
  }
  beat = Math.min(Math.max(beat, 0), 1000);

  var leaving = false;

  function isPageLink(link) {
    if (link.getAttribute("target")) return false;
    /* A mail: or external link has a different protocol or host, so it
       is left to the browser; a link to this same document (a bare
       fragment) shares the pathname and is left to it too. */
    if (link.protocol !== location.protocol) return false;
    if (link.hostname !== location.hostname) return false;
    return link.pathname !== location.pathname;
  }

  function leave(href) {
    if (leaving) return;
    leaving = true;
    document.body.classList.add("leaving");
    window.setTimeout(function () {
      location.assign(href);
    }, beat);
  }

  document.querySelectorAll("a").forEach(function (link) {
    if (!isPageLink(link)) return;

    link.addEventListener("click", function (event) {
      if (leaving) return;
      /* A middle click or a modifier-key click means the visitor wants
         the link itself (a new tab, a copy of the address), not the
         tour, so it stays untouched. */
      if (event.button !== 0) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      leave(link.href);
    });

    link.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      leave(link.href);
    });
  });
});
