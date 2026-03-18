import React from 'react';

// Steps match the Xtime status progression exactly.
// Keys must match the normalized status strings from the server mapper.
const STEPS = [
  { key: 'not_arrived',   label: 'Not Arrived' },
  { key: 'arrived',       label: 'Arrived' },
  { key: 'in_progress',   label: 'In Progress' },
  { key: 'wash_bay',      label: 'Wash Bay' },
  { key: 'vehicle_ready', label: 'Vehicle Ready' },
];

function getStepStates(appointmentStatus) {
  const status = (appointmentStatus || 'not_arrived').toLowerCase();
  const idx = STEPS.findIndex(s => s.key === status);

  return STEPS.map((step, i) => {
    if (idx < 0) return { ...step, state: 'pending' };

    // vehicle_ready = all steps done
    if (status === 'vehicle_ready') return { ...step, state: 'done' };

    // Steps before current = done
    if (i < idx) return { ...step, state: 'done' };

    // Current step: not_arrived is active (not done), vehicle_ready is done
    if (i === idx) return { ...step, state: 'active' };

    // Steps after current = pending
    return { ...step, state: 'pending' };
  });
}

export default function StepProgressBar({ appointmentStatus }) {
  const steps = getStepStates(appointmentStatus);

  return (
    <ol className="step-bar">
      {steps.map((step, i) => (
        <li key={step.key} className={`step-bar__item step-bar__item--${step.state}`}>
          <span className="step-bar__circle">
            {step.state === 'done' ? '✓' : i + 1}
          </span>
          <span className="step-bar__label">{step.label}</span>
          {i < steps.length - 1 && <span className="step-bar__line" />}
        </li>
      ))}
    </ol>
  );
}
