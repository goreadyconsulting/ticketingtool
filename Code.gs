const SPREADSHEET_ID = '1RJJDGy-WZz54pmelyqR-pokV1oFluk6cu3E9Zaye77s';

const SHEETS = {
  USERS: 'Users',
  INCIDENTS: 'Incidents',
  ACTIVITY: 'Activity',
  SESSIONS: 'Sessions',
  CONFIG: 'Config'
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'health';

  if (action === 'health') {
    return jsonResponse_({
      ok: true,
      app: getConfigValue_('APP_NAME') || 'ResolveOps',
      serverTime: new Date().toISOString()
    });
  }

  return jsonResponse_({
    ok: false,
    error: 'Use POST requests for this endpoint.'
  });
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || '').trim();

    if (!action) {
      return jsonResponse_({ ok: false, error: 'Missing action.' });
    }

    if (action === 'login') {
      return jsonResponse_(login_(body.username, body.password));
    }

    const session = validateSession_(body.token);
    if (!session.ok) {
      return jsonResponse_(session);
    }

    switch (action) {
      case 'bootstrap':
        return jsonResponse_(bootstrap_(session.session));
      case 'createIncident':
        return jsonResponse_(createIncident_(body.incident || {}, session.session));
      case 'updateIncident':
        return jsonResponse_(updateIncident_(body.incident || {}, session.session));
      case 'logout':
        return jsonResponse_(logout_(body.token));
      default:
        return jsonResponse_({ ok: false, error: 'Unknown action.' });
    }
  } catch (error) {
    console.error(error);
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : 'Unexpected server error.'
    });
  }
}

function login_(username, password) {
  username = String(username || '').trim();
  password = String(password || '');

  if (!username || !password) {
    return { ok: false, error: 'Username and password are required.' };
  }

  const sheet = getSheet_(SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const index = headerIndex_(headers);

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const storedUsername = String(row[index.Username] || '');
    const active = normaliseBoolean_(row[index.Active]);

    if (storedUsername.toLowerCase() !== username.toLowerCase() || !active) {
      continue;
    }

    const salt = String(row[index.Salt] || '');
    const expectedHash = String(row[index.PasswordHash] || '');
    const actualHash = sha256Hex_(salt + password);

    if (!constantTimeEquals_(expectedHash, actualHash)) {
      return { ok: false, error: 'Invalid username or password.' };
    }

    const sessionMinutes = Number(getConfigValue_('SESSION_MINUTES') || 120);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + sessionMinutes * 60 * 1000);
    const token = createToken_();

    getSheet_(SHEETS.SESSIONS).appendRow([
      token,
      storedUsername,
      createdAt.toISOString(),
      expiresAt.toISOString(),
      true,
      createdAt.toISOString()
    ]);

    if (index.LastLogin !== undefined) {
      sheet.getRange(i + 2, index.LastLogin + 1).setValue(createdAt.toISOString());
    }

    return {
      ok: true,
      token: token,
      expiresAt: expiresAt.toISOString(),
      user: {
        username: storedUsername,
        displayName: String(row[index.DisplayName] || storedUsername),
        role: String(row[index.Role] || 'User')
      }
    };
  }

  return { ok: false, error: 'Invalid username or password.' };
}

function validateSession_(token) {
  token = String(token || '');
  if (!token) {
    return { ok: false, authError: true, error: 'Your session has expired. Please sign in again.' };
  }

  const sheet = getSheet_(SHEETS.SESSIONS);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const index = headerIndex_(headers);
  const now = new Date();

  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];

    if (String(row[index.Token] || '') !== token) {
      continue;
    }

    const active = normaliseBoolean_(row[index.Active]);
    const expiresAt = new Date(String(row[index.ExpiresAt] || ''));

    if (!active || isNaN(expiresAt.getTime()) || expiresAt <= now) {
      if (index.Active !== undefined) {
        sheet.getRange(i + 2, index.Active + 1).setValue(false);
      }
      return { ok: false, authError: true, error: 'Your session has expired. Please sign in again.' };
    }

    if (index.LastSeenAt !== undefined) {
      sheet.getRange(i + 2, index.LastSeenAt + 1).setValue(now.toISOString());
    }

    return {
      ok: true,
      session: {
        token: token,
        username: String(row[index.Username] || ''),
        expiresAt: expiresAt.toISOString()
      }
    };
  }

  return { ok: false, authError: true, error: 'Your session has expired. Please sign in again.' };
}

