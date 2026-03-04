const express = require('express');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/settings', require('./routes/settings'));
app.use('/api/hubspot', require('./routes/hubspot'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/renewals', require('./routes/renewals'));

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`HubSpot Dashboard server running on http://localhost:${config.port}`);
});
