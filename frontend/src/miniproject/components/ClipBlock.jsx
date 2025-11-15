import React, { useRef } from "react";
import { FiImage, FiTrash2 } from "react-icons/fi";

export default function ClipBlock({ segment, onReplace, onRemove }) {
    const fileRef = useRef();
    const handleOpen = (e) => { e.stopPropagation(); fileRef.current && fileRef.current.click(); };
    const onFile = (e) => { const f = e.target.files[0]; if (!f) return; onReplace(f); };

    return (
        <div className="clip-block">
            <div className="clip-preview" onClick={handleOpen}>
                {segment.imageUrl ? (
                    segment.imageUrl && (segment.imageUrl.startsWith("blob:") || /(\.jpg|\.jpeg|\.png|\.gif)(\?.*)?$/i.test(segment.imageUrl)) ? (
                        <img src={segment.imageUrl} alt="clip" />
                    ) : (
                        <video src={segment.imageUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )
                ) : (
                    <div className="clip-placeholder">
                        <FiImage size={36} />
                        <div>Add media</div>
                    </div>
                )}
            </div>
            <div className="clip-footer">
                <div className="clip-info">
                    <div className="clip-start">Start: {segment.start?.toFixed(2)}s</div>
                    <div className="clip-duration">Dur: {segment.duration?.toFixed(2)}s</div>
                </div>
                <div className="clip-actions">
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); fileRef.current && fileRef.current.click(); }}>Replace</button>
                    <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                        <FiTrash2 />
                    </button>
                </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={onFile} />
        </div>
    );
}
