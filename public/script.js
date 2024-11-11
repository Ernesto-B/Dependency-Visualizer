document.getElementById('analyzeForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const folderPath = document.getElementById('folderPath').value;
    const fileType = document.getElementById('fileType').value;
    
    try {
        const response = await fetch('http://localhost:3000/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ folderPath, fileType }),
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('dependencyGraph').textContent = JSON.stringify(data.dependencyGraph, null, 2);
            const hasCyclesText = data.hasCycles ? "Circular Dependencies Detected!" : "No Circular Dependencies Found.";
            document.getElementById('cycleMessage').textContent = hasCyclesText;
        } else {
            document.getElementById('dependencyGraph').textContent = `Error: ${data.error}`;
            document.getElementById('cycleMessage').textContent = '';
        }
    } catch (error) {
        document.getElementById('dependencyGraph').textContent = `Failed to connect to the server.`;
        document.getElementById('cycleMessage').textContent = '';
    }
});
