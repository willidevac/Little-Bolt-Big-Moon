const FRAGMENT_SELECTOR = "[data-html-fragment]";
const ROOT_SELECTOR = "[data-fragment-root]";

/** Lädt die statischen Seitenteile, bevor die Spielsteuerung sie verbindet. */
export async function loadHtmlFragments(root = document) {
  const placeholders = [...root.querySelectorAll(FRAGMENT_SELECTOR)];
  await Promise.all(placeholders.map(loadFragment));
  root.querySelector(ROOT_SELECTOR)?.removeAttribute("aria-busy");
}

async function loadFragment(placeholder) {
  const source = placeholder.dataset.htmlFragment;
  if (!source) throw new Error("Einem HTML-Fragment fehlt der Pfad.");
  const response = await fetch(source);
  if (!response.ok) throw new Error(`HTML-Fragment fehlt: ${source}`);
  placeholder.replaceWith(createFragment(await response.text()));
}

function createFragment(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content;
}
