import {
  verifyCleanHdBackground,
} from "./helpers/clean-hd-background-qa.mjs";

verifyCleanHdBackground(Object.freeze({
  id: "factory",
  sectionStart: 3,
  topY: 90000,
  bottomY: 120000,
  masterFile:
    "img/concepts/approvals/factory-clean-hd-background-master-v1.png",
  compositeFile:
    "img/concepts/approvals/factory-clean-hd-background-composite-v1.png",
}));

console.log("ART-010: Clean-HD-Fabrik-Parallaxset bestanden.");
