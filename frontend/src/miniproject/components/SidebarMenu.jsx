import React from "react";
import { FaRegImage, FaTextHeight, FaMagic, FaExchangeAlt } from "react-icons/fa";

export default function SidebarMenu({ activePanel, setActivePanel }) {
    const items = [
        { id: "Media", icon: <FaRegImage />, label: "Media" },
        { id: "Text", icon: <FaTextHeight />, label: "Text" },
        { id: "Effects", icon: <FaMagic />, label: "Effects" },
        { id: "Transitions", icon: <FaExchangeAlt />, label: "Transitions" },
    ];

    return (
        <div className="sidebar-menu">
            {items.map((it) => (
                <button key={it.id} className={`sidebar-btn ${activePanel === it.id ? "active" : ""}`} onClick={() => setActivePanel(it.id)} title={it.label}>
                    <div className="icon">{it.icon}</div>
                    <div className="label">{it.label}</div>
                </button>
            ))}
        </div>
    );
}
