const FRAGMENT_SELECTOR = "[data-html-fragment]";
const ROOT_SELECTOR = "[data-fragment-root]";

/**
 * Loads the static page fragments before the game controllers bind them.
 * @param {Document|HTMLElement} [root=document] Root containing fragment placeholders.
 */
export async function loadHtmlFragments(root = document) {
  const placeholders = [...root.querySelectorAll(FRAGMENT_SELECTOR)];
  await Promise.all(placeholders.map(loadFragment));
  root.querySelector(ROOT_SELECTOR)?.removeAttribute("aria-busy");
}

/**
 * Loads and replaces one fragment placeholder.
 * @param {HTMLElement} placeholder Element declaring the fragment source.
 */
async function loadFragment(placeholder) {
  const source = placeholder.dataset.htmlFragment;
  if (!source) throw new Error("Einem HTML-Fragment fehlt der Pfad.");
  const response = await fetch(source);
  if (!response.ok) throw new Error(`HTML-Fragment fehlt: ${source}`);
  placeholder.replaceWith(createFragment(await response.text()));
}

/**
 * Parses trusted static markup into a document fragment.
 * @param {string} markup HTML markup returned by the fragment request.
 */
function createFragment(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content;
}
