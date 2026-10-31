"use client";

import { forwardRef } from "react";
import { STATUS, STATUS_AS_OF, TRACTION_NOTE } from "@/lib/pitch/status";
import { CloseIcon } from "./icons";

/** A native dialog gives focus trapping, Escape to close and focus return for free. */
export const StatusSheet = forwardRef<HTMLDialogElement>(function StatusSheet(_props, ref) {
  return (
    <dialog ref={ref} className="sheet" aria-labelledby="status-title">
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="status-title">What is real today</h2>
          <button type="button" className="btn btn-round btn-ghost" aria-label="Close" onClick={() => (ref as React.RefObject<HTMLDialogElement>).current?.close()}>
            <CloseIcon />
          </button>
        </div>
        <p className="fine">Status as of {STATUS_AS_OF}.</p>
        {STATUS.map((group) => (
          <section key={group.level} className="level" data-level={group.level}>
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="traction">{TRACTION_NOTE}</p>
      </div>
    </dialog>
  );
});
