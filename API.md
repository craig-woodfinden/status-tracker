# Status Tracker — API Reference

## Production API (XTCON)

The original consumer-8 app calls Xtime's XTCON backend. These are the same endpoints
this standalone app uses when `VITE_MOCK_MODE=false`.

### Base URL
All calls go through `vite.config.js` proxy `/api` → `{XTCON_HOST}/consumer`

Set `XTCON_HOST` in `.env.local` for local dev against a real backend.

---

### 1. Get tracker details

```
GET /rest/statustracker/appointment/{reservationId}/details
```

**Query parameters:**
| Param | Type | Description |
|---|---|---|
| `webKey` | string | Dealer identifier (e.g. `FORD01`) |
| `country` | string | 2-letter country code (e.g. `AU`) |
| `language` | string | Locale code (e.g. `en_AU`) |
| `tokenId` | string | Auth token (from configstore in consumer-8) |

**Response shape:**
```json
{
  "reservationId": 123456789,
  "confirmationKey": "CONF-001",
  "appointmentStatus": "servicing",
  "statusTrackerEnabled": true,
  "personId": 987654,
  "dealerName": "Sydney Ford",
  "logoUrl": "/img/logo.png",
  "locales": [{ "localeCode": "en_AU", "defaultLocale": true }],
  "advisorInfo": {
    "name": "James Hartley",
    "phoneNo": "02 6123 4567",
    "email": "james@forddealer.com.au"
  },
  "vehicleInfo": {
    "year": 2022,
    "make": "Ford",
    "model": "Ranger"
  },
  "dealerContact": {
    "city": "Sydney",
    "country": "AU",
    "servicePhone": "02 6123 4567",
    "state": "NSW",
    "streetAddressOne": "123 Parramatta Road",
    "postalCodeString": "2000"
  },
  "defaultDealerMake": "Ford",
  "hasEmailNotificationToggle": true,
  "hasSmsNotificationToggle": true,
  "notifyStatusChange": true
}
```

**appointmentStatus values:**
| Value | Meaning |
|---|---|
| `arrived` | Vehicle has arrived |
| `inspecting` | Inspection in progress |
| `servicing` | Service in progress |
| `final inspection` | Final check in progress |
| `completed` | Ready for pick up |

---

### 2. Get notification preferences

```
GET /rest/customer/preferences/{webKey}/{personId}
```

**Response:**
```json
{
  "emailNotification": true,
  "smsNotification": false,
  "email": "customer@example.com",
  "phone": "0412 345 678"
}
```

---

### 3. Update notification preference

```
POST /rest/customer/{personId}/dealer/{webKey}/preference/{notificationType}/{action}
```

| Param | Values |
|---|---|
| `notificationType` | `email` or `text` |
| `action` | `enable` or `disable` |

No request body required.

---

## Using a different backend

To replace XTCON with your own API:

1. Edit `src/api.js`
2. Update the `apiFetch` calls to match your endpoint URLs
3. Update `vite.config.js` proxy target if needed
4. The response shapes just need to match the fields in `src/mockData.js`

The app only reads these fields from the tracker response:
- `reservationId`, `appointmentStatus`, `vehicleInfo`, `advisorInfo`
- `dealerName`, `logoUrl`, `personId`
- `hasEmailNotificationToggle`, `hasSmsNotificationToggle`, `notifyStatusChange`
