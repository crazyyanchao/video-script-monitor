import React from 'react'
import ReactDOM from 'react-dom/client'
import VideoMonitor from './components/VideoMonitor'
import { NotificationContainer } from './components/Notification'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div>
      <VideoMonitor />
      <NotificationContainer />
    </div>
  </React.StrictMode>,
)