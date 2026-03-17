// Mock data — mirrors the real XTCON response shape exactly.
// Change appointmentStatus to preview different stages:
//   'arrived' | 'inspecting' | 'servicing' | 'final inspection' | 'completed'

export const mockTrackerData = {
  reservationId: 123456789,
  confirmationKey: 'MOCK-CONF-001',
  appointmentStatus: 'servicing',   // ← change this to preview status
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
