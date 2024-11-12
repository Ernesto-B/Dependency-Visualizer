document.addEventListener("DOMContentLoaded", () => {
    const folderPathInput = document.getElementById('folderPath');
    const fileTypeInput = document.getElementById('fileType');
    const analyzeButton = document.getElementById('analyzeButton');
    const canvas = document.getElementById('dependencyCanvas');
    const context = canvas.getContext("2d");
    const jsonView = document.getElementById('jsonView');

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let startX, startY;
    let positions = {};
    let highlightedNode = null; // Store the currently selected node for highlighting

    canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        const zoomIntensity = 0.1;
        scale += event.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        scale = Math.min(Math.max(0.1, scale), 3);
        renderDependencyGraph(lastDependencyGraph);
    });

    canvas.addEventListener("mousedown", (event) => {
        isPanning = true;
        startX = event.clientX - offsetX;
        startY = event.clientY - offsetY;
    });

    canvas.addEventListener("mousemove", (event) => {
        if (isPanning) {
            offsetX = event.clientX - startX;
            offsetY = event.clientY - startY;
            renderDependencyGraph(lastDependencyGraph);
        }
    });

    canvas.addEventListener("mouseup", () => {
        isPanning = false;
    });

    canvas.addEventListener("mouseleave", () => {
        isPanning = false;
    });

    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left - offsetX) / scale;
        const y = (event.clientY - rect.top - offsetY) / scale;

        // Check if a node was clicked
        highlightedNode = null; // Reset the highlighted node on each click
        Object.keys(positions).forEach(node => {
            const { x: nodeX, y: nodeY } = positions[node];
            const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
            if (distance <= 30) { // 30 is the radius of each node
                highlightedNode = node;
            }
        });

        renderDependencyGraph(lastDependencyGraph); // Re-render with highlighting
    });

    analyzeButton.addEventListener('click', async () => {
        const folderPath = folderPathInput.value;

        if (!folderPath) {
            alert("Please provide the root folder path.");
            return;
        }

        try {
            positions = {};
            scale = 1;
            offsetX = 0;
            offsetY = 0;
            context.clearRect(0, 0, canvas.width, canvas.height);

            const response = await fetch('http://localhost:3000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ folderPath })
            });

            if (!response.ok) {
                throw new Error("Failed to connect to the server.");
            }

            const result = await response.json();
            const dependencyGraph = result.dependencyGraph;
            jsonView.textContent = JSON.stringify(dependencyGraph, null, 2);

            lastDependencyGraph = dependencyGraph;
            initializePositions(dependencyGraph);
            renderDependencyGraph(dependencyGraph);
        } catch (error) {
            alert(error.message);
        }
    });

    let lastDependencyGraph = {}; 

    function initializePositions(dependencyGraph) {
        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;
        const spacing = 150;
        positions = {};

        nodes.forEach((node, index) => {
            const x = (index % 5) * spacing + 100;
            const y = Math.floor(index / 5) * spacing + 100;
            positions[node] = { x, y };
        });

        let angle = 0;
        const radius = Math.min(canvas.width, canvas.height) / 2 + 100;
        const externalDependencies = new Set();

        nodes.forEach((node) => {
            dependencyGraph[node].forEach((dep) => {
                if (!nodes.includes(dep)) {
                    externalDependencies.add(dep);
                }
            });
        });

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        externalDependencies.forEach((dep) => {
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            positions[dep] = { x, y };
            angle += (2 * Math.PI) / externalDependencies.size;
        });
    }

    function renderDependencyGraph(dependencyGraph) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.translate(offsetX, offsetY);
        context.scale(scale, scale);
    
        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;
    
        // Determine children and parents for both internal and external nodes
        const highlightedChildren = highlightedNode && dependencyGraph[highlightedNode] ? dependencyGraph[highlightedNode] : [];
        const highlightedParents = [];
        
        if (highlightedNode) {
            nodes.forEach((node) => {
                if (dependencyGraph[node].includes(highlightedNode)) {
                    highlightedParents.push(node);
                }
            });
        }
    
        // Draw all edges first in normal color
        context.strokeStyle = "#ccc";
        context.lineWidth = 1.5;
        nodes.forEach((node) => {
            const { x: nodeX, y: nodeY } = positions[node];
            dependencyGraph[node].forEach((dep) => {
                const { x: depX, y: depY } = positions[dep];
                context.beginPath();
                context.moveTo(nodeX, nodeY);
                context.lineTo(depX, depY);
                context.stroke();
            });
        });
    
        // Highlight edges connected to the selected node
        if (highlightedNode) {
            context.strokeStyle = "#f39c12"; // Highlight color for connected edges
            context.lineWidth = 2;
            
            highlightedChildren.forEach((child) => {
                const { x: childX, y: childY } = positions[child];
                const { x: nodeX, y: nodeY } = positions[highlightedNode];
                context.beginPath();
                context.moveTo(nodeX, nodeY);
                context.lineTo(childX, childY);
                context.stroke();
            });
    
            highlightedParents.forEach((parent) => {
                const { x: parentX, y: parentY } = positions[parent];
                const { x: nodeX, y: nodeY } = positions[highlightedNode];
                context.beginPath();
                context.moveTo(parentX, parentY);
                context.lineTo(nodeX, nodeY);
                context.stroke();
            });
        }
    
        // Draw nodes with highlighted ones in different colors
        nodes.concat(Array.from(new Set(Object.keys(positions).filter(node => !nodes.includes(node))))).forEach((node) => {
            const { x, y } = positions[node];
            const isHighlighted = node === highlightedNode || highlightedChildren.includes(node) || highlightedParents.includes(node);
    
            context.beginPath();
            context.arc(x, y, nodeRadius, 0, Math.PI * 2, false);
            context.fillStyle = isHighlighted ? "#f39c12" : (nodes.includes(node) ? "#61bffc" : "#ff9999");
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "#333";
            context.stroke();
    
            context.font = "12px Arial";
            context.fillStyle = "#000";
            context.textAlign = "center";
            context.fillText(node, x, y + 4);
        });
    
        context.restore();
    }
});
