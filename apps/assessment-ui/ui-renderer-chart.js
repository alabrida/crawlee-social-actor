(function() {
    let currentScores = { awareness: 0, consideration: 0, decision: 0, conversion: 0, retention: 0 };

    function drawLineChart(scores) {
        currentScores = scores;
        const lineView = document.getElementById('stages-line-view');
        if (!lineView) return;

        const data = [
            { name: 'Awareness', score: parseFloat(scores.awareness || 0) },
            { name: 'Consideration', score: parseFloat(scores.consideration || 0) },
            { name: 'Decision', score: parseFloat(scores.decision || 0) },
            { name: 'Conversion', score: parseFloat(scores.conversion || 0) },
            { name: 'Retention', score: parseFloat(scores.retention || 0) }
        ];

        const width = 600;
        const height = 220;
        const paddingLeft = 50;
        const paddingRight = 30;
        const paddingTop = 20;
        const paddingBottom = 40;

        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        const getX = (index) => paddingLeft + (index * (chartWidth / 4));
        const getY = (score) => paddingTop + chartHeight - (score * (chartHeight / 10));

        let pathD = '';
        let areaD = '';

        data.forEach((d, i) => {
            const x = getX(i);
            const y = getY(d.score);
            if (i === 0) {
                pathD += `M ${x} ${y}`;
                areaD = `M ${x} ${paddingTop + chartHeight} L ${x} ${y}`;
            } else {
                const prevX = getX(i - 1);
                const prevY = getY(data[i - 1].score);
                const cpX1 = prevX + (x - prevX) / 2;
                const cpY1 = prevY;
                const cpX2 = prevX + (x - prevX) / 2;
                const cpY2 = y;
                pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y}`;
                areaD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y}`;
            }
        });
        areaD += ` L ${getX(4)} ${paddingTop + chartHeight} Z`;

        let gridLinesHtml = '';
        for (let i = 0; i <= 10; i += 2) {
            const y = getY(i);
            gridLinesHtml += `
                <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                <text x="${paddingLeft - 12}" y="${y + 4}" fill="var(--color-text-muted)" font-size="10" font-family="Outfit" text-anchor="end">${i}</text>
            `;
        }

        let pointsHtml = '';
        let labelsHtml = '';
        data.forEach((d, i) => {
            const x = getX(i);
            const y = getY(d.score);
            
            gridLinesHtml += `
                <line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${paddingTop + chartHeight}" stroke="rgba(255,255,255,0.05)" stroke-dasharray="2,2" stroke-width="1" />
            `;

            labelsHtml += `
                <text x="${x}" y="${paddingTop + chartHeight + 24}" fill="var(--color-text-muted)" font-size="10" font-family="Outfit" font-weight="500" text-anchor="middle">${d.name}</text>
            `;

            pointsHtml += `
                <g class="chart-point-group" style="cursor: pointer;">
                    <circle cx="${x}" cy="${y}" r="8" fill="rgba(32, 201, 151, 0.15)" stroke="none" />
                    <circle cx="${x}" cy="${y}" r="4" fill="var(--color-accent)" stroke="#fff" stroke-width="1.5" />
                    <title>${d.name}: ${d.score.toFixed(1)} / 10</title>
                    <text x="${x}" y="${y - 12}" fill="#fff" font-size="10" font-family="Outfit" font-weight="600" text-anchor="middle">${d.score.toFixed(1)}</text>
                </g>
            `;
        });

        const svgHtml = `
            <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.25" />
                        <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.0" />
                    </linearGradient>
                </defs>
                <g>${gridLinesHtml}</g>
                <path d="${areaD}" fill="url(#areaGrad)" />
                <path d="${pathD}" fill="none" stroke="var(--color-accent)" stroke-width="3" stroke-linecap="round" filter="url(#glow)" />
                <g>${labelsHtml}</g>
                <g>${pointsHtml}</g>
            </svg>
        `;
        lineView.innerHTML = svgHtml;
    }

    // Toggle button setup
    document.addEventListener('DOMContentLoaded', () => {
        const toggleBtn = document.getElementById('toggle-journey-chart-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const barView = document.getElementById('stages-bar-view');
                const lineView = document.getElementById('stages-line-view');
                
                if (barView && lineView) {
                    const isLineVisible = !lineView.classList.contains('hidden');
                    if (isLineVisible) {
                        lineView.classList.add('hidden');
                        barView.classList.remove('hidden');
                        toggleBtn.textContent = 'View Line Chart';
                    } else {
                        barView.classList.add('hidden');
                        lineView.classList.remove('hidden');
                        toggleBtn.textContent = 'View Bar List';
                        drawLineChart(currentScores);
                    }
                }
            });
        }
    });

    // Expose on window.UIRenderer namespace
    window.UIRenderer = window.UIRenderer || {};
    window.UIRenderer.drawLineChart = drawLineChart;
})();
