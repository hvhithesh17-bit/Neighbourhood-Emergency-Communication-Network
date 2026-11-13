import { useState, useRef, useEffect } from "react";
import { ShieldAlert } from "lucide-react";

/**
 * Advanced SOS Button Component (Step 12)
 *
 * Implements a press-and-hold safety pattern to prevent accidental
 * emergency triggers. Provides visual progress feedback and haptic vibration.
 *
 * @param {Function} onTrigger - Callback executed when the hold is completed.
 * @param {number} holdDuration - Duration in milliseconds the user must hold (default: 1500ms).
 * @param {boolean} disabled - Whether the button is disabled.
 */
function SOSButton({ onTrigger, holdDuration = 1500, disabled = false }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);

  const startHold = () => {
    if (disabled) return;
    setHolding(true);
    startTimeRef.current = Date.now();

    // Haptic vibration feedback on supported mobile devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const percent = Math.min((elapsed / holdDuration) * 100, 100);
      setProgress(percent);

      if (percent < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        // Complete hold: vibrate and fire trigger
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 200]);
        }
        setHolding(false);
        setProgress(0);
        if (onTrigger) {
          onTrigger();
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const cancelHold = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setHolding(false);
    setProgress(0);
  };

  // Keyboard accessibility: hold Space or Enter to trigger
  const handleKeyDown = (e) => {
    if ((e.key === " " || e.key === "Enter") && !holding) {
      e.preventDefault();
      startHold();
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      cancelHold();
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="sos-component-wrapper">
      <button
        type="button"
        className={`sos-advanced-btn ${holding ? "holding" : ""}`}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        disabled={disabled}
        aria-label="Press and hold 1.5 seconds to trigger Emergency SOS"
      >
        {/* Radar background pulse wave */}
        <div className="sos-btn-pulse-wave"></div>

        {/* Progress Fill Bar */}
        <div
          className="sos-progress-fill"
          style={{ width: `${progress}%` }}
        ></div>

        {/* Button Content */}
        <div className="sos-btn-content">
          <ShieldAlert size={28} className={holding ? "spin-pulse" : ""} />
          <div className="sos-btn-text">
            <strong>{holding ? "KEEP HOLDING..." : "EMERGENCY SOS"}</strong>
            <small>
              {holding
                ? `Activating in ${(
                    (holdDuration - (progress / 100) * holdDuration) /
                    1000
                  ).toFixed(1)}s`
                : "Press & hold 1.5s to activate"}
            </small>
          </div>
        </div>
      </button>
    </div>
  );
}

export default SOSButton;

