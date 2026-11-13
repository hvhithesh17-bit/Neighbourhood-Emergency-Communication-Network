import { useState } from "react";
import { AlertTriangle, MapPin, Send, Loader2 } from "lucide-react";
import { getCurrentLocation } from "../services/locationService";
import { broadcastEmergency } from "../services/emergencyService";
import "../App.css";

function ReportEmergency() {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleGetLocation() {
    setLocationLoading(true);
    setError("");

    try {
      const result = await getCurrentLocation();

      setLocation({
        latitude: result.latitude,
        longitude: result.longitude,
        accuracy: result.accuracy,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!category || !description.trim()) {
      setError("Please select a category and enter a description.");
      return;
    }

    if (description.trim().length < 10) {
      setError("Please provide at least 10 characters.");
      return;
    }

    try {
      setSubmitting(true);

      const targetLat = location?.latitude || 12.9716;
      const targetLon = location?.longitude || 77.5946;
      const targetAcc = location?.accuracy || 50;

      await broadcastEmergency({
        type: category,
        latitude: targetLat,
        longitude: targetLon,
        accuracy: targetAcc,
        notes: description.trim(),
        radiusKm: 5,
      });

      setSuccess(
        "Emergency report broadcasted successfully to all nearby devices within 5km!"
      );
      setCategory("");
      setDescription("");
    } catch (err) {
      console.error("Report broadcast failed:", err);
      setError("Failed to broadcast emergency report: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="report-page">
      <div className="report-header">
        <AlertTriangle size={30} />
        <div>
          <h1>Report an Emergency</h1>
          <p>Provide accurate information to alert your neighbourhood within 5km.</p>
        </div>
      </div>

      <form className="report-card" onSubmit={handleSubmit}>
        <label htmlFor="category">Emergency Category</label>

        <select
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        >
          <option value="">Select emergency type</option>
          <option value="Medical Emergency">Medical Emergency</option>
          <option value="Fire / Hazard">Fire Emergency</option>
          <option value="Road Accident">Road Accident</option>
          <option value="Security Concern">Crime / Safety Threat</option>
          <option value="Other Emergency">Other Emergency</option>
        </select>

        <label htmlFor="description">Emergency Description</label>

        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe what happened and any immediate danger..."
          rows={5}
          maxLength={1000}
          required
        />

        <div className="character-count">
          {description.length}/1000 characters
        </div>

        <div className="report-location">
          <div>
            <MapPin size={21} />
            <div>
              <h3>Emergency Location</h3>
              <p>Location is optional. Share it only if you feel safe.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <>
                <Loader2 size={17} />
                Getting location...
              </>
            ) : (
              "Attach My Location"
            )}
          </button>

          {location && (
            <p className="attached-location">
              Location attached successfully. Accuracy:{" "}
              {Math.round(location.accuracy)} metres.
            </p>
          )}
        </div>

        {error && <p className="location-error">{error}</p>}

        {success && <p className="report-success">{success}</p>}

        <button type="submit" className="report-submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={18} className="spinner" />
              Broadcasting Alert...
            </>
          ) : (
            <>
              <Send size={18} />
              Broadcast Emergency to 5km Mesh
            </>
          )}
        </button>

        <p className="report-disclaimer">
          For immediate emergencies in India, call 112. NECN is not a
          replacement for official emergency services.
        </p>
      </form>
    </div>
  );
}

export default ReportEmergency;
