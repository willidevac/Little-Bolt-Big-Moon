import {
  verifyCleanHdBackground,
} from "./helpers/clean-hd-background-qa.mjs";

verifyCleanHdBackground(Object.freeze({
  id: "moon",
  sectionStart: 12,
  topY: 0,
  bottomY: 30000,
  masterFile:
    "img/concepts/approvals/moon-clean-hd-background-master-v1.png",
  compositeFile:
    "img/concepts/approvals/moon-clean-hd-background-composite-v2.png",
}));

console.log("ART-013: Clean-HD-Mond-Parallaxset bestanden.");
