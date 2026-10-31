// Click-to-enlarge lightbox.
// Clicking a thumbnail opens the full-size image on a dark overlay;
// clicking the overlay (or pressing Escape) closes it. While the plate
// is open the arrows and horizontal swipes page to the neighbouring
// work, and the page behind the veil is locked.

// Theme toggle.
// The site follows the OS colour scheme until the header button is
// clicked; after that the choice is remembered for the rest of the visit.
//
// The script is deferred, so it runs the moment the document is parsed and
// the button is already in hand; DOMContentLoaded, on the other hand, is
// only delivered after every deferred script has run. Waiting for it would
// let the button keep the label its markup guesses with for the first
// frame, so the label is set the moment the script runs.
(function () {
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

  // The mobile browser bar paints itself from the theme-color tags, which
  // only know what the stylesheet prefers when the page loads. Both of
  // them (the plain one and the one gated on the OS scheme) are retold
  // with every applied theme, so the bar follows the visitor's choice
  // rather than the system. The colour is read back from the stylesheet
  // so it cannot drift from the page behind it.
  var paints = document.querySelectorAll('meta[name="theme-color"]');

  function paint() {
    if (!paints.length) return;
    var paper = getComputedStyle(root).getPropertyValue("--paper").trim();
    if (!paper) return;
    paints.forEach(function (tag) {
      tag.setAttribute("content", paper);
    });
  }

  function apply(choice) {
    theme = choice;
    root.dataset.theme = choice;
    paint();
    if (!button) return;
    var next = choice === "dark" ? "light" : "dark";
    button.textContent = next === "dark" ? "Dark" : "Light";
    button.setAttribute("aria-label", "Switch to " + next + " mode");
  }

  var theme = stored() || (media.matches ? "dark" : "light");

  // The stylesheet eases the two page colours so a mid-visit toggle reads
  // as a fade; on arrival that same easing would fade the page in from
  // the palette it does not want. The transition is held off across the
  // first frame — the theme is set inside that frame, so it snaps — and
  // handed back once the frame has painted, which leaves the toggle's
  // own fades working for the rest of the visit.
  if (document.body) {
    document.body.style.transition = "none";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.style.removeProperty("transition");
      });
    });
  }

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
})();

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

  // The caption line that rides under the plate, made with the veil.
  var capEl = null;

  // Where a touch swipe across the veil began, if one is in flight.
  var swipeStart = null;

  // Thumbnails live in images/thumbs/, the full plates one level up.
  function fullSource(img) {
    var src = img.getAttribute("src") || img.src;
    return src.replace("images/thumbs/", "images/");
  }

  // The neighbouring plates, kept as Image objects the moment a work
  // opens so the next paging move has a decoded picture to take rather
  // than fetching a half-megabyte plate under the veil.
  var preloaded = {};

  function preloadNeighbours(works, at) {
    for (var d = -1; d <= 1; d += 2) {
      var j = (at + d + works.length) % works.length;
      if (preloaded[j]) continue;
      var image = new Image();
      image.src = fullSource(works[j].querySelector("img"));
      preloaded[j] = image;
    }
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
    /* Whether the veil is already open when this call comes in. Paging
       arrives with the plate still showing the previous work, and there
       the veil must keep its open state so the move reads as one image
       changing rather than the whole veil fading out and back in. */
    var wasOpen = isOpen();

    if (!veil) {
      veil = document.createElement("div");
      veil.className = "lightbox";
      plate = document.createElement("img");
      veil.appendChild(plate);
      capEl = document.createElement("p");
      capEl.className = "plate-caption";
      capEl.setAttribute("id", "plate-caption");
      veil.appendChild(capEl);
      veil.addEventListener("click", closeLightbox);
      document.body.appendChild(veil);

      // Modal semantics — the veil is a dialog the moment a work
      // opens it, named from its first breath by the caption line
      // under the plate, and hidden from assistive tech while closed.
      veil.setAttribute("role", "dialog");
      veil.setAttribute("aria-modal", "true");
      veil.setAttribute("aria-hidden", "true");
      veil.setAttribute("aria-labelledby", "plate-caption");

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

    /* The plate takes the look of the thumbnail's own image: its alt
       carries over, and the full source sits one level above the
       thumb. The thumbnail is now a button wrapping a picture, so the
       attributes live on the image inside it. */
    var img = thumb.querySelector("img");
    plate.alt = img.alt;
    plate.src = fullSource(img);
    opener = thumb;

    // The gallery's buttons, in order: the index of the opening work
    // names its place under the plate and tells the pager which
    // neighbours to cache.
    var works = document.querySelectorAll("main .thumb");
    var at = 0;
    for (var i = 0; i < works.length; i++) {
      if (works[i] === thumb) { at = i; break; }
    }

    /* The veil speaks with its own words: the caption under the plate
       is the dialog's name and carries the work's place in the set, so
       a screen reader hears the same line the eye reads. */
    var cap = thumb.closest("figure").querySelector("figcaption");
    capEl.textContent = cap.textContent + " \u00b7 work " + (at + 1) + " of " + works.length;

    veil.removeAttribute("aria-hidden");
    veil.setAttribute("tabindex", "0");
    document.body.classList.add("lightbox-open");

    // Focusable is not focused: the ring style.css draws on the plate
    // hangs from :focus-visible, so opening moves the focus to the
    // dialog itself as soon as it is open. A visitor who opened it with
    // Enter, a tap or a swipe then has it in hand, and Escape closes it
    // from there rather than from the thumbnail underneath.
    veil.focus();

    // Carry the thumbnail's intrinsic ratio over to the plate so the
    // browser reserves the right box before the full image decodes.
    var tw = img.getAttribute("width");
    var th = img.getAttribute("height");
    plate.setAttribute("width", tw || "1600");
    plate.setAttribute("height", th || "1600");

    // The veil waits for the decode before it shows — but only when it
    // is being opened. While it is already open, paging leaves the state
    // alone so only the plate changes.
    if (!wasOpen) veil.classList.remove("open");

    // Cache the two plates this one can page to, so the next move
    // arrives already decoded.
    preloadNeighbours(works, at);

    if (plate.complete) {
      reveal();
    }
    // Otherwise the load listener above reveals it once the plate has
    // decoded, so the veil never shows a blank box.
  }

  /* Thumbnails are native <button>s in the markup: focus, Enter, and
     Space arrive without any help from here — a button whose only text
     is an image takes its name from that image's alt. */
  document.querySelectorAll("main .thumb").forEach(function (thumb) {
    thumb.addEventListener("click", function () {
      if (isOpen()) closeLightbox();
      else openLightbox(thumb);
    });
  });

  // Paging — the plate moves to the neighbouring work in grid order,
  // wrapping at the ends.
  function stepPlate(delta) {
    var works = document.querySelectorAll("main .thumb");
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
// Only a plain visit to a page link is taken over: a middle click, a
// modifier-key click (a new tab, a copy of the address), a mail: link, a
// link that opens elsewhere or a link to this same document keeps its
// default behaviour, and under reduced motion nothing is taken over at
// all — the jump is simply instant. Enter on a focused link arrives as a
// click of its own, so it needs no keyboard handler of its own; Ctrl/Cmd
// +Enter carries a modifier and stays with the browser.
document.addEventListener("DOMContentLoaded", function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Where the browser swaps the documents on its own (see the view
  // transition rules in style.css), there is no exit beat to run.
  if (document.documentElement.classList.contains("vt")) return;

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
         tour, so it stays untouched. Enter on a focused link arrives as
         a click of its own, but with button set to -1 rather than 0, so
         only a real middle or right click is let through. */
      if (event.button > 0) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      leave(link.href);
    });
  });
});

