import React from "react";

export default function MediaPanel({ segments, selectedSegmentId, onSelectSegment, onBulkUpload, replaceMedia, bulkFilesRef }) {
    return (
        <div className="media-panel">
            <div className="media-actions">
                <button className="btn-outline" onClick={() => bulkFilesRef.current?.click()}>
                    Upload Photos (bulk)
                </button>
            </div>
            <div className="media-grid">
                {segments.map((s) => (
                    <div key={s.id} className={`media-card ${selectedSegmentId === s.id ? "selected" : ""}`} onClick={() => onSelectSegment(s.id)}>
                        <div className="thumb">
                            {s.imageUrl ? <img src={s.imageUrl} alt={`seg-${s.index}`} /> : <div className="empty-thumb">+</div>}
                        </div>
                        <div className="meta">#{s.index} • {s.duration}s</div>
                        <div className="card-actions">
                            <label className="small-upload">
                                Replace
                                <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceMedia(s.id, f); }} />
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
