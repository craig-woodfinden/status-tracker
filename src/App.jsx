import React, { useEffect, useState } from 'react';
import { getStatus, getTrackerData, getPreferences, updatePreference } from './api';
import StepProgressBar from './components/StepProgressBar';
import AdvisorCard from './components/AdvisorCard';
import NotificationToggles from './components/NotificationToggles';

// Read config from URL: ?reservationId=123456789&webKey=FORD01
function getUrlParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    reservationId: p.get('reservationId'),
    webKey: p.get('webKey') || p.get('webkey'),
  };
}

const STATUS_BADGE_LABELS = {
  arrived:          'Arrival',
  inspecting:       'Inspection',
  servicing:        'Service',
  'final inspection': 'Final touches',
  completed:        'Ready for pick up',
};

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [smsOn, setSmsOn] = useState(false);
  const [emailOn, setEmailOn] = useState(false);

  const params = getUrlParams();

  useEffect(() => {
    async function load() {
      try {
        // Step 1: fetch live status from panama endpoint (fires on every page open)
        const status = await getStatus({
          reservationId: params.reservationId,
          webKey: params.webKey,
        }).catch(() => null); // non-fatal — tracker data has a fallback status

        // Step 2: fetch full tracker data (advisor, vehicle, dealer, notification flags)
        const tracker = await getTrackerData({
          reservationId: params.reservationId,
          webKey: params.webKey,
        });

        // Step 3: if status call returned an appointmentStatus, use it — it's fresher
        if (status?.appointmentStatus) {
          tracker.appointmentStatus = status.appointmentStatus;
        }

        setData(tracker);

        // Load notification preferences if personId is available
        if (tracker.personId && params.webKey) {
          const prefs = await getPreferences({
            webKey: params.webKey,
            personId: tracker.personId,
          }).catch(() => null);
          if (prefs) {
            setSmsOn(prefs.smsNotification ?? false);
            setEmailOn(prefs.emailNotification ?? false);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSmsChange(enabled) {
    setSmsOn(enabled);
    await updatePreference({
      personId: data?.personId,
      webKey: params.webKey,
      notificationType: 'text',
      enabled,
    }).catch(() => setSmsOn(!enabled)); // revert on failure
  }

  async function handleEmailChange(enabled) {
    setEmailOn(enabled);
    await updatePreference({
      personId: data?.personId,
      webKey: params.webKey,
      notificationType: 'email',
      enabled,
    }).catch(() => setEmailOn(!enabled));
  }

  if (loading) return <div className="loader">Loading…</div>;
  if (error)   return <div className="error-state">Unable to load service status.<br /><small>{error}</small></div>;
  if (!data)   return null;

  const {
    vehicleInfo,
    advisorInfo,
    reservationId,
    appointmentStatus,
    hasEmailNotificationToggle,
    hasSmsNotificationToggle,
    notifyStatusChange,
    dealerName,
    logoUrl,
  } = data;

  const vehicleLabel = vehicleInfo
    ? `${vehicleInfo.year || ''} ${vehicleInfo.make || ''} ${vehicleInfo.model || ''}`.trim()
    : '';

  const badgeLabel = STATUS_BADGE_LABELS[(appointmentStatus || '').toLowerCase()] || '';
  const showNotifications = (hasEmailNotificationToggle || hasSmsNotificationToggle) && notifyStatusChange;

  return (
    <div className="tracker">

      {/* Hero */}
      <div className="hero">
        <div className="hero__left">
          {logoUrl && <img className="hero__logo" src={logoUrl} alt={dealerName} />}
          <div className="hero__eyebrow">Service status tracker</div>
          <div className="hero__vehicle">{vehicleLabel}</div>
          {badgeLabel && <span className="hero__badge">{badgeLabel}</span>}
        </div>
        <div className="hero__right">
          <div className="hero__ref-label">Ref #</div>
          <div className="hero__ref-number">{reservationId}</div>
        </div>
      </div>

      {/* Body */}
      <div className="tracker__body">

        {/* Progress */}
        <div className="section-label">Service progress</div>
        <div className="card card--steps">
          <StepProgressBar appointmentStatus={appointmentStatus} />
        </div>

        {/* Advisor */}
        {advisorInfo && (
          <>
            <div className="section-label">Your service advisor</div>
            <div className="card">
              <AdvisorCard advisorInfo={advisorInfo} />
            </div>
          </>
        )}

        {/* Notifications */}
        {showNotifications && (
          <>
            <div className="section-label">Status updates</div>
            <div className="card">
              <NotificationToggles
                hasSms={hasSmsNotificationToggle}
                hasEmail={hasEmailNotificationToggle}
                smsOn={smsOn}
                emailOn={emailOn}
                onSmsChange={handleSmsChange}
                onEmailChange={handleEmailChange}
              />
            </div>
          </>
        )}

        {/* Footer */}
        <div className="tracker__footer">
          <span>{dealerName}</span>
        </div>

      </div>
    </div>
  );
}
