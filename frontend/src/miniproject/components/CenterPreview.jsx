import React from "react";

export default function CenterPreview({ selectedSegment, audioRef, isPlaying, onPlayToggle, playheadTime, pxPerSec, setPxPerSec, onExport }) {
    return (
        <div className="center-preview">
            <div className="preview-canvas">
                {selectedSegment && selectedSegment.imageUrl ? (
                    <img src={selectedSegment.imageUrl} alt="preview" className="preview-img" />
                ) : (
                    <div className="preview-empty">No clip selected — Play timeline to preview</div>
                )}
                <div className="preview-overlay-top">
                    <div className="time">{playheadTime.toFixed(2)}s</div>
                </div>
            </div>
            <div className="center-controls">
                <audio ref={audioRef} controls style={{ width: "46%" }} />
                <div className="control-buttons">
                    <button className="ctrl-btn" onClick={() => onPlayToggle()}>{isPlaying ? "⏸ Pause" : "▶ Play"}</button>
                    <label>Zoom</label>
                    <input type="range" min={80} max={220} value={pxPerSec} onChange={(e) => setPxPerSec(Number(e.target.value))} />
                    <button className="btn-black" onClick={onExport}>Export</button>
                </div>
            </div>
        </div>
    );
}
