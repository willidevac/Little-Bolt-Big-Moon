import {
  verifyCleanHdBackground,
} from "./helpers/clean-hd-background-qa.mjs";

verifyCleanHdBackground(Object.freeze({
  id: "launch-tower",
  sectionStart: 6,
  topY: 60000,
  bottomY: 90000,
  masterFile:
    "img/concepts/approvals/launch-tower-clean-hd-background-master-v1.png",
  compositeFile:
    "img/concepts/approvals/launch-tower-clean-hd-background-composite-v1.png",
}));

console.log("ART-011: Clean-HD-Startturm-Parallaxset bestanden.");
