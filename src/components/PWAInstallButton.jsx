import { useState } from "react";
import { MdInstallDesktop, MdInstallMobile, MdFullscreen, MdFullscreenExit, MdClose } from "react-icons/md";
import { usePWAInstall } from "../hooks/usePWAInstall";

export default function PWAInstallButton({ compact = false, menuMode = false }) {
  const { isInstallable, isInstalled, isIOS, isFullscreen, install, toggleFullscreen } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  if (menuMode) {
    return (
      <>
        {!isInstalled && (
          <button style={s.menuItem} onClick={handleInstallClick}>
            <MdInstallDesktop size={17} />
            <span>Install MyTube App</span>
          </button>
        )}
        <button style={s.menuItem} onClick={toggleFullscreen}>
          {isFullscreen ? <MdFullscreenExit size={18} /> : <MdFullscreen size={18} />}
          <span>{isFullscreen ? "Exit Full Screen" : "App Full Screen Mode"}</span>
        </button>
        {showGuide && (
          <InstallGuideModal
            isIOS={isIOS}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onClose={() => setShowGuide(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div style={s.wrap}>
        <button
          onClick={toggleFullscreen}
          style={s.fsBtn}
          title={isFullscreen ? "Exit Full Screen (F11)" : "Open in App Full Screen Mode"}
          aria-label="Toggle full screen"
        >
          {isFullscreen ? <MdFullscreenExit size={20} /> : <MdFullscreen size={20} />}
        </button>

        {!isInstalled && (
          <button
            onClick={handleInstallClick}
            style={compact ? s.compactBtn : s.installBtn}
            title="Install MyTube as a standalone app on your PC or Phone"
          >
            {compact ? <MdInstallMobile size={18} /> : <MdInstallDesktop size={16} />}
            <span>{compact ? "Install" : "Install App"}</span>
          </button>
        )}
      </div>

      {showGuide && (
        <InstallGuideModal
          isIOS={isIOS}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onClose={() => setShowGuide(false)}
        />
      )}
    </>
  );
}

function InstallGuideModal({ isIOS, isFullscreen, onToggleFullscreen, onClose }) {
  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h3 style={s.modalTitle}>Install MyTube App (Phone & PC)</h3>
          <button style={s.closeBtn} onClick={onClose} aria-label="Close">
            <MdClose size={20} />
          </button>
        </div>

        <p style={s.modalSub}>
          Run MyTube in its own dedicated full-screen window just like a native desktop or mobile app:
        </p>

        {isIOS ? (
          <div style={s.stepBox}>
            <p style={s.stepHeading}>iPhone / iPad (Safari)</p>
            <ol style={s.list}>
              <li>Tap the <strong>Share</strong> icon at the bottom of Safari.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Launch <strong>MyTube</strong> from your home screen for full-screen standalone mode.</li>
            </ol>
          </div>
        ) : (
          <>
            <div style={s.stepBox}>
              <p style={s.stepHeading}>Laptop / PC (Chrome, Edge, Brave)</p>
              <ol style={s.list}>
                <li>Click the <strong>Install MyTube</strong> icon in the right side of your browser address bar (or open the browser <strong>⋮</strong> menu → <strong>Save and share / Apps</strong> → <strong>Install MyTube</strong>).</li>
                <li>It will launch in a clean, borderless app window and add a shortcut to your Desktop / Start Menu.</li>
              </ol>
            </div>
            <div style={s.stepBox}>
              <p style={s.stepHeading}>Android Phone (Chrome)</p>
              <ol style={s.list}>
                <li>Tap the <strong>⋮</strong> menu in the top-right corner of Chrome.</li>
                <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
              </ol>
            </div>
          </>
        )}

        <div style={s.modalActions}>
          <button
            style={s.primaryBtn}
            onClick={() => {
              onToggleFullscreen();
              onClose();
            }}
          >
            {isFullscreen ? "Exit Full Screen Now" : "Enter Full Screen Mode Now"}
          </button>
          <button style={s.secondaryBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { display: "flex", alignItems: "center", gap: 6 },
  installBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "var(--hover-bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    padding: "6px 12px",
    borderRadius: 18,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
    transition: "background 0.2s, border-color 0.2s",
  },
  compactBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "var(--hover-bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    padding: "5px 10px",
    borderRadius: 16,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  fsBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "var(--hover-bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    cursor: "pointer",
    flexShrink: 0,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    background: "none",
    border: "none",
    color: "var(--text)",
    padding: "12px 16px",
    cursor: "pointer",
    fontSize: 14,
    textAlign: "left",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.72)",
    backdropFilter: "blur(4px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 440,
    background: "var(--card-bg)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 22,
    boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
    color: "var(--text)",
  },
  modalHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "var(--text)" },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    display: "flex",
    padding: 4,
  },
  modalSub: {
    fontSize: 13,
    color: "var(--text-muted)",
    lineHeight: 1.5,
    marginBottom: 14,
  },
  stepBox: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 10,
  },
  stepHeading: {
    fontSize: 13,
    fontWeight: 600,
    color: "#3ea6ff",
    marginBottom: 6,
  },
  list: {
    paddingLeft: 18,
    fontSize: 12.5,
    color: "var(--text)",
    lineHeight: 1.65,
  },
  modalActions: {
    display: "flex",
    gap: 10,
    marginTop: 16,
  },
  primaryBtn: {
    flex: 1,
    background: "#3ea6ff",
    color: "#000",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "var(--hover-bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
