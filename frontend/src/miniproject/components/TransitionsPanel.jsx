import React from "react";

export default function TransitionsPanel({ setSegmentTransition, selectedSegmentId }) {
    const list = [
        { key: null, name: "None" },
        { key: "crossfade", name: "Crossfade" },
        { key: "dip-to-black", name: "Dip" },
        { key: "slide", name: "Slide" },
    ];

    return (
        <div className="transitions-panel">
            <div style={{ marginBottom: 8 }}>Apply transition to selected clip or all clips</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {list.map((t) => (
                    <button key={String(t.key)} className="btn-outline" onClick={() => setSegmentTransition(selectedSegmentId, t.key ? { type: t.key, duration: 0.4 } : null)}>
                        {t.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
