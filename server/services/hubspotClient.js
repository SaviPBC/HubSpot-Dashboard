const axios = require('axios');

const BASE_URL = 'https://api.hubapi.com';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildClient(token) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

async function requestWithRetry(client, config, maxRetries = 5) {
  let attempt = 0;
  while (true) {
    try {
      return await client(config);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        const retryAfter = parseInt(err.response.headers['retry-after'] || '10', 10);
        console.warn(`HubSpot rate limit hit. Retrying after ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        attempt++;
        if (attempt >= maxRetries) throw err;
      } else {
        throw err;
      }
    }
  }
}

async function getProperties(token) {
  const client = buildClient(token);
  const res = await requestWithRetry(client, {
    method: 'GET',
    url: '/crm/v3/properties/deals',
  });
  return res.data.results.map((p) => ({
    name: p.name,
    label: p.label,
    type: p.type,
    fieldType: p.fieldType,
  }));
}

async function getPipelines(token) {
  const client = buildClient(token);
  const res = await requestWithRetry(client, {
    method: 'GET',
    url: '/crm/v3/pipelines/deals',
  });
  return res.data.results.map((p) => ({
    id: p.id,
    label: p.label,
    stages: (p.stages || [])
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((s) => ({ id: s.id, label: s.label })),
  }));
}

async function fetchAllDeals(token, properties) {
  const client = buildClient(token);
  const deals = [];
  let after = undefined;

  while (true) {
    const params = {
      limit: 100,
      properties: properties.join(','),
    };
    if (after) params.after = after;

    const res = await requestWithRetry(client, {
      method: 'GET',
      url: '/crm/v3/objects/deals',
      params,
    });

    const { results, paging } = res.data;
    deals.push(...results);

    if (paging && paging.next && paging.next.after) {
      after = paging.next.after;
    } else {
      break;
    }
  }

  return deals;
}

async function searchDealsSince(token, properties, sinceMs) {
  const client = buildClient(token);
  const deals = [];
  let after = undefined;

  while (true) {
    const body = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'hs_lastmodifieddate',
              operator: 'GTE',
              value: String(sinceMs),
            },
          ],
        },
      ],
      properties,
      limit: 100,
    };
    if (after) body.after = after;

    const res = await requestWithRetry(client, {
      method: 'POST',
      url: '/crm/v3/objects/deals/search',
      data: body,
    });

    const { total, results, paging } = res.data;
    deals.push(...results);

    // Search API caps at 10,000 results — signal caller to fall back to full sync
    if (total > 10000) {
      return { deals, capped: true, total };
    }

    if (paging && paging.next && paging.next.after) {
      after = paging.next.after;
    } else {
      break;
    }
  }

  return { deals, capped: false, total: deals.length };
}

async function testConnection(token) {
  const client = buildClient(token);
  await requestWithRetry(client, {
    method: 'GET',
    url: '/crm/v3/objects/deals',
    params: { limit: 1 },
  });
}

module.exports = { getProperties, getPipelines, fetchAllDeals, searchDealsSince, testConnection };
