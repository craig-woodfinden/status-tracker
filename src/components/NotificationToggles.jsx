import React from 'react';

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <span className="toggle__label">{label}</span>
      <span className="toggle__switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle__track" />
      </span>
    </label>
  );
}

export default function NotificationToggles({
  hasSms,
  hasEmail,
  smsOn,
  emailOn,
  onSmsChange,
  onEmailChange,
}) {
  if (!hasSms && !hasEmail) return null;

  return (
    <div className="card">
      <div className="section-title">Status updates</div>
      {hasSms && (
        <Toggle label="Receive text message updates" checked={smsOn} onChange={onSmsChange} />
      )}
      {hasEmail && (
        <Toggle label="Receive email updates" checked={emailOn} onChange={onEmailChange} />
      )}
    </div>
  );
}
