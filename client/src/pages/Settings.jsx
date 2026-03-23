import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSettings,
  useSaveSettings,
  useTestConnection,
  useProperties,
  usePipelines,
} from '../hooks/useSettings';
import client from '../api/client';

const cardStyle = {
  background: '#fff',
  borderRadius: 10,
  padding: '24px 28px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  marginBottom: 24,
  maxWidth: 720,
};

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 };
const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  marginBottom: 12,
  fontFamily: 'inherit',
};
const btnPrimary = {
  padding: '9px 20px',
  background: '#ff7a59',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
};
const btnSecondary = {
  padding: '9px 20px',
  background: '#f0f0f0',
  color: '#333',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
};
const sectionTitle = { fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' };

export default function Settings() {
  const qc = useQueryClient();
  const { data: settings } = useSettings();
  const save = useSaveSettings();
  const testConn = useTestConnection();
  const propertiesQuery = useProperties();
  const pipelinesQuery = usePipelines();

  const [token, setToken] = useState('');
  const [sizeProperty, setSizeProperty] = useState('');
  const [networkProperty, setNetworkProperty] = useState('');
  const [contractStartProperty, setContractStartProperty] = useState('');
  const [contractEndProperty, setContractEndProperty] = useState('');
  const [contractRenewalProperty, setContractRenewalProperty] = useState('');
  const [launchDateProperty, setLaunchDateProperty] = useState('');
  const [pricingModelProperty, setPricingModelProperty] = useState('');
  const [dealSourceProperty, setDealSourceProperty] = useState('');
  const [implementingIds, setImplementingIds] = useState([]);
  const [launchedIds, setLaunchedIds] = useState([]);
  const [aboutToImplementIds, setAboutToImplementIds] = useState([]);
  const [zoomAccountId, setZoomAccountId] = useState('');
  const [zoomClientId, setZoomClientId] = useState('');
  const [zoomClientSecret, setZoomClientSecret] = useState('');
  const [eventbriteToken, setEventbriteToken] = useState('');
  const [eventbriteOrgId, setEventbriteOrgId] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [testMsg, setTestMsg] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);
  const [properties, setProperties] = useState(null);
  const [pipelines, setPipelines] = useState(null);
  const [loadingProps, setLoadingProps] = useState(false);
  const [loadingPipes, setLoadingPipes] = useState(false);

  useEffect(() => {
    if (settings) {
      setToken(settings.hubspot_api_token || '');
      setSizeProperty(settings.size_property || '');
      setNetworkProperty(settings.network_property || '');
      setContractStartProperty(settings.contract_start_property || '');
      setContractEndProperty(settings.contract_end_property || '');
      setContractRenewalProperty(settings.contract_renewal_property || '');
      setLaunchDateProperty(settings.launch_date_property || '');
      setPricingModelProperty(settings.pricing_model_property || '');
      setDealSourceProperty(settings.deal_source_property || '');
      setImplementingIds(JSON.parse(settings.implementing_stage_ids || '[]'));
      setLaunchedIds(JSON.parse(settings.launched_stage_ids || '[]'));
      setAboutToImplementIds(JSON.parse(settings.about_to_implement_stage_ids || '[]'));
      setZoomAccountId(settings.zoom_account_id || '');
      setZoomClientId(settings.zoom_client_id || '');
      setZoomClientSecret(settings.zoom_client_secret || '');
      setEventbriteToken(settings.eventbrite_token || '');
      setEventbriteOrgId(settings.eventbrite_org_id || '');
      setAnthropicApiKey(settings.anthropic_api_key || '');
    }
  }, [settings]);

  async function handleTest() {
    setTestMsg(null);
    try {
      await testConn.mutateAsync(token);
      setTestMsg({ ok: true, text: 'Connection successful!' });
    } catch (err) {
      const d = err.response?.data;
      const text = d?.error || d?.message || err.message;
      const detail = d?.hubspot?.message || d?.hubspot?.category || '';
      setTestMsg({ ok: false, text: detail ? `${text} — ${detail}` : text });
    }
  }

  async function handleSave() {
    setSaveMsg(null);
    try {
      await save.mutateAsync({
        hubspot_api_token: token,
        size_property: sizeProperty,
        network_property: networkProperty,
        contract_start_property: contractStartProperty,
        contract_end_property: contractEndProperty,
        contract_renewal_property: contractRenewalProperty,
        launch_date_property: launchDateProperty,
        implementing_stage_ids: implementingIds,
        launched_stage_ids: launchedIds,
        about_to_implement_stage_ids: aboutToImplementIds,
        pricing_model_property: pricingModelProperty,
        deal_source_property: dealSourceProperty,
        zoom_account_id: zoomAccountId,
        zoom_client_id: zoomClientId,
        zoom_client_secret: zoomClientSecret,
        eventbrite_token: eventbriteToken,
        eventbrite_org_id: eventbriteOrgId,
        anthropic_api_key: anthropicApiKey,
      });
      setSaveMsg({ ok: true, text: 'Settings saved!' });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      setSaveMsg({ ok: false, text: err.response?.data?.error || err.message });
    }
  }

  async function handleLoadProperties() {
    setLoadingProps(true);
    try {
      const { data } = await client.get('/hubspot/properties/all');
      setProperties(data);
    } catch (err) {
      alert('Failed to load properties: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingProps(false);
    }
  }

  async function handleLoadPipelines() {
    setLoadingPipes(true);
    try {
      const { data } = await client.get('/hubspot/pipelines');
      setPipelines(data);
    } catch (err) {
      alert('Failed to load pipelines: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingPipes(false);
    }
  }

  function toggleStage(id, list, setList) {
    if (list.includes(id)) setList(list.filter((x) => x !== id));
    else setList([...list, id]);
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 24 }}>Settings</h1>

      {/* API Token */}
      <div style={cardStyle}>
        <div style={sectionTitle}>HubSpot API Token</div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Create a Private App in HubSpot (Settings → Integrations → Private Apps) with{' '}
          <strong>CRM: Deals — Read</strong> scope.
        </p>
        <label style={labelStyle}>Private App Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="pat-na1-..."
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={handleTest} disabled={testConn.isPending || !token} style={btnSecondary}>
            {testConn.isPending ? 'Testing...' : 'Test Connection'}
          </button>
          {testMsg && (
            <span style={{ fontSize: 13, color: testMsg.ok ? '#2e7d32' : '#c62828' }}>
              {testMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Size Property */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Client Size Property</div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Select the Deal property that represents client size (e.g. "Number of Employees", "Company Size").
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={handleLoadProperties} disabled={loadingProps} style={btnSecondary}>
            {loadingProps ? 'Loading...' : 'Load Properties'}
          </button>
        </div>
        {properties && (
          <>
            <label style={labelStyle}>Size Property</label>
            <select
              value={sizeProperty}
              onChange={(e) => setSizeProperty(e.target.value)}
              style={{ ...inputStyle, height: 40 }}
            >
              <option value="">— Select a property —</option>
              {properties.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} ({p.name})
                </option>
              ))}
            </select>
            <label style={labelStyle}>Network (Employers) Property</label>
            <select
              value={networkProperty}
              onChange={(e) => setNetworkProperty(e.target.value)}
              style={{ ...inputStyle, height: 40 }}
            >
              <option value="">— Select a property —</option>
              {properties.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} ({p.name})
                </option>
              ))}
            </select>
          </>
        )}
        {!properties && (sizeProperty || networkProperty) && (
          <p style={{ fontSize: 13, color: '#555' }}>
            {sizeProperty && <>Size: <strong>{sizeProperty}</strong>. </>}
            {networkProperty && <>Network: <strong>{networkProperty}</strong>. </>}
            Click "Load Properties" to change.
          </p>
        )}
      </div>

      {/* Contract Date Properties */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Contract Date Properties</div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Select the Deal properties that hold contract start and end dates. Used to populate the "Contracts Up for Renewal" section on the Dashboard.
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={handleLoadProperties} disabled={loadingProps} style={btnSecondary}>
            {loadingProps ? 'Loading...' : 'Load Properties'}
          </button>
        </div>
        {properties && (
          <>
            <label style={labelStyle}>Contract Start Date Property</label>
            <select
              value={contractStartProperty}
              onChange={(e) => setContractStartProperty(e.target.value)}
              style={{ ...inputStyle, height: 40 }}
            >
              <option value="">— Select a property —</option>
              {properties.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} ({p.name})
                </option>
              ))}
            </select>
            <label style={labelStyle}>Contract End Date Property</label>
            <select
              value={contractEndProperty}
              onChange={(e) => setContractEndProperty(e.target.value)}
              style={{ ...inputStyle, height: 40 }}
            >
              <option value="">— Select a property —</option>
              {properties.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} ({p.name})
                </option>
              ))}
            </select>
            <label style={labelStyle}>Contract Renewal Date Property</label>
            <select
              value={contractRenewalProperty}
              onChange={(e) => setContractRenewalProperty(e.target.value)}
              style={{ ...inputStyle, height: 40 }}
            >
              <option value="">— Select a property —</option>
              {properties.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} ({p.name})
                </option>
              ))}
            </select>
          </>
        )}
        {!properties && (contractStartProperty || contractEndProperty || contractRenewalProperty) && (
          <p style={{ fontSize: 13, color: '#555' }}>
            {contractStartProperty && <>Start: <strong>{contractStartProperty}</strong>. </>}
            {contractEndProperty && <>End: <strong>{contractEndProperty}</strong>. </>}
            {contractRenewalProperty && <>Renewal: <strong>{contractRenewalProperty}</strong>. </>}
            Click "Load Properties" to change.
          </p>
        )}
      </div>

      {/* Launch Date Property */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Launch Date Property</div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Select the Deal property that holds the client's go-live / launch date. This populates the "Launched in Period" table on the Dashboard.
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={handleLoadProperties} disabled={loadingProps} style={btnSecondary}>
            {loadingProps ? 'Loading...' : 'Load Properties'}
          </button>
        </div>
        {properties && (
          <>
            <label style={labelStyle}>Launch Date Property</label>
            <select
              value={launchDateProperty}
              onChange={(e) => setLaunchDateProperty(e.target.value)}
              style={{ ...inputStyle, height: 40 }}
            >
              <option value="">— Select a property —</option>
              {properties.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} ({p.name})
                </option>
              ))}
            </select>
          </>
        )}
        {!properties && launchDateProperty && (
          <p style={{ fontSize: 13, color: '#555' }}>
            Currently set to: <strong>{launchDateProperty}</strong>. Click "Load Properties" to change.
          </p>
        )}
      </div>

      {/* Pricing Model & Deal Source Properties */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Pricing Model & Deal Source Properties</div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Select the Deal properties for Pricing Model and Deal Source. These will appear as columns in all dashboard tables.
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={handleLoadProperties} disabled={loadingProps} style={btnSecondary}>
            {loadingProps ? 'Loading...' : 'Load Properties'}
          </button>
        </div>
        {properties && (
          <>
            <label style={labelStyle}>Pricing Model Property</label>
            <select
              value={pricingModelProperty}
              onChange={(e) => setPricingModelProperty(e.target.value)}
              style={{ ...inputStyle, height: 40 }}
            >
              <option value="">— Select a property —</option>
              {properties.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} ({p.name})
                </option>
              ))}
            </select>
            <label style={labelStyle}>Deal Source Property</label>
            <select
              value={dealSourceProperty}
              onChange={(e) => setDealSourceProperty(e.target.value)}
              style={{ ...inputStyle, height: 40 }}
            >
              <option value="">— Select a property —</option>
              {properties.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} ({p.name})
                </option>
              ))}
            </select>
          </>
        )}
        {!properties && (pricingModelProperty || dealSourceProperty) && (
          <p style={{ fontSize: 13, color: '#555' }}>
            {pricingModelProperty && <>Pricing Model: <strong>{pricingModelProperty}</strong>. </>}
            {dealSourceProperty && <>Deal Source: <strong>{dealSourceProperty}</strong>. </>}
            Click "Load Properties" to change.
          </p>
        )}
      </div>

      {/* Pipeline Stages */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Pipeline Stages</div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Mark which deal stages represent "About to Implement" (Survey Sent / Survey Completed), "Implementing", and "Launched".
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={handleLoadPipelines} disabled={loadingPipes} style={btnSecondary}>
            {loadingPipes ? 'Loading...' : 'Load Pipelines'}
          </button>
        </div>

        {pipelines && pipelines.map((pipeline) => (
          <div key={pipeline.id} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 8 }}>
              {pipeline.label}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={stageThStyle}>Stage</th>
                  <th style={stageThStyle}>About to Implement</th>
                  <th style={stageThStyle}>Implementing</th>
                  <th style={stageThStyle}>Launched</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.stages.map((stage) => (
                  <tr key={stage.id}>
                    <td style={stageTdStyle}>{stage.label}</td>
                    <td style={{ ...stageTdStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={aboutToImplementIds.includes(stage.id)}
                        onChange={() => toggleStage(stage.id, aboutToImplementIds, setAboutToImplementIds)}
                      />
                    </td>
                    <td style={{ ...stageTdStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={implementingIds.includes(stage.id)}
                        onChange={() => toggleStage(stage.id, implementingIds, setImplementingIds)}
                      />
                    </td>
                    <td style={{ ...stageTdStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={launchedIds.includes(stage.id)}
                        onChange={() => toggleStage(stage.id, launchedIds, setLaunchedIds)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {!pipelines && (aboutToImplementIds.length > 0 || implementingIds.length > 0 || launchedIds.length > 0) && (
          <p style={{ fontSize: 13, color: '#555' }}>
            About to Implement stages: {aboutToImplementIds.length} selected.{' '}
            Implementing stages: {implementingIds.length} selected.{' '}
            Launched stages: {launchedIds.length} selected.{' '}
            Click "Load Pipelines" to review or change.
          </p>
        )}
      </div>

      {/* Zoom */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Zoom Integration</div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Create a Server-to-Server OAuth app in the Zoom Marketplace (Account credentials grant type).
          Requires <strong>Webinar:Read</strong> scope.
        </p>
        <label style={labelStyle}>Account ID</label>
        <input value={zoomAccountId} onChange={e => setZoomAccountId(e.target.value)} placeholder="abc123..." style={inputStyle} />
        <label style={labelStyle}>Client ID</label>
        <input value={zoomClientId} onChange={e => setZoomClientId(e.target.value)} placeholder="..." style={inputStyle} />
        <label style={labelStyle}>Client Secret</label>
        <input type="password" value={zoomClientSecret} onChange={e => setZoomClientSecret(e.target.value)} placeholder="..." style={inputStyle} />
      </div>

      {/* Eventbrite */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Eventbrite Integration</div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Get your API token from the Eventbrite developer portal. Organization ID is found in your Eventbrite account URL.
        </p>
        <label style={labelStyle}>API Token</label>
        <input type="password" value={eventbriteToken} onChange={e => setEventbriteToken(e.target.value)} placeholder="..." style={inputStyle} />
        <label style={labelStyle}>Organization ID</label>
        <input value={eventbriteOrgId} onChange={e => setEventbriteOrgId(e.target.value)} placeholder="12345678" style={inputStyle} />
      </div>

      {/* Anthropic */}
      <div style={cardStyle}>
        <div style={sectionTitle}>AI Analysis (Anthropic)</div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Used to generate engagement analysis on the Webinar Comparison page. Get a key from console.anthropic.com.
        </p>
        <label style={labelStyle}>Anthropic API Key</label>
        <input type="password" value={anthropicApiKey} onChange={e => setAnthropicApiKey(e.target.value)} placeholder="sk-ant-..." style={inputStyle} />
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', maxWidth: 720 }}>
        <button onClick={handleSave} disabled={save.isPending} style={btnPrimary}>
          {save.isPending ? 'Saving...' : 'Save Settings'}
        </button>
        {saveMsg && (
          <span style={{ fontSize: 13, color: saveMsg.ok ? '#2e7d32' : '#c62828' }}>
            {saveMsg.text}
          </span>
        )}
      </div>
    </div>
  );
}

const stageThStyle = {
  textAlign: 'left',
  padding: '6px 10px',
  borderBottom: '2px solid #eee',
  color: '#555',
  fontWeight: 600,
  fontSize: 12,
};
const stageTdStyle = {
  padding: '6px 10px',
  borderBottom: '1px solid #f0f0f0',
};
