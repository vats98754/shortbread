import { useState, useEffect } from 'react'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')

  useEffect(() => {
    // Check backend health
    fetch('http://localhost:8000/health')
      .then(response => response.json())
      .then(data => setApiStatus(data.status))
      .catch(() => setApiStatus('offline'))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🍞 Shortbread
          </h1>
          <p className="text-gray-600">
            Share short-form videos from everywhere
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">
              Welcome to Shortbread!
            </h2>
            <p className="text-blue-600 text-sm">
              Collect and organize short videos from IG, YT, X, FB and more in one place
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              API Status: <span className={`font-semibold ${apiStatus === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                {apiStatus}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Get Started
          </button>
          <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
            Learn More
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>PWA Ready • Offline Support • Cross Platform</p>
        </div>
      </div>
    </div>
  )
}

export default App
