// Click-to-enlarge lightbox.
// Clicking a thumbnail opens the full-size image on a dark overlay;
// clicking the overlay (or pressing Escape) closes it. While the plate
// is open the arrows and horizontal swipes page to the neighbouring
// work, and the page behind the veil is locked.

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

  // The thumbnail the plate is showing: closing hands focus back to
  // it, and paging keeps it pointed at the work on the veil.
  var opener = null;

  // Where a touch swipe across the veil began, if one is in flight.
  var swipeStart = null;

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
    veil.setAttribute("aria-hidden", "true");
    veil.removeAttribute("tabindex");
    document.body.classList.remove("lightbox-open");
    // Focus returns to the thumbnail that opened the plate, so a
    // visitor closing with Escape is left where they started rather
    // than at the top of the page.
    if (opener) opener.focus();
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

      // Modal semantics — the veil is a dialog the moment a work
      // opens it, named by the work's caption, and hidden from
      // assistive tech while closed.
      veil.setAttribute("role", "dialog");
      veil.setAttribute("aria-modal", "true");
      veil.setAttribute("aria-hidden", "true");

      // The listeners live on the plate once, so they fire again when a
      // later viewing points it at a different work.
      plate.addEventListener("load", reveal);
      plate.addEventListener("error", closeLightbox);

      // Touch paging — a horizontal swipe across the veil moves the
      // plate to the neighbouring work. Only touch pointers count;
      // clicks stay with the veil's own close handler.
      veil.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "touch") swipeStart = event.clientX;
      });
      veil.addEventListener("pointercancel", function () {
        swipeStart = null;
      });
      veil.addEventListener("pointerup", function (event) {
        if (swipeStart === null) return;
        var dx = event.clientX - swipeStart;
        swipeStart = null;
        if (Math.abs(dx) < 40) return;
        stepPlate(dx > 0 ? 1 : -1);
      });
    }

    plate.alt = thumb.alt;
    plate.src = fullSource(thumb);
    opener = thumb;

    // The dialog is named by the work's caption, and while open it is
    // focusable and visible to assistive tech.
    veil.setAttribute("aria-label",
      thumb.closest("figure").querySelector("figcaption").textContent);
    veil.removeAttribute("aria-hidden");
    veil.setAttribute("tabindex", "0");
    document.body.classList.add("lightbox-open");

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

  // Paging — the plate moves to the neighbouring work in grid order,
  // wrapping at the ends.
  function stepPlate(delta) {
    var works = document.querySelectorAll("main img");
    var at = 0;
    for (var i = 0; i < works.length; i++) {
      if (works[i] === opener) at = i;
    }
    openLightbox(works[(at + delta + works.length) % works.length]);
  }

  document.addEventListener("keydown", function (event) {
    if (!isOpen()) return;

    if (event.key === "Escape") {
      closeLightbox();
      return;
    }

    // Space would scroll the page under the veil; while the plate is
    // open the gallery must not move.
    if (event.key === " ") {
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      stepPlate(event.key === "ArrowLeft" ? -1 : 1);
    }
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
