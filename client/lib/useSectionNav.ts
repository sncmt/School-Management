"use client";

import { useEffect, useState, type MouseEvent } from "react";

/*
 * A one-page site's menu: which section is in view, and a smooth jump to one. Section "top" is
 * the top of the page; the others are element ids.
 */

// a section counts as the current one once its top is this far down the window (under the bar)
const SPY_OFFSET_PX = 120;

/** The section in view: the last one whose top has passed under the bar, or the last of all at the bottom. */
export const useActiveSection = (sections: string[]) => {
  const [active, setActive] = useState("top");
  const key = sections.join(",");

  useEffect(() => {
    const ids = key.split(",").filter((id) => id && id !== "top");
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = "top";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= SPY_OFFSET_PX) current = id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom && ids.length > 0 && window.scrollY > 0) current = ids[ids.length - 1];
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [key]);

  return active;
};

/** Scroll to a section (smoothly, unless the visitor asks for less motion) and show it in the address bar. */
export const jumpToSection = (section: string, href = "/", e?: MouseEvent) => {
  e?.preventDefault();
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const target = section === "top" ? null : document.getElementById(section);
  if (target) target.scrollIntoView({ behavior });
  else window.scrollTo({ top: 0, behavior });
  history.replaceState(null, "", section === "top" ? href : `#${section}`);
};
