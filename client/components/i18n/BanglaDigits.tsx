"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";
import { localizeDigits } from "@/lib/i18n/digits";

/*
 * In Bangla, every digit on screen reads in Bangla: numbers the app formats already do, and this
 * does the same for text shown as saved (admission and roll numbers, receipt numbers, phones,
 * academic years, class names...). It only changes what is displayed: the data, the forms and
 * the links keep ASCII digits.
 *
 * It rewrites the page's text nodes after React has drawn them, and again whenever they change.
 * Left alone: inputs and text areas, code, and anything inside [data-ascii-digits] (for text
 * that must be copied exactly); emails, web addresses and letter-and-digit codes keep their
 * digits word by word (see localizeDigits).
 */

const SKIP = "input, textarea, script, style, code, pre, [contenteditable], [data-ascii-digits]";

const convertNode = (node: Text) => {
  const value = node.nodeValue;
  if (!value || !/[0-9]/.test(value)) return;
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP)) return;
  const next = localizeDigits(value);
  // no change means nothing to do (and no endless loop: the new text has no digits to convert)
  if (next !== value) node.nodeValue = next;
};

const convertTree = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) return convertNode(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE || (root as Element).closest(SKIP)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) convertNode(node as Text);
};

export function BanglaDigits() {
  const locale = useLocale();

  useEffect(() => {
    if (locale !== "bn") return;
    // after hydration, so the server's HTML and React's first render still match
    convertTree(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "characterData") convertNode(m.target as Text);
        else m.addedNodes.forEach(convertTree);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
