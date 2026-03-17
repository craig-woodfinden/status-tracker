import React from 'react';

export default function AdvisorCard({ advisorInfo }) {
  if (!advisorInfo) return null;
  const { name, phoneNo, email } = advisorInfo;
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="advisor-card">
      <div className="advisor-card__avatar">{initial}</div>
      <div className="advisor-card__details">
        <div className="advisor-card__name">{name}</div>
        {phoneNo && (
          <a className="advisor-card__phone" href={`tel:${phoneNo}`}>
            {phoneNo}
          </a>
        )}
        {email && <div className="advisor-card__email">{email}</div>}
      </div>
    </div>
  );
}
