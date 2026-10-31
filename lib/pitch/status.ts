/**
 * What is real today, as shown in the interface. Keep every line true and dated: this page is read by investors.
 * Add a line only after the owner confirmed it. The Hospitality OS modules and website generator are not listed
 * because their live/pilot/in-development status has not been confirmed yet.
 */
export const STATUS_AS_OF = "31 October 2026";

export type StatusLevel = "works" | "pilot" | "next";

export const STATUS: { level: StatusLevel; title: string; items: string[] }[] = [
  {
    level: "works",
    title: "Works today",
    items: [
      "Agent framework with memory, permissions and safety rules. 658 automated tests passing.",
      "Phone agents that held real conversations in Dutch and German.",
      "This realtime avatar, built on a partner platform and configured by 3ECK.",
    ],
  },
  {
    level: "pilot",
    title: "In pilot",
    items: [
      "WhatsApp agent answering real messages, on a Meta test number.",
      "Rules for agents that message on their own (consent, quiet hours, human approval). Built and tested, not yet connected to a live sender.",
    ],
  },
  {
    level: "next",
    title: "Next",
    items: [
      "First customer deployments.",
      "Production hardening: secret vault, test environment, automated conversation tests.",
      "Verified WhatsApp business account.",
    ],
  },
];

export const TRACTION_NOTE = "Commercial traction: none yet. 3ECK is at an early, pre-revenue stage.";
export const CONTACT_EMAIL = "dev@3eck.nl";