function logout_(token) {
  const sheet = getSheet_(SHEETS.SESSIONS);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const index = headerIndex_(headers);

  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][index.Token] || '') === String(token || '')) {
      sheet.getRange(i + 2, index.Active + 1).setValue(false);
      break;
    }
  }

  return { ok: true };
}

function bootstrap_(session) {
  const user = getUserByUsername_(session.username);

  return {
    ok: true,
    user: user,
    incidents: getIncidents_(),
    activity: getActivity_(),
    serverTime: new Date().toISOString()
  };
}

function createIncident_(incident, session) {
  const title = String(incident.title || '').trim();
  const service = String(incident.service || '').trim();
  const priority = String(incident.priority || 'P3').trim();
  const description = String(incident.description || '').trim();
  const owner = String(incident.owner || 'Service Desk').trim();
  const usersAffected = String(incident.users || '1').trim();

  if (!title || !service || !description) {
    return { ok: false, error: 'Title, service and description are required.' };
  }

  if (['P1', 'P2', 'P3', 'P4'].indexOf(priority) === -1) {
    return { ok: false, error: 'Invalid priority.' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const nextNumber = Number(getConfigValue_('NEXT_INCIDENT_NUMBER') || 2049);
    const id = 'INC-' + nextNumber;
    setConfigValue_('NEXT_INCIDENT_NUMBER', String(nextNumber + 1));

    const now = new Date().toISOString();
    const defaults = priorityDefaults_(priority);

    getSheet_(SHEETS.INCIDENTS).appendRow([
      id,
      title,
      priority,
      'New',
      owner,
      service,
      defaults.sla,
      defaults.slaState,
      now,
      now,
      description,
      defaults.impact,
      defaults.urgency,
      usersAffected,
      session.username,
      ''
    ]);

    appendActivity_(id, session.username, 'Incident created', 'Incident created');

    const created = getIncidentById_(id);
    return { ok: true, incident: created };
  } finally {
    lock.releaseLock();
  }
}

function updateIncident_(incident, session) {
  const id = String(incident.id || '').trim();
  if (!id) {
    return { ok: false, error: 'Incident ID is required.' };
  }

  const sheet = getSheet_(SHEETS.INCIDENTS);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const index = headerIndex_(headers);

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (String(row[index.IncidentID] || '') !== id) {
      continue;
    }

    const oldStatus = String(row[index.Status] || '');
    const now = new Date().toISOString();

    if (incident.status !== undefined) {
      const status = String(incident.status);
      if (['New', 'Investigating', 'Monitoring', 'Resolved'].indexOf(status) === -1) {
        return { ok: false, error: 'Invalid status.' };
      }
      sheet.getRange(i + 2, index.Status + 1).setValue(status);

      if (status === 'Resolved') {
        sheet.getRange(i + 2, index.SLA + 1).setValue('Met');
        sheet.getRange(i + 2, index.SLAState + 1).setValue('good');
        sheet.getRange(i + 2, index.ResolvedAt + 1).setValue(now);
      } else if (oldStatus === 'Resolved' && status !== 'Resolved') {
        sheet.getRange(i + 2, index.ResolvedAt + 1).setValue('');
      }

      if (status !== oldStatus) {
        appendActivity_(id, session.username, 'Status changed', oldStatus + ' → ' + status);
      }
    }

    const editable = {
      owner: 'Owner',
      priority: 'Priority',
      service: 'Service',
      description: 'Description',
      users: 'UsersAffected'
    };

    Object.keys(editable).forEach(function(key) {
      if (incident[key] !== undefined && index[editable[key]] !== undefined) {
        sheet.getRange(i + 2, index[editable[key]] + 1).setValue(String(incident[key]));
      }
    });

    sheet.getRange(i + 2, index.UpdatedAt + 1).setValue(now);

    return { ok: true, incident: getIncidentById_(id) };
  }

  return { ok: false, error: 'Incident not found.' };
}

