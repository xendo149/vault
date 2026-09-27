const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector("#nav-links");

toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
});

links.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });
});

const intro = document.querySelector("#intro");
const introPack = document.querySelector("#introPack");
let opening = false;

document.querySelectorAll("a.play").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    if (opening) return;
    opening = true;
    const dest = link.href;
    intro.hidden = false;
    intro.classList.add("show");
    introPack.classList.remove("tear");
    requestAnimationFrame(() => introPack.classList.add("rise"));
    setTimeout(() => introPack.classList.add("tear"), 700);
    setTimeout(() => intro.classList.add("flash"), 980);
    setTimeout(() => {
      window.location.href = dest;
    }, 1450);
  });
});
