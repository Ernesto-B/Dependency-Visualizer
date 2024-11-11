document.addEventListener("DOMContentLoaded", () => {
    const folderPathInput = document.getElementById('folderPath');
    const fileTypeInput = document.getElementById('fileType');
    const analyzeButton = document.getElementById('analyzeButton');
    const dependencyGraphContainer = document.getElementById('dependencyGraphContainer');
    const jsonView = document.getElementById('jsonView');
    const graphMessage = document.getElementById('graphMessage');
    const toggleButton = document.getElementById('toggleJsonView');

    // Show JSON by default and hide message
    jsonView.style.display = 'block';
    graphMessage.style.display = 'none';
    toggleButton.textContent = 'Hide JSON View';

    // Toggle JSON visibility
    toggleButton.addEventListener('click', () => {
        if (jsonView.style.display === 'block') {
            jsonView.style.display = 'none';
            toggleButton.textContent = 'Show JSON View';
        } else {
            jsonView.style.display = 'block';
            toggleButton.textContent = 'Hide JSON View';
        }
    });

    // Analyze button click event
    analyzeButton.addEventListener('click', async () => {
        const folderPath = folderPathInput.value;
        const fileType = fileTypeInput.value;

        if (!folderPath || !fileType) {
            alert("Please provide both folder path and file type.");
            return;
        }

        graphMessage.style.display = 'none'; // Hide any previous message

        try {
            const response = await fetch('http://localhost:3000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ folderPath, fileType })
            });

            if (!response.ok) {
                throw new Error("Failed to connect to the server.");
            }

            const result = await response.json();
            const dependencyGraph = result.dependencyGraph;
            const hasCycles = result.hasCycles;

            // Display dependency graph in JSON view
            jsonView.textContent = JSON.stringify(dependencyGraph, null, 2);
            graphMessage.textContent = hasCycles ? "Circular Dependencies Found." : "No Circular Dependencies Found.";
            graphMessage.style.display = 'block';
        } catch (error) {
            graphMessage.textContent = error.message;
            graphMessage.style.display = 'block';
        }
    });
});