// Copy email.
// The Contact page gives the address as a mail: link, which is the right
// thing for a click but not for a visitor who only wants the text of it to
// paste somewhere else. The button beside the link hands that text to the
// clipboard. Where the clipboard cannot be reached — no API, a permission
// the browser refuses, or a page served over an origin the API will not
// answer (a plain file:// open, an insecure host) — the address is left
// selected on the page instead, which is what the visitor's own Ctrl+C
// needs; and where even that copy fails, the selection is still what the
// click was for. Every outcome says so in the open words, and the words
// live in a polite live region (see the aria-live attributes on the empty
// paragraph in contact.html), so assistive tech announces them without the
// visitor asking again. Enter on the focused button arrives as a click of
// its own, so no keyboard handler is needed here.
document.addEventListener("DOMContentLoaded", function () {
  var button = document.getElementById("copy-email");
  var address = document.querySelector('main a[href^="mailto:"]');
  var status = document.getElementById("copy-status");
  if (!button || !address || !status) return;

  var cleared = 0;

  // The confirmation is a beat of information, not a permanent note: it
  // is cleared once read, so the page does not keep claiming a copy that
  // belongs to an earlier click. The handle is kept so a second click
  // moves the deadline rather than leaving an earlier one to wipe the
  // newer words out.
  function say(words) {
    status.textContent = words;
    window.clearTimeout(cleared);
    cleared = window.setTimeout(function () {
      status.textContent = "";
    }, 4000);
  }

  // The selection is left in place rather than cleared: a visitor whose
  // clipboard refused still has the address picked out on the page, and
  // one whose copy worked sees the same thing the clipboard took.
  function selectAddress() {
    if (typeof window.getSelection !== "function") return false;
    var range = document.createRange();
    range.selectNodeContents(address);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  // The legacy route: a selection the browser was told to copy. It is
  // the only path that works where the clipboard API refuses, and it
  // answers false rather than throwing when it cannot copy.
  function copySelection() {
    try {
      return document.execCommand("copy") === true;
    } catch (e) {
      return false;
    }
  }

  function selectInstead() {
    if (!selectAddress()) {
      say("Copy it by hand");
      return;
    }
    if (copySelection()) {
      say("Copied");
      return;
    }
    say("Selected — copy it yourself");
  }

  button.addEventListener("click", function () {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      selectInstead();
      return;
    }
    try {
      navigator.clipboard.writeText(address.textContent.trim()).then(
        function () {
          say("Copied");
        },
        function () {
          selectInstead();
        }
      );
    } catch (e) {
      selectInstead();
    }
  });
});

// Footer year — the page stamps its own year from the clock rather than
// the one it was written in, so the copyright line never claims a year
// that has already passed.
document.addEventListener("DOMContentLoaded", function () {
  var line = document.querySelector("footer p");
  if (!line) return;
  var year = String(new Date().getFullYear());
  for (var i = 0; i < line.childNodes.length; i++) {
    var node = line.childNodes[i];
    if (node.nodeType === 3 && /\b20\d\d\b/.test(node.nodeValue)) {
      node.nodeValue = node.nodeValue.replace(/\b20\d\d\b/, year);
    }
  }
});

