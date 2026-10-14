import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MapPin, Navigation, Loader2, X, Check, AlertCircle } from 'lucide-react';

interface CityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCitySaved?: (city: string) => void;
}

export const CityModal: React.FC<CityModalProps> = ({ isOpen, onClose, onCitySaved }) => {
  const { profile, updateCity } = useAuth();
  const { themeConfig } = useTheme();
  const [manualCity, setManualCity] = useState(profile?.city || '');
  const [isLocating, setIsLocating] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleGpsDetect = () => {
    setGpsError(null);
    setDetectedCity(null);

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocode via OpenStreetMap Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
              },
            }
          );

          if (!response.ok) {
            throw new Error('Reverse geocoding failed');
          }

          const data = await response.json();
          const addr = data.address || {};
          const cityFound =
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.village ||
            addr.county ||
            addr.state ||
            '';

          if (cityFound) {
            setDetectedCity(cityFound);
            setManualCity(cityFound);
          } else {
            setGpsError('Could not identify a city name for your GPS location. Please enter manually.');
          }
        } catch (err: any) {
          console.error('Error reverse geocoding GPS coordinates:', err);
          setGpsError('Could not find city from GPS coordinates. Please enter manually.');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Location access was denied. Please enter your city manually below.');
        } else if (error.code === error.TIMEOUT) {
          setGpsError('Location request timed out. Please enter your city manually.');
        } else {
          setGpsError('Unable to retrieve your location. Please enter your city manually.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleSaveCity = async (cityName: string) => {
    const trimmed = cityName.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await updateCity(trimmed);
      if (onCitySaved) {
        onCitySaved(trimmed);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update city:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in">
      <div className={`${themeConfig.cardBg} border ${themeConfig.cardBorder} rounded-3xl p-6 w-full max-w-sm ${themeConfig.cardShadow} relative`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-full ${themeConfig.textMuted} hover:${themeConfig.textColor} hover:${themeConfig.subCardBg} transition-colors cursor-pointer`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`w-12 h-12 rounded-2xl ${themeConfig.trophyBox} flex items-center justify-center mb-4 shadow-sm`}>
          <MapPin className="w-6 h-6 stroke-[2.5]" />
        </div>

        <h3 className={`text-xl font-black ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'} tracking-tight`}>
          Set Your City
        </h3>
        <p className={`text-xs ${themeConfig.textMuted} mt-1 mb-5 leading-relaxed`}>
          Compare your pushup reps against athletes in your local city. Choose GPS auto-detection or enter manually.
        </p>

        {/* Option 1: Locate by GPS */}
        <div className={`p-3.5 ${themeConfig.subCardBg} border ${themeConfig.subCardBorder} rounded-2xl mb-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${themeConfig.isLightMode ? 'text-slate-800' : 'text-zinc-200'} flex items-center gap-1.5`}>
              <Navigation className={`w-3.5 h-3.5 ${themeConfig.statTodayColor}`} />
              Locate by GPS
            </span>
          </div>

          <button
            onClick={handleGpsDetect}
            disabled={isLocating}
            className={`w-full py-2.5 px-3 rounded-xl ${themeConfig.cardBg} hover:opacity-85 ${themeConfig.statTodayColor} border ${themeConfig.cardBorder} font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50`}
          >
            {isLocating ? (
              <>
                <Loader2 className={`w-4 h-4 animate-spin ${themeConfig.statTodayColor}`} />
                <span>Detecting GPS Location...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Auto-Detect My City</span>
              </>
            )}
          </button>

          {detectedCity && (
            <div className={`mt-3 p-2.5 ${themeConfig.hudBadgeBg} border ${themeConfig.hudBadgeBorder} rounded-xl flex items-center justify-between gap-2`}>
              <div className="min-w-0">
                <p className={`text-[10px] ${themeConfig.hudBadgeText} font-semibold uppercase tracking-wider`}>Detected City</p>
                <p className={`text-xs font-black ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'} truncate`}>{detectedCity}</p>
              </div>
              <button
                onClick={() => handleSaveCity(detectedCity)}
                disabled={isSaving}
                className={`py-1 px-3 ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} text-xs font-black rounded-lg transition-all shrink-0 cursor-pointer shadow-sm`}
              >
                {isSaving ? 'Saving...' : 'Use City'}
              </button>
            </div>
          )}

          {gpsError && (
            <p className="text-[11px] text-amber-400 flex items-start gap-1.5 mt-2 leading-tight">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{gpsError}</span>
            </p>
          )}
        </div>

        {/* Option 2: Enter Manually */}
        <div className={`p-3.5 ${themeConfig.subCardBg} border ${themeConfig.subCardBorder} rounded-2xl`}>
          <p className={`text-xs font-bold ${themeConfig.isLightMode ? 'text-slate-800' : 'text-zinc-200'} mb-2`}>
            Or Enter City Manually
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveCity(manualCity);
            }}
            className="space-y-2"
          >
            <input
              type="text"
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              placeholder="e.g. London, Austin, Paris, Tokyo"
              maxLength={50}
              className={`w-full px-3 py-2 ${themeConfig.searchBarBg} border ${themeConfig.searchBarBorder} rounded-xl text-xs ${themeConfig.textColor} placeholder:${themeConfig.textMuted} focus:outline-none`}
            />
            <button
              type="submit"
              disabled={isSaving || !manualCity.trim()}
              className={`w-full py-2.5 px-4 rounded-xl ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} font-black text-xs flex items-center justify-center gap-1.5 ${themeConfig.startButtonShadow} disabled:opacity-50 transition-all cursor-pointer`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving City...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Save City &amp; View Board</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
