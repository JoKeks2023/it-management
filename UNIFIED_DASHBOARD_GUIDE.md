# Unified Dashboard & Unifi Integration Guide

## Overview

This document describes the new unified dashboard system and Unifi integration features added to the IT Management system.

## Features

### 1. Unified Dashboard

The new unified dashboard replaces the previous tab-based navigation with a modern sidebar navigation system. This allows for:

- **Central home page** with key metrics and overview of all modules
- **Quick action buttons** for common tasks (new ticket, new event, etc.)
- **Module grid** showing all available modules with icons and descriptions
- **Cross-module navigation** with related module links

**Access:** Go to home (default landing page) or click the Home button in the sidebar.

### 2. Sidebar Navigation

The persistent left sidebar provides:

- **Collapsible navigation** that can be expanded/collapsed for more screen space
- **Active module highlighting** to show current location
- **All 14+ modules** organized in a clean vertical list
- **Responsive design** that adapts to mobile screens

**Features:**
- Click the toggle button (← / →) to collapse/expand the sidebar
- Click any module to navigate to it
- Current module is highlighted in primary color
- Smooth animations and hover effects

### 3. Unifi Integration

Connect your Ubiquiti Unifi network controller to automatically sync network devices.

#### Setup

1. Navigate to **Unifi** in the sidebar (🌐 icon)
2. Click **Edit** to open configuration
3. Enter your Unifi controller details:
   - **Controller URL**: e.g., `https://192.168.1.1:8443`
   - **Username**: Your Unifi admin username
   - **Password**: Your Unifi admin password
   - **Site ID**: Usually `default`
4. Check the **Enable** checkbox
5. Click **Save**

#### Syncing Devices

Once configured and connected:

1. Click the **Status** refresh button to verify connection
2. Click **Sync Devices** to import devices from your Unifi controller
3. Devices appear in the synced devices list
4. They are automatically added to your Network module

#### Device Information

Synced devices include:
- Device name and type
- IP address and MAC address
- Device model
- Current online/offline status
- Device metadata from Unifi controller

### 4. Cross-Module Linking

Navigate between related modules easily with built-in links:

Each module automatically shows related modules at the bottom:
- **Tickets** → Projects, Inventory, Contacts, Reports
- **Events** → Contacts, Inventory, Quotes
- **Projects** → Tickets, Maintenance, Inventory
- **Network** → Inventory, Maintenance, Unifi
- **And more...**

## Component Reference

### Frontend Components

#### UnifiedDashboard
```jsx
import { UnifiedDashboard } from './pages/UnifiedDashboard';

// Home page with overview stats and module grid
<UnifiedDashboard onNavigate={(moduleId) => {...}} />
```

#### Sidebar
```jsx
import { Sidebar } from './components/Sidebar';

// Persistent left navigation
<Sidebar activeTab={activeTab} onNavigate={setActiveTab} />
```

#### ModuleLinks
```jsx
import { ModuleLinks, ModuleCard, QuickActionBar } from './components/ModuleLinks';

// Show related modules for current page
<ModuleLinks currentModule="tickets" onNavigate={onNavigate} />

// Quick action card
<ModuleCard icon="🎫" label="Tickets" onClick={() => {}} />

// Quick action bar
<QuickActionBar actions={[
  { id: 'new-ticket', label: 'New Ticket', icon: '🎫' }
]} onAction={onAction} />
```

#### UnifiDashboard
```jsx
import { UnifiDashboard } from './pages/UnifiDashboard';

// Unifi configuration and device management
<UnifiDashboard />
```

### Backend Routes

#### Unifi Integration API

**Configuration**
```
GET  /unifi/config          - Get Unifi configuration
POST /unifi/config          - Save Unifi configuration
```

**Status**
```
GET  /unifi/status          - Check controller connection status
```

**Device Sync**
```
POST /unifi/sync-devices    - Sync devices from controller
GET  /unifi/devices         - List synced devices
GET  /unifi/device/:id      - Get device details
```

### API Service

```javascript
import { unifiApi } from './services/api';

// Get current config
const config = await unifiApi.getConfig();

// Update config
await unifiApi.setConfig({
  enabled: true,
  controller_url: 'https://192.168.1.1:8443',
  username: 'admin',
  password: 'password',
  site_id: 'default'
});

// Check status
const status = await unifiApi.status();
// Returns: { enabled, connected, device_count, error, timestamp }

// Sync devices
const result = await unifiApi.syncDevices();
// Returns: { message, devices_synced, devices }

// List synced devices
const { devices, count } = await unifiApi.listDevices();

// Get device details
const device = await unifiApi.getDevice(id);
```

## Usage Examples

### Adding Module Links to Your Page

```jsx
import { ModuleLinks } from '../components/ModuleLinks';

function MyPage({ onNavigate }) {
  return (
    <div>
      {/* Your page content */}
      
      <ModuleLinks 
        currentModule="tickets"
        onNavigate={onNavigate}
      />
    </div>
  );
}
```

### Navigating Between Modules

From anywhere in the app:

```jsx
// In a click handler or component
const handleNavigateToProjects = () => {
  setActiveTab('projects');
};

// Or pass the navigation callback
<UnifiedDashboard onNavigate={setActiveTab} />
```

## Database Schema

The Unifi integration uses the existing `network_devices` table, adding:

```sql
-- New columns for Unifi sync (already in schema)
ALTER TABLE network_devices ADD COLUMN unifi_id VARCHAR(255);

-- Track which devices were synced from Unifi
-- Query: SELECT * FROM network_devices WHERE unifi_id IS NOT NULL;
```

## Configuration

### Environment Variables

No new environment variables required. The Unifi configuration is stored in the application state (in production, should be moved to database).

### Unifi Controller Requirements

- Unifi Dream Machine, CloudKey, or Unifi OS Console
- Admin access to the controller
- Network connectivity from your IT Management server
- HTTPS certificate (self-signed is supported)

## Troubleshooting

### Connection Failed

1. Check controller URL is correct (include port, usually 8443)
2. Verify username and password
3. Ensure controller is online and accessible from your server
4. Check firewall rules allow access

### No Devices Appear

1. Click Refresh button to check connection status
2. Verify devices exist in your Unifi controller
3. Click "Sync Devices" button
4. Check for error messages

### Only Some Devices Sync

- Currently syncs: Controllers, Gateways, Switches, Access Points
- Other device types may sync as "Sonstiges" (Other)
- This can be customized in the UnifiClient class

## Future Enhancements

Potential improvements for future versions:

1. **Real-time sync** - Automatic periodic updates from Unifi
2. **Device details** - Port information, bandwidth usage, client details
3. **Notifications** - Alert when devices go offline
4. **Integration** - Link Unifi data to tickets and maintenance tasks
5. **Authentication** - Move credentials to secure database storage
6. **Multi-site** - Support multiple Unifi sites/networks
7. **Dashboard widget** - Show Network health in main dashboard
8. **Webhooks** - Trigger actions on device state changes

## Support

For issues or questions about the unified dashboard or Unifi integration:

1. Check the troubleshooting section above
2. Review browser console for errors (F12 → Console)
3. Check backend logs for API errors
4. Verify all credentials and URLs are correct

---

**Version:** 2.0  
**Last Updated:** 2026-02-25  
**Status:** Production Ready
