import { calculateImpactScores, getImpactColor } from './impactCalc.js';

document.addEventListener("DOMContentLoaded", () => {
    const folderPathInput = document.getElementById('folderPath');
    const analyzeButton = document.getElementById('analyzeButton');
    const canvas = document.getElementById('dependencyCanvas');
    const context = canvas.getContext("2d");
    const jsonView = document.getElementById('jsonView');
    const searchFileInput = document.getElementById('searchFile');
    const searchButton = document.getElementById('searchButton');
    const circularDependenciesText = document.getElementById('circularDependencies');
    const highlightCircularButton = document.getElementById('highlightCircularButton');
    const keyFilesText = document.getElementById('keyFiles');
    const numFilesText = document.getElementById('numFiles');
    const impactToggle = document.getElementById("impactToggle");

    let lastDependencyGraph = {};
    let positions = {};
    let highlightedNode = null;
    let connectedNodes = [];
    let circularDependencies = [];
    let keyFiles = [];
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let startX, startY;
    let isCircularHighlightActive = false;
    let showImpactAnalysis = false;
    let impactScores = {};

    // Analyze button click
    analyzeButton.addEventListener('click', async () => {
        const folderPath = folderPathInput.value;
        if (!folderPath) {
            alert("Please provide the root folder path.");
            return;
        }
        try {
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
            lastDependencyGraph = result.dependencyGraph;
            renderDependencyGraph(lastDependencyGraph);

            // Display JSON
            jsonView.textContent = JSON.stringify(lastDependencyGraph, null, 2);

            // Circular dependencies information
            if (result.hasCycles) {
                circularDependencies = result.cycleNodes || []; // Set circular dependencies
                circularDependenciesText.textContent = `True: ${circularDependencies.join(', ')}`;
                highlightCircularButton.style.display = 'inline';
            } else {
                circularDependenciesText.textContent = "False";
                highlightCircularButton.style.display = 'none';
            }

            // Calculate impact scores
            impactScores = calculateImpactScores(lastDependencyGraph);

            // Key files
            const fileConnections = Object.keys(lastDependencyGraph).reduce((acc, file) => {
                const connections = lastDependencyGraph[file].length;
                acc[file] = connections;
                lastDependencyGraph[file].forEach(dep => {
                    acc[dep] = (acc[dep] || 0) + 1;
                });
                return acc;
            }, {});

            const maxConnections = Math.max(...Object.values(fileConnections));
            keyFiles = Object.keys(fileConnections).filter(file => fileConnections[file] === maxConnections);
            keyFilesText.textContent = keyFiles.join(', ');

            // Number of files
            numFilesText.textContent = Object.keys(lastDependencyGraph).length;
        } catch (error) {
            alert(error.message);
        }
    });

    // Toggle Impact Analysis
    impactToggle.addEventListener("change", () => {
        showImpactAnalysis = impactToggle.checked;
        renderDependencyGraph(lastDependencyGraph);
    });

    // Search button click
    searchButton.addEventListener('click', () => {
        const searchFile = searchFileInput.value.trim();
        if (searchFile && lastDependencyGraph[searchFile]) {
            highlightedNode = searchFile;
            connectedNodes = [...lastDependencyGraph[searchFile], searchFile];
            renderDependencyGraph(lastDependencyGraph, true);
        } else {
            alert("File not found in the dependency graph.");
        }
    });

    // Highlight circular dependencies
    highlightCircularButton.addEventListener('click', () => {
        if (circularDependencies.length > 0) {
            highlightedNode = null;
            connectedNodes = circularDependencies;
            isCircularHighlightActive = true;
            renderDependencyGraph(lastDependencyGraph);
        } else {
            alert("No circular dependencies found.");
        }
    });

    // Panning and zooming functionality
    canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        const zoomIntensity = 0.1;
        scale += event.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        scale = Math.min(Math.max(0.5, scale), 3);
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

    // Click-to-highlight functionality
    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left - offsetX) / scale;
        const y = (event.clientY - rect.top - offsetY) / scale;

        highlightedNode = null;
        connectedNodes = [];
        Object.keys(positions).forEach(node => {
            const { x: nodeX, y: nodeY } = positions[node];
            const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
            if (distance <= 30) {
                highlightedNode = node;

                if (lastDependencyGraph[node]) {
                    connectedNodes = [...lastDependencyGraph[node], node];
                } else {
                    connectedNodes = [node];
                    Object.keys(lastDependencyGraph).forEach(internalNode => {
                        if (lastDependencyGraph[internalNode].includes(node)) {
                            connectedNodes.push(internalNode);
                        }
                    });
                }
            }
        });

        isCircularHighlightActive = false;
        renderDependencyGraph(lastDependencyGraph);
    });

    function renderDependencyGraph(dependencyGraph, isSearchHighlight = false) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.translate(offsetX, offsetY);
        context.scale(scale, scale);

        const nodes = Object.keys(dependencyGraph);
        const nodeRadius = 30;

        if (Object.keys(positions).length === 0) {
            initializePositions(dependencyGraph);
        }

        // Draw edges with conditional highlighting
        nodes.forEach((node) => {
            const { x: nodeX, y: nodeY } = positions[node];
            dependencyGraph[node].forEach((dep) => {
                const { x: depX, y: depY } = positions[dep];
                
                // Highlight edge if both nodes are connected
                const isHighlightedEdge = connectedNodes.includes(node) && connectedNodes.includes(dep);
                context.strokeStyle = isHighlightedEdge ? "#f39c12" : "#ccc";
                context.lineWidth = isHighlightedEdge ? 2 : 1.5;

                context.beginPath();
                context.moveTo(nodeX, nodeY);
                context.lineTo(depX, depY);
                context.stroke();
            });
        });

        // Draw nodes with optional impact analysis coloring
        nodes.concat(Object.keys(positions).filter(node => !nodes.includes(node))).forEach((node) => {
            const { x, y } = positions[node];
            const isHighlighted = (highlightedNode === node) || connectedNodes.includes(node);
            const isCircularNode = isCircularHighlightActive && circularDependencies.includes(node);

            // Determine fill color based on impact score if impact analysis is enabled
            let fillColor = nodes.includes(node) ? "#61bffc" : "#ff9999";
            if (showImpactAnalysis && impactScores[node] !== undefined) {
                fillColor = getImpactColor(impactScores[node]); // Use impact color
            }

            context.beginPath();
            context.arc(x, y, nodeRadius, 0, Math.PI * 2, false);
            context.fillStyle = isCircularNode ? "#D8BFD8" // Light purple for circular dependency
                             : isHighlighted ? (isSearchHighlight && node === highlightedNode ? "red" : "#f39c12") // Red for searched node, yellow for other highlights
                             : fillColor;
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "#333";
            context.stroke();

            // Draw node name and impact score if impact analysis is enabled
            context.font = "12px Arial";
            context.fillStyle = "#000";
            context.textAlign = "center";
            context.fillText(node, x, y + 4);
            if (showImpactAnalysis && impactScores[node] !== undefined) {
                context.fillText(`Impact: ${impactScores[node]}`, x, y + 18); // Display impact score below the node name
            }
        });

        context.restore();
    }

    function initializePositions(dependencyGraph) {
        const nodes = Object.keys(dependencyGraph);
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
});
