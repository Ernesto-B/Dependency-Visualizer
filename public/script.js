document.addEventListener("DOMContentLoaded", () => {
    const folderPathInput = document.getElementById('folderPath');
    const fileTypeInput = document.getElementById('fileType');
    const analyzeButton = document.getElementById('analyzeButton');
    const dependencyGraphContainer = document.getElementById('dependencyGraphContainer');
    const canvas = document.getElementById('dependencyCanvas');
    const context = canvas.getContext("2d");
    const jsonView = document.getElementById('jsonView');
    const graphMessage = document.getElementById('graphMessage');

    analyzeButton.addEventListener('click', async () => {
        const folderPath = folderPathInput.value;
        const fileType = fileTypeInput.value;

        if (!folderPath || !fileType) {
            alert("Please provide both folder path and file type.");
            return;
        }

        graphMessage.style.display = 'none';

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
            jsonView.textContent = JSON.stringify(dependencyGraph, null, 2);
            graphMessage.style.display = 'block';

            renderDependencyGraph(dependencyGraph);
        } catch (error) {
            graphMessage.textContent = error.message;
            graphMessage.style.display = 'block';
        }
    });

    function renderDependencyGraph(dependencyGraph) {
        const canvas = document.getElementById('dependencyCanvas');
        const context = canvas.getContext("2d");
        
        // Clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
    
        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;
        const positions = {}; // Store positions of nodes
        const spacing = 150; // Space between nodes
    
        // Draw nodes
        nodes.forEach((node, index) => {
            const x = (index % 5) * spacing + 100;
            const y = Math.floor(index / 5) * spacing + 100;
            positions[node] = { x, y };
    
            // Draw the circle for each node
            context.beginPath();
            context.arc(x, y, nodeRadius, 0, Math.PI * 2, false);
            context.fillStyle = "#61bffc";
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "#333";
            context.stroke();
    
            // Add text for the node label
            context.font = "12px Arial";
            context.fillStyle = "#000";
            context.textAlign = "center";
            context.fillText(node, x, y + 4);
        });
    
        // Draw edges and add placeholder nodes for missing dependencies
        nodes.forEach((node) => {
            const dependencies = dependencyGraph[node];
            dependencies.forEach((dep) => {
                if (!positions[dep]) {
                    // Add placeholder node for missing dependency
                    const placeholderX = Math.random() * (canvas.width - 2 * nodeRadius) + nodeRadius;
                    const placeholderY = Math.random() * (canvas.height - 2 * nodeRadius) + nodeRadius;
                    positions[dep] = { x: placeholderX, y: placeholderY };
                    
                    // Draw the placeholder node
                    context.beginPath();
                    context.arc(placeholderX, placeholderY, nodeRadius, 0, Math.PI * 2, false);
                    context.fillStyle = "#ff9999"; // Different color for external dependencies
                    context.fill();
                    context.lineWidth = 2;
                    context.strokeStyle = "#333";
                    context.stroke();
    
                    // Label the placeholder node
                    context.font = "12px Arial";
                    context.fillStyle = "#000";
                    context.textAlign = "center";
                    context.fillText(dep, placeholderX, placeholderY + 4);
                }
    
                // Draw line between nodes
                const { x: x1, y: y1 } = positions[node];
                const { x: x2, y: y2 } = positions[dep];
    
                context.beginPath();
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
                context.strokeStyle = "#ccc";
                context.lineWidth = 1.5;
                context.stroke();
    
                // Draw arrowhead
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const arrowSize = 8;
                
                // Reset path for arrowhead
                context.beginPath();
                context.moveTo(x2, y2);
                context.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
                context.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
                context.lineTo(x2, y2);
                context.fillStyle = "#ccc";
                context.fill();
            });
        });
    }
    
    
    
});
