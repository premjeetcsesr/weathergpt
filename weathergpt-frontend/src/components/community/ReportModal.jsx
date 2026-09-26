import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  MapPin,
  Camera,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  Navigation,
  Trash2
} from 'lucide-react';
import { REPORT_CATEGORIES, createCommunityReport } from '../../services/communityReportsApi';
import { useAuth } from '../../context/AuthContext';

export function ReportModal({ isOpen, onClose, onSuccess, initialCoordinates = null }) {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [category, setCategory] = useState(REPORT_CATEGORIES[0].id);
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState(initialCoordinates?.lat || null);
  const [longitude, setLongitude] = useState(initialCoordinates?.lon || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Sync initial coordinates if passed
  useEffect(() => {
    if (initialCoordinates?.lat && initialCoordinates?.lon) {
      setLatitude(initialCoordinates.lat);
      setLongitude(initialCoordinates.lon);
    }
  }, [initialCoordinates]);

  // Automatically request GPS location when modal opens
  useEffect(() => {
    if (isOpen && (!latitude || !longitude)) {
      handleDetectGps();
    }
  }, [isOpen]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const isDetectingRef = useRef(false);

  if (!isOpen) return null;

  // Handle GPS detection using browser geolocation
  const handleDetectGps = () => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.');
      isDetectingRef.current = false;
      return;
    }

    setIsDetectingGps(true);

    const tryGetLocation = (useHighAccuracy) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setIsDetectingGps(false);
          isDetectingRef.current = false;
          setGpsError(null);
        },
        async (error) => {
          if (useHighAccuracy && (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT)) {
            // Intentionally silent: retrying with standard accuracy without alarming the user
            tryGetLocation(false);
            return;
          }

          try {
            const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
            if (ipRes.ok) {
              const data = await ipRes.json();
              if (data.latitude && data.longitude) {
                setLatitude(parseFloat(data.latitude));
                setLongitude(parseFloat(data.longitude));
                if (data.city && !locationName) {
                  setLocationName(data.city);
                }
                setIsDetectingGps(false);
                isDetectingRef.current = false;
                setGpsError('Could not get exact GPS lock. Using approximate network location.');
                return;
              }
            }
          } catch (ipErr) {
            console.warn('IP fallback failed:', ipErr);
          }

          setIsDetectingGps(false);
          isDetectingRef.current = false;
          if (error.code === error.PERMISSION_DENIED) {
            setGpsError('Location permission was denied. Please allow location access or enter coordinates manually.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setGpsError('Location information is currently unavailable. Please enter coordinates manually.');
          } else {
            setGpsError('Could not obtain GPS location. Please enter coordinates manually.');
          }
        },
        { enableHighAccuracy: useHighAccuracy, timeout: useHighAccuracy ? 25000 : 15000, maximumAge: 0 }
      );
    };

    tryGetLocation(true);
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setIsCameraOpen(false);
  };

  const openCamera = async () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Live camera is not supported. Please use a device/browser with camera access.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (error) {
      setErrorMessage(error.name === 'NotAllowedError'
        ? 'Camera permission was denied. Please allow camera access and try again.'
        : 'Could not open the live camera. Please try again.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setErrorMessage('Camera is not ready yet. Please wait a moment and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setErrorMessage('Could not capture the photo. Please try again.');
        return;
      }
      const file = new File([blob], `weather-report-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);


    if (!latitude || !longitude) {
      setErrorMessage('GPS Location is required. Please click "Detect GPS" or provide coordinates.');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('Description must be at least 5 characters detailing the incident.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description.trim());
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      if (locationName.trim()) {
        formData.append('location_name', locationName.trim());
      }
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const result = await createCommunityReport(formData);

      // Broadcast event so active weather maps pin this observation immediately!
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('community-report-added', { detail: result }));
      }

      setSuccessMessage('Your report was submitted successfully! It is now pinned on the map.');
      setIsSubmitting(false);

      setTimeout(() => {
        if (onSuccess) onSuccess(result);
        onClose();
      }, 1500);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Report Weather Incident
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share real-time ground observations with the community
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Important Disclaimers */}
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p>
              <strong>Community Report:</strong> Citizen observations are moderated before public display. Never use this for emergency distress calls (Dial 112).
            </p>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Incident Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REPORT_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-2xl text-left border text-xs transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {description.length}/1000
              </span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., Road is submerged under 2 feet of water near the flyover. Traffic stopped."
              maxLength={1000}
              className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all resize-none"
            />
          </div>

          {/* GPS Location & Place Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span>GPS Location</span> <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleDetectGps}
                disabled={isDetectingGps}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-medium transition-colors"
              >
                {isDetectingGps ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3 h-3" />
                    <span>Detect GPS</span>
                  </>
                )}
              </button>
            </div>

            {latitude && longitude ? (
              <div className="p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-mono">
                <div className="flex gap-2 w-full sm:w-auto">
                  <input 
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || '')}
                    className="w-full sm:w-24 p-1 rounded-lg border border-emerald-300/50 bg-emerald-100/50 dark:bg-emerald-900/50 dark:border-emerald-700 focus:outline-none"
                    placeholder="Lat"
                  />
                  <input 
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || '')}
                    className="w-full sm:w-24 p-1 rounded-lg border border-emerald-300/50 bg-emerald-100/50 dark:bg-emerald-900/50 dark:border-emerald-700 focus:outline-none"
                    placeholder="Lon"
                  />
                </div>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full font-sans font-semibold shrink-0 self-start sm:self-auto">
                  Coordinates Ready
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>No GPS location captured yet. Click &quot;Detect GPS&quot; above, or enter manually below.</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    step="any"
                    value={latitude || ''}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || null)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs text-slate-900 dark:text-slate-100"
                    placeholder="Latitude (e.g. 28.6139)"
                  />
                  <input 
                    type="number"
                    step="any"
                    value={longitude || ''}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || null)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs text-slate-900 dark:text-slate-100"
                    placeholder="Longitude (e.g. 77.2090)"
                  />
                </div>
              </div>
            )}

            {gpsError && (
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                {gpsError}
              </p>
            )}

            {/* Optional Location Name / Landmark */}
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Landmark or locality"
              className="w-full text-xs p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Photo Upload (Cloudinary) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Incident Photo <span className="text-slate-400 font-normal">(Live camera photo only, max 5MB)</span>
            </label>

            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 group shadow-sm">
                <img
                  src={photoPreview}
                  alt="Incident Preview"
                  className="w-full h-44 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-2 rounded-full bg-slate-900/80 hover:bg-red-600 text-white transition-colors"
                  title="Remove Photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (!latitude || !longitude) handleDetectGps();
                    openCamera();
                  }}
                  className="w-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 text-center transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Take Photo
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Open live device camera
                  </span>
                </button>
              </div>
            )}
          </div>
        </form>

        {isCameraOpen && (
          <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <span className="text-sm font-semibold">Live Camera</span>
              <button
                type="button"
                onClick={stopCamera}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close camera"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-full w-full rounded-2xl object-contain bg-black"
              />
            </div>
            <div className="p-4 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full border-4 border-white bg-brand-500 hover:bg-brand-600 shadow-lg"
                aria-label="Capture live photo"
              />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <span>Submit Report</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
