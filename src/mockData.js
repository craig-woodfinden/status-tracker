// Mock data — mirrors the normalized response shape from the server.
// Change appointmentStatus to preview different stages:
//   'not_arrived' | 'arrived' | 'in_progress' | 'wash_bay' | 'vehicle_ready'
//
// These map from real Xtime statuses:
//   NOT_ARRIVED → not_arrived
//   CHECKED_IN  → arrived
//   ARRIVED / WITH_ADVISOR → in_progress
//   PENDING_CUSTOMER_AUTORIZATION → wash_bay
//   COMPLETED → vehicle_ready

export const mockTrackerData = {
  reservationId: 123456789,
  confirmationKey: 'MOCK-CONF-001',
  appointmentStatus: 'in_progress',  // ← change this to preview status
  statusTrackerEnabled: true,
  personId: 987654,
  dealerName: 'Sydney Ford',
  logoUrl: '/img/logo.png',
  locales: [{ localeCode: 'en_AU', defaultLocale: true }],
  advisorInfo: {
    name: 'James Hartley',
    phoneNo: '02 6123 4567',
    email: 'james.hartley@forddealer.com.au',
  },
  vehicleInfo: {
    year: 2022,
    make: 'Ford',
    model: 'Ranger',
  },
  dealerContact: {
    city: 'Sydney',
    country: 'AU',
    districtId: 'NSW',
    servicePhone: '02 6123 4567',
    state: 'NSW',
    streetAddressOne: '123 Parramatta Road',
    postalCodeString: '2000',
  },
  defaultDealerMake: 'Ford',
  hasEmailNotificationToggle: true,
  hasSmsNotificationToggle: true,
  notifyStatusChange: true,
};

export const mockPreferences = {
  emailNotification: true,
  smsNotification: false,
  email: 'customer@example.com.au',
  phone: '0412 345 678',
};