function getIncidents_() {
  const sheet = getSheet_(SHEETS.INCIDENTS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values.shift();
  const index = headerIndex_(headers);
  const activityMap = activityMap_();

  return values
    .filter(function(row) { return String(row[index.IncidentID] || '').trim(); })
    .map(function(row) {
      const id = String(row[index.IncidentID] || '');
      return {
        id: id,
        title: String(row[index.Title] || ''),
        priority: String(row[index.Priority] || 'P3'),
        priorityLabel: priorityLabel_(String(row[index.Priority] || 'P3')),
        status: String(row[index.Status] || 'New'),
        owner: String(row[index.Owner] || ''),
        service: String(row[index.Service] || ''),
        sla: String(row[index.SLA] || ''),
        slaState: String(row[index.SLAState] || 'good'),
        created: displayDate_(row[index.CreatedAt]),
        updated: displayDate_(row[index.UpdatedAt]),
        createdAt: stringValue_(row[index.CreatedAt]),
        updatedAt: stringValue_(row[index.UpdatedAt]),
        description: String(row[index.Description] || ''),
        impact: String(row[index.Impact] || ''),
        urgency: String(row[index.Urgency] || ''),
        users: String(row[index.UsersAffected] || ''),
        createdBy: String(row[index.CreatedBy] || ''),
        resolvedAt: stringValue_(row[index.ResolvedAt]),
        timeline: activityMap[id] || []
      };
    })
    .sort(function(a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
}

function getIncidentById_(id) {
  const incidents = getIncidents_();
  for (let i = 0; i < incidents.length; i++) {
    if (incidents[i].id === id) return incidents[i];
  }
  return null;
}

function getActivity_() {
  const sheet = getSheet_(SHEETS.ACTIVITY);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values.shift();
  const index = headerIndex_(headers);

  return values
    .filter(function(row) { return String(row[index.ActivityID] || '').trim(); })
    .map(function(row) {
      return {
        id: String(row[index.ActivityID] || ''),
        incidentId: String(row[index.IncidentID] || ''),
        timestamp: stringValue_(row[index.Timestamp]),
        username: String(row[index.Username] || ''),
        action: String(row[index.Action] || ''),
        detail: String(row[index.Detail] || '')
      };
    })
    .sort(function(a, b) { return b.timestamp.localeCompare(a.timestamp); });
}

function activityMap_() {
  const items = getActivity_();
  const map = {};

  items.forEach(function(item) {
    if (!map[item.incidentId]) map[item.incidentId] = [];
    map[item.incidentId].push([
      item.detail || item.action,
      item.username + ' · ' + displayDate_(item.timestamp)
    ]);
  });

  return map;
}

function appendActivity_(incidentId, username, action, detail) {
  const sheet = getSheet_(SHEETS.ACTIVITY);
  const id = 'ACT-' + Utilities.formatString('%06d', Math.max(1, sheet.getLastRow()));
  sheet.appendRow([
    id,
    incidentId,
    new Date().toISOString(),
    username,
    action,
    detail
  ]);
}

function getUserByUsername_(username) {
  const sheet = getSheet_(SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const index = headerIndex_(headers);

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][index.Username] || '').toLowerCase() === String(username).toLowerCase()) {
      return {
        username: String(values[i][index.Username] || ''),
        displayName: String(values[i][index.DisplayName] || username),
        role: String(values[i][index.Role] || 'User')
      };
    }
  }

  return { username: username, displayName: username, role: 'User' };
}

function getConfigValue_(key) {
  const sheet = getSheet_(SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '') === key) {
      return values[i][1];
    }
  }

  return '';
}

function setConfigValue_(key, value) {
  const sheet = getSheet_(SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '') === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }

  sheet.appendRow([key, value, '']);
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('Invalid JSON request.');
  }
}

function headerIndex_(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    map[String(header)] = index;
  });
  return map;
}

function normaliseBoolean_(value) {
  return value === true || String(value).toLowerCase() === 'true' || String(value) === '1';
}

function sha256Hex_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8
  );

  return bytes.map(function(byte) {
    const value = (byte + 256) % 256;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function constantTimeEquals_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function createToken_() {
  const source = [
    Utilities.getUuid(),
    Utilities.getUuid(),
    new Date().getTime(),
    Session.getScriptTimeZone()
  ].join('|');

  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source)
  ).replace(/=+$/g, '');
}

function priorityDefaults_(priority) {
  const map = {
    P1: { sla: '15 min', slaState: 'risk', impact: 'High', urgency: 'Critical' },
    P2: { sla: '1h 00m', slaState: 'good', impact: 'Medium', urgency: 'High' },
    P3: { sla: '4h 00m', slaState: 'good', impact: 'Low', urgency: 'Medium' },
    P4: { sla: '8h 00m', slaState: 'good', impact: 'Low', urgency: 'Low' }
  };
  return map[priority] || map.P3;
}

function priorityLabel_(priority) {
  return { P1: 'Critical', P2: 'High', P3: 'Medium', P4: 'Low' }[priority] || 'Medium';
}

function stringValue_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value.toISOString();
  }
  return String(value);
}

function displayDate_(value) {
  const raw = stringValue_(value);
  if (!raw) return '';

  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;

  return Utilities.formatDate(date, 'Asia/Kolkata', 'dd MMM, HH:mm');
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
