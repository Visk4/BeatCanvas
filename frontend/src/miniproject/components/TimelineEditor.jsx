// Simplified TimelineEditor mirroring MiniProject UI classes
import React, { useRef } from "react";
import "../styles/VideoEditor.css";

export default function TimelineEditor({ segments = [], onSeek = () => { }, playheadTime = 0, pxPerSec = 140, timelineWidthPx = 1600, onSelectSegment = () => { }, onReplaceMedia = () => { }, onRemoveSegment = () => { } }) {
    const wrapperRef = useRef(null);

    const marks = [];
    const duration = Math.max(segments.length ? segments[segments.length - 1].start + (segments[segments.length - 1].duration || 1) : 10, 10);
    for (let t = 0; t <= Math.ceil(duration); t += 1) marks.push(t);

    const handleClickOnTrack = (e) => {
        const rect = wrapperRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const time = clickX / pxPerSec;
        onSeek(time);
    };

    return (
        <div className="timeline-editor" style={{ width: "100%", position: "relative" }}>
            <div className="time-ruler" style={{ height: 28, position: "relative", marginBottom: 6 }}>
                {marks.map((m) => (
                    <div key={m} className="ruler-mark" style={{ left: `${(m * pxPerSec) / timelineWidthPx * 100}%`, position: "absolute", transform: "translateX(-50%)" }}>
                        <div className="ruler-line" style={{ height: 10, width: 1, background: "#333" }} />
                        <div className="ruler-label" style={{ marginTop: 4 }}>{m}s</div>
                    </div>
                ))}
            </div>

            <div ref={wrapperRef} className="timeline-track" style={{ width: "100%", overflowX: "auto", background: "#010101", borderRadius: 8, padding: 10 }} onClick={handleClickOnTrack}>
                <div style={{ height: 120, width: Math.max(timelineWidthPx, 800), position: "relative" }}>
                    {segments.map((seg) => {
                        const left = (seg.start || 0) * pxPerSec;
                        const w = Math.max((seg.duration || Math.max(0.2, (seg.end ?? 0) - (seg.start ?? 0))) * pxPerSec, 40);
                        return (
                            <div key={seg.id} className="rnd-segment" onClick={(e) => { e.stopPropagation(); onSelectSegment(seg.id); }} style={{ position: "absolute", left, top: 8, width: w, height: 104, cursor: "pointer" }}>
                                <div className="clip-block" style={{ height: "100%" }}>
                                    <div className="clip-preview" style={{ height: 70 }}>
                                        {seg.imageUrl ? <img src={seg.imageUrl} alt={seg.id} /> : <div className="clip-placeholder">Add media</div>}
                                    </div>
                                    <div className="clip-footer" style={{ padding: "6px 8px" }}>
                                        <div className="clip-info">
                                            <div className="clip-start">{(seg.start || 0).toFixed(1)}s</div>
                                            <div className="clip-duration">Dur: {(seg.duration || Math.max(0.2, (seg.end ?? 0) - (seg.start ?? 0))).toFixed(2)}s</div>
                                        </div>
                                        <div className="clip-actions">
                                            <label style={{ cursor: "pointer" }}>
                                                Replace
                                                <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplaceMedia(seg.id, f); }} />
                                            </label>
                                            <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); onRemoveSegment(seg.id); }}>Remove</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div className="playhead" style={{ left: `${playheadTime * pxPerSec}px` }} />
                </div>
            </div>
        </div>
    );
}
