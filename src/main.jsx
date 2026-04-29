import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { QuestProvider } from '@questlabs/react-sdk';
import '@questlabs/react-sdk/dist/style.css';

createRoot(document.getElementById('root')).render(
<StrictMode>
    <QuestProvider
      apiKey="YOUR_API_KEY"
      entityId="YOUR_ENTITY_ID"
      apiType="STAGING"
    >
      <App />
    </QuestProvider>
</StrictMode>
);
