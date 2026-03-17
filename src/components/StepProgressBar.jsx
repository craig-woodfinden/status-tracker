import React from 'react';

const STEPS = [
  { key: 'arrived',          label: 'Arrival' },
  { key: 'inspecting',       label: 'Inspection' },
  { key: 'servicing',        label: 'Service' },
  { key: 'final inspection', label: 'Final touches' },
  { key: 'completed',        label: 'Ready for pick up' },
];

function getStepStates(appointmentStatus) {
  const status = (appointmentStatus || '').toLowerCase();
  const idx = STEPS.findIndex(s => s.key === status);

  return STEPS.map((step, i) => {
    if (idx < 0) return { ...step, state: 'pending' };
    if (i < idx)  return { ...step, state: 'done' };
    if (i === idx) {
      // arrived and completed are "done" (not in-progress)
      const inProgress = status !== 'arrived' && status !== 'completed';
      return { ...step, state: inProgress ? 'active' : 'done' };
    }
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
