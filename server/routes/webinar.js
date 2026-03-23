const router = require('express').Router();
const db = require('../db');
const axios = require('axios');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? row.value : null;
}

function getQuarterInfo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const quarter = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4';
  return { quarter, year };
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────

let zoomTokenCache = null;

async function getZoomToken() {
  const accountId = getSetting('zoom_account_id');
  const clientId = getSetting('zoom_client_id');
  const clientSecret = getSetting('zoom_client_secret');
  if (!accountId || !clientId || !clientSecret) throw new Error('Zoom credentials not configured');

  if (zoomTokenCache && zoomTokenCache.expiresAt > Date.now() + 30000) {
    return zoomTokenCache.token;
  }

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    null,
    { headers: { Authorization: `Basic ${creds}` } }
  );

  zoomTokenCache = {
    token: res.data.access_token,
    expiresAt: Date.now() + res.data.expires_in * 1000,
  };
  return zoomTokenCache.token;
}

async function fetchZoomWebinarList(token) {
  const webinars = [];
  let nextPageToken = null;
  do {
    const params = { page_size: 300, type: 'past' };
    if (nextPageToken) params.next_page_token = nextPageToken;
    const res = await axios.get('https://api.zoom.us/v2/users/me/webinars', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    webinars.push(...(res.data.webinars || []));
    nextPageToken = res.data.next_page_token || null;
  } while (nextPageToken);
  return webinars;
}

async function fetchZoomParticipants(token, webinarId) {
  const participants = [];
  let nextPageToken = null;
  do {
    const params = { page_size: 300 };
    if (nextPageToken) params.next_page_token = nextPageToken;
    try {
      const res = await axios.get(`https://api.zoom.us/v2/past_webinars/${webinarId}/participants`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      participants.push(...(res.data.participants || []));
      nextPageToken = res.data.next_page_token || null;
    } catch {
      break;
    }
  } while (nextPageToken);
  return participants;
}

router.post('/sync/zoom', async (req, res) => {
  try {
    const token = await getZoomToken();
    const webinars = await fetchZoomWebinarList(token);

    const upsertWebinar = db.prepare(`
      INSERT INTO zoom_webinars (webinar_id, topic, start_time, quarter, year, synced_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(webinar_id) DO UPDATE SET
        topic=excluded.topic, start_time=excluded.start_time,
        quarter=excluded.quarter, year=excluded.year, synced_at=excluded.synced_at
    `);

    const upsertAttendee = db.prepare(`
      INSERT OR IGNORE INTO zoom_attendees (webinar_id, name, email, join_time, duration)
      VALUES (?, ?, ?, ?, ?)
    `);

    let attendeeCount = 0;
    const now = new Date().toISOString();

    for (const w of webinars) {
      const qi = getQuarterInfo(w.start_time);
      if (!qi) continue;
      upsertWebinar.run(String(w.id), w.topic || '', w.start_time || '', qi.quarter, qi.year, now);

      const participants = await fetchZoomParticipants(token, w.id);
      for (const p of participants) {
        const email = (p.user_email || '').toLowerCase().trim();
        if (email) {
          upsertAttendee.run(String(w.id), p.name || '', email, p.join_time || null, p.duration || 0);
          attendeeCount++;
        }
      }
    }

    res.json({ ok: true, webinars: webinars.length, attendees: attendeeCount });
  } catch (err) {
    console.error('Zoom sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Eventbrite ───────────────────────────────────────────────────────────────

router.post('/sync/eventbrite', async (req, res) => {
  try {
    const ebToken = getSetting('eventbrite_token');
    const orgId = getSetting('eventbrite_org_id');
    if (!ebToken || !orgId) return res.status(400).json({ error: 'Eventbrite credentials not configured' });

    const events = [];
    let continuation = null;
    do {
      const params = { token: ebToken, page_size: 50, status: 'all' };
      if (continuation) params.continuation = continuation;
      const r = await axios.get(`https://www.eventbriteapi.com/v3/organizations/${orgId}/events/`, { params });
      events.push(...(r.data.events || []));
      continuation = r.data.pagination?.has_more_items ? r.data.pagination.continuation : null;
    } while (continuation);

    const upsertEvent = db.prepare(`
      INSERT INTO eventbrite_events (event_id, name, start_time, quarter, year, synced_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET
        name=excluded.name, start_time=excluded.start_time,
        quarter=excluded.quarter, year=excluded.year, synced_at=excluded.synced_at
    `);

    const upsertAttendee = db.prepare(`
      INSERT OR IGNORE INTO eventbrite_attendees (event_id, attendee_id, name, email, order_date)
      VALUES (?, ?, ?, ?, ?)
    `);

    let attendeeCount = 0;
    const now = new Date().toISOString();

    for (const ev of events) {
      const qi = getQuarterInfo(ev.start?.utc);
      if (!qi) continue;
      const evName = ev.name?.text || ev.name?.html || '';
      upsertEvent.run(ev.id, evName, ev.start?.utc || '', qi.quarter, qi.year, now);

      let page = 1;
      while (true) {
        try {
          const ar = await axios.get(`https://www.eventbriteapi.com/v3/events/${ev.id}/attendees/`, {
            params: { token: ebToken, page },
          });
          for (const a of ar.data.attendees || []) {
            const profile = a.profile || {};
            const email = (profile.email || '').toLowerCase().trim();
            const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
            if (email) {
              try { upsertAttendee.run(ev.id, a.id, name, email, a.created || null); attendeeCount++; } catch { /* dup */ }
            }
          }
          if (!ar.data.pagination?.has_more_items) break;
          page++;
        } catch { break; }
      }
    }

    res.json({ ok: true, events: events.length, attendees: attendeeCount });
  } catch (err) {
    console.error('Eventbrite sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Enrich contact emails from HubSpot ───────────────────────────────────────

router.post('/enrich', async (req, res) => {
  try {
    const token = getSetting('hubspot_api_token');
    if (!token) return res.status(400).json({ error: 'HubSpot API token not configured' });

    // Get deals that don't have a contact email yet
    const deals = db.prepare('SELECT id FROM deals WHERE contact_email IS NULL OR contact_email = ""').all();
    if (deals.length === 0) return res.json({ ok: true, enriched: 0 });

    const dealIds = deals.map(d => d.id);
    const BATCH = 100;
    let enriched = 0;

    for (let i = 0; i < dealIds.length; i += BATCH) {
      const batch = dealIds.slice(i, i + BATCH);
      try {
        // Batch read contact associations for these deals
        const assocRes = await axios.post(
          'https://api.hubapi.com/crm/v3/associations/deal/contact/batch/read',
          { inputs: batch.map(id => ({ id })) },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );

        const assocResults = assocRes.data.results || [];
        const contactIdToDeal = {};
        for (const r of assocResults) {
          const dealId = r.from?.id;
          const contactId = r.to?.[0]?.id;
          if (dealId && contactId) contactIdToDeal[contactId] = dealId;
        }

        const contactIds = Object.keys(contactIdToDeal);
        if (contactIds.length === 0) continue;

        // Batch read contact emails
        const contactRes = await axios.post(
          'https://api.hubapi.com/crm/v3/objects/contacts/batch/read',
          { properties: ['email'], inputs: contactIds.map(id => ({ id })) },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );

        const updateEmail = db.prepare('UPDATE deals SET contact_email=? WHERE id=?');
        for (const c of contactRes.data.results || []) {
          const email = (c.properties?.email || '').toLowerCase().trim();
          const dealId = contactIdToDeal[c.id];
          if (email && dealId) {
            updateEmail.run(email, dealId);
            enriched++;
          }
        }
      } catch (err) {
        console.warn('Enrichment batch error:', err.message);
      }
    }

    res.json({ ok: true, enriched });
  } catch (err) {
    console.error('Enrich error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Compare ──────────────────────────────────────────────────────────────────

function buildCompareData(quarter, year) {
  const y = parseInt(year);

  let clients = db.prepare(
    'SELECT id, name, launched_at, size_value, contact_email FROM deals WHERE launched_at IS NOT NULL ORDER BY launched_at'
  ).all();

  clients = clients.filter(c => {
    const qi = getQuarterInfo(c.launched_at);
    return qi && qi.quarter === quarter && qi.year === y;
  });

  const zoomWebinars = db.prepare(
    'SELECT webinar_id, topic, start_time FROM zoom_webinars WHERE quarter=? AND year=?'
  ).all(quarter, y);

  const ebEvents = db.prepare(
    'SELECT event_id, name, start_time FROM eventbrite_events WHERE quarter=? AND year=?'
  ).all(quarter, y);

  let zoomAttendees = [];
  if (zoomWebinars.length > 0) {
    const ph = zoomWebinars.map(() => '?').join(',');
    zoomAttendees = db.prepare(
      `SELECT za.*, zw.topic as webinar_topic FROM zoom_attendees za
       JOIN zoom_webinars zw ON za.webinar_id=zw.webinar_id
       WHERE za.webinar_id IN (${ph})`
    ).all(...zoomWebinars.map(w => w.webinar_id));
  }

  let ebAttendees = [];
  if (ebEvents.length > 0) {
    const ph = ebEvents.map(() => '?').join(',');
    ebAttendees = db.prepare(
      `SELECT ea.*, ee.name as event_name FROM eventbrite_attendees ea
       JOIN eventbrite_events ee ON ea.event_id=ee.event_id
       WHERE ea.event_id IN (${ph})`
    ).all(...ebEvents.map(e => e.event_id));
  }

  const zoomEmailSet = new Set(zoomAttendees.map(a => a.email));
  const ebEmailSet = new Set(ebAttendees.map(a => a.email));

  // Name-based fallback: tokenize deal name and look for word overlap
  function nameMatch(dealName, attendees) {
    const words = dealName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    if (words.length === 0) return [];
    return attendees.filter(a => {
      const an = a.name.toLowerCase();
      return words.some(w => an.includes(w));
    });
  }

  const enriched = clients.map(client => {
    const email = (client.contact_email || '').trim();
    const zoomMatches = email
      ? zoomAttendees.filter(a => a.email === email)
      : nameMatch(client.name, zoomAttendees);
    const ebMatches = email
      ? ebAttendees.filter(a => a.email === email)
      : nameMatch(client.name, ebAttendees);

    return {
      ...client,
      match_method: email ? 'email' : 'name',
      zoom_matches: zoomMatches,
      eb_matches: ebMatches,
      attended_zoom: zoomMatches.length > 0,
      attended_eb: ebMatches.length > 0,
      attended_either: zoomMatches.length > 0 || ebMatches.length > 0,
    };
  });

  const total = enriched.length;
  const attendedZoom = enriched.filter(c => c.attended_zoom).length;
  const attendedEb = enriched.filter(c => c.attended_eb).length;
  const attendedEither = enriched.filter(c => c.attended_either).length;
  const attendedBoth = enriched.filter(c => c.attended_zoom && c.attended_eb).length;

  return {
    quarter,
    year: y,
    clients: enriched,
    webinars: { zoom: zoomWebinars, eventbrite: ebEvents },
    stats: {
      total_launched: total,
      attended_zoom: attendedZoom,
      attended_eventbrite: attendedEb,
      attended_either: attendedEither,
      attended_both: attendedBoth,
      attended_none: total - attendedEither,
      zoom_rate: total > 0 ? attendedZoom / total : 0,
      eb_rate: total > 0 ? attendedEb / total : 0,
      either_rate: total > 0 ? attendedEither / total : 0,
    },
    all_zoom_attendees: zoomAttendees,
    all_eb_attendees: ebAttendees,
  };
}

router.get('/compare', (req, res) => {
  const { quarter, year } = req.query;
  if (!quarter || !year) return res.status(400).json({ error: 'quarter and year required' });
  try {
    res.json(buildCompareData(quarter, year));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Analysis (SSE) ────────────────────────────────────────────────────────

router.post('/analyze', async (req, res) => {
  const { quarter, year } = req.body;
  if (!quarter || !year) return res.status(400).json({ error: 'quarter and year required' });

  const apiKey = getSetting('anthropic_api_key');
  if (!apiKey) return res.status(400).json({ error: 'Anthropic API key not configured in Settings' });

  const data = buildCompareData(quarter, year);
  const { stats, clients, webinars } = data;

  const emailMatchCount = clients.filter(c => c.match_method === 'email').length;
  const nameMatchCount = clients.filter(c => c.match_method === 'name').length;

  const prompt = `You are an engagement analyst. Analyze the relationship between clients who launched in ${quarter} ${year} and their webinar attendance.

Summary data:
- Launched clients: ${stats.total_launched}
- Zoom webinars held: ${webinars.zoom.length} (topics: ${webinars.zoom.map(w => w.topic).join(', ') || 'none'})
- Eventbrite events held: ${webinars.eventbrite.length} (names: ${webinars.eventbrite.map(e => e.name).join(', ') || 'none'})
- Clients matched by email: ${emailMatchCount} | by name (approximate): ${nameMatchCount}
- Attended Zoom: ${stats.attended_zoom} (${(stats.zoom_rate * 100).toFixed(1)}%)
- Attended Eventbrite: ${stats.attended_eventbrite} (${(stats.eb_rate * 100).toFixed(1)}%)
- Attended either: ${stats.attended_either} (${(stats.either_rate * 100).toFixed(1)}%)
- Attended both: ${stats.attended_both}
- No webinar attendance: ${stats.attended_none}

Clients that attended webinars:
${clients.filter(c => c.attended_either).map(c => `- ${c.name}: ${c.attended_zoom ? 'Zoom' : ''}${c.attended_zoom && c.attended_eb ? ' + ' : ''}${c.attended_eb ? 'Eventbrite' : ''}`).join('\n') || 'None found'}

Please analyze:
1. Overall engagement rate and what it suggests about client health
2. Which platform (Zoom vs Eventbrite) is more effective for reaching launched clients
3. Recommendations to increase webinar participation among new launches
4. Any patterns or insights
5. Whether matching quality (email vs name-based) affects confidence in the data

Be concise, data-driven, and actionable.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey });

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

// ─── Status ───────────────────────────────────────────────────────────────────

router.get('/status', (req, res) => {
  const zoomWebinars = db.prepare('SELECT COUNT(*) as c FROM zoom_webinars').get().c;
  const zoomAttendees = db.prepare('SELECT COUNT(*) as c FROM zoom_attendees').get().c;
  const ebEvents = db.prepare('SELECT COUNT(*) as c FROM eventbrite_events').get().c;
  const ebAttendees = db.prepare('SELECT COUNT(*) as c FROM eventbrite_attendees').get().c;
  const zoomLastSync = db.prepare('SELECT MAX(synced_at) as t FROM zoom_webinars').get().t;
  const ebLastSync = db.prepare('SELECT MAX(synced_at) as t FROM eventbrite_events').get().t;
  const emailsEnriched = db.prepare('SELECT COUNT(*) as c FROM deals WHERE contact_email IS NOT NULL AND contact_email != ""').get().c;

  res.json({
    zoom: { webinars: zoomWebinars, attendees: zoomAttendees, last_synced: zoomLastSync },
    eventbrite: { events: ebEvents, attendees: ebAttendees, last_synced: ebLastSync },
    emails_enriched: emailsEnriched,
  });
});

module.exports = router;
