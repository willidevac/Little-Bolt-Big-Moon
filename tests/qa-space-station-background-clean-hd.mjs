import {
  verifyCleanHdBackground,
} from "./helpers/clean-hd-background-qa.mjs";

verifyCleanHdBackground(Object.freeze({
  id: "space-station",
  sectionStart: 9,
  topY: 30000,
  bottomY: 60000,
  masterFile:
    "img/concepts/approvals/space-station-clean-hd-background-master-v1.png",
  compositeFile:
    "img/concepts/approvals/space-station-clean-hd-background-composite-v1.png",
}));

console.log("ART-012: Clean-HD-Raumstations-Parallaxset bestanden.");
