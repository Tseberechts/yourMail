import { useState, useEffect } from 'react'

function App() {
    const [ipcMessage, setIpcMessage] = useState('')

    useEffect(() => {
        // Listen for messages from the Main process
        // @ts-ignore (we will fix types later)
        window.ipcRenderer.on('main-process-message', (_event, message) => {
            setIpcMessage(message)
        })
    }, [])

    const handlePing = async () => {
        // @ts-ignore
        const response = await window.ipcRenderer.ping()
        alert(response)
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Welcome to YourMail</h1>
            <p>
                <strong>Status:</strong> System Online
            </p>
            <p>
                <strong>Message from Main Process:</strong> {ipcMessage || 'Waiting...'}
            </p>

            <button onClick={handlePing} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                Test IPC Communication (Ping)
            </button>

            <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
                <h3>Next Steps:</h3>
                <ul>
                    <li>Install Tailwind CSS</li>
                    <li>Build the Sidebar Layout</li>
                    <li>Connect Accounts</li>
                </ul>
            </div>
        </div>
    )
}

export default App