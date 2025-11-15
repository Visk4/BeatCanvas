import React from "react";

export default function EditorControls({ isPlaying, onPlayToggle, onExport, onSeek, currentTime, totalTime }) {
    return (
        <div className="editor-controls">
            <div className="controls-row">
                <button className="btn-outline" onClick={onPlayToggle}>{isPlaying ? "Pause" : "Play"}</button>
                <button className="btn-outline" onClick={() => { onSeek(0); }}>Rewind</button>
                <button className="btn-black" onClick={onExport}>Export</button>
            </div>
            <div className="seek-row">
                <input type="range" min={0} max={totalTime || 10} step="0.01" value={currentTime || 0} onChange={(e) => onSeek(Number(e.target.value))} className="seek-slider" />
                <div className="time-display">{(currentTime || 0).toFixed(2)} / {(totalTime || 0).toFixed(2)} s</div>
            </div>
        </div>
    );
}
