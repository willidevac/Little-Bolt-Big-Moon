import {
  verifyCleanHdBackground,
} from "./helpers/clean-hd-background-qa.mjs";

verifyCleanHdBackground(Object.freeze({
  id: "scrapyard",
  sectionStart: 0,
  topY: 120000,
  bottomY: 150000,
  masterFile:
    "img/concepts/approvals/scrapyard-clean-hd-background-master-v1.png",
  compositeFile:
    "img/concepts/approvals/scrapyard-clean-hd-background-composite-v1.png",
}));

console.log("ART-009: Clean-HD-Schrottplatz-Parallaxset bestanden.");
