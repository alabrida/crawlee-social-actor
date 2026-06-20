(function() {
    let currentScores = { awareness: 0, consideration: 0, decision: 0, conversion: 0, retention: 0 };

    const STAGE_CONFIG = {
        awareness: { color: '#6366f1', desc: 'Traffic generation, brand discovery & reach.' },
        consideration: { color: '#06b6d4', desc: 'Target audience engagement & social signals.' },
        decision: { color: '#f59e0b', desc: 'Reviews, trust signals, and brand credibility.' },
        conversion: { color: '#10b981', desc: 'Ease of direct checkout, booking, or leads.' },
        retention: { color: '#d946ef', desc: 'Sub subscriptions, newsletter, community hooks.' }
    };

    function drawLineChart(scores) {
        currentScores = scores;
        const lineView = document.getElementById('stages-line-view');
        if (!lineView) return;

        const data = [
            { key: 'awareness', name: 'Awareness', score: parseFloat(scores.awareness || 0), ...STAGE_CONFIG.awareness },
            { key: 'consideration', name: 'Consideration', score: parseFloat(scores.consideration || 0), ...STAGE_CONFIG.consideration },
            { key: 'decision', name: 'Decision', score: parseFloat(scores.decision || 0), ...STAGE_CONFIG.decision },
            { key: 'conversion', name: 'Conversion', score: parseFloat(scores.conversion || 0), ...STAGE_CONFIG.conversion },
            { key: 'retention', name: 'Retention', score: parseFloat(scores.retention || 0), ...STAGE_CONFIG.retention }
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
                    <circle class="point-glow" cx="${x}" cy="${y}" r="8" fill="${d.color}" fill-opacity="0.15" stroke="none" />
                    <circle class="point-dot" cx="${x}" cy="${y}" r="4.5" fill="${d.color}" stroke="#fff" stroke-width="1.5" />
                    <title>${d.name}: ${d.score.toFixed(1)} / 10&#10;${d.desc}</title>
                    <text class="point-label" x="${x}" y="${y - 12}" fill="#fff" font-size="10" font-family="Outfit" font-weight="600" text-anchor="middle">${d.score.toFixed(1)}</text>
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
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#6366f1" />
                        <stop offset="25%" stop-color="#06b6d4" />
                        <stop offset="50%" stop-color="#f59e0b" />
                        <stop offset="75%" stop-color="#10b981" />
                        <stop offset="100%" stop-color="#d946ef" />
                    </linearGradient>
                    <linearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="white" stop-opacity="0.25" />
                        <stop offset="100%" stop-color="white" stop-opacity="0.0" />
                    </linearGradient>
                    <mask id="areaMask">
                        <rect x="0" y="0" width="${width}" height="${height}" fill="url(#fadeGrad)" />
                    </mask>
                </defs>
                <g>${gridLinesHtml}</g>
                <path d="${areaD}" fill="url(#lineGrad)" mask="url(#areaMask)" />
                <path d="${pathD}" fill="none" stroke="url(#lineGrad)" stroke-width="3" stroke-linecap="round" filter="url(#glow)" />
                <g>${labelsHtml}</g>
                <g>${pointsHtml}</g>
            </svg>
            <div id="chart-tooltip" style="position: absolute; display: none; pointer-events: none; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 10px 12px; z-index: 100; font-family: 'Outfit', sans-serif; font-size: 0.8rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.7); backdrop-filter: blur(8px); transition: opacity 0.15s ease, transform 0.15s ease; transform: translate(-50%, calc(-100% - 12px)); min-width: 220px; box-sizing: border-box;">
                <div style="font-weight: 700; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <span id="tooltip-name" style="color: #fff; font-size: 0.85rem;"></span>
                    <span id="tooltip-score" style="font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; color: #fff;"></span>
                </div>
                <div id="tooltip-desc" style="color: var(--color-text-muted); font-size: 0.72rem; line-height: 1.4;"></div>
            </div>
        `;
        lineView.innerHTML = svgHtml;

        const pointGroups = lineView.querySelectorAll('.chart-point-group');
        const tooltip = lineView.querySelector('#chart-tooltip');
        const tooltipName = lineView.querySelector('#tooltip-name');
        const tooltipScore = lineView.querySelector('#tooltip-score');
        const tooltipDesc = lineView.querySelector('#tooltip-desc');

        pointGroups.forEach((group, index) => {
            const d = data[index];
            group.addEventListener('mouseenter', () => {
                const circle = group.querySelector('.point-dot');
                const rect = circle.getBoundingClientRect();
                const containerRect = lineView.getBoundingClientRect();
                
                const tooltipX = rect.left - containerRect.left + rect.width / 2;
                const tooltipY = rect.top - containerRect.top;

                tooltipName.textContent = d.name;
                tooltipScore.textContent = `${d.score.toFixed(1)} / 10`;
                tooltipScore.style.backgroundColor = d.color;
                tooltipDesc.textContent = d.desc;

                tooltip.style.left = `${tooltipX}px`;
                tooltip.style.top = `${tooltipY}px`;
                tooltip.style.display = 'block';
                
                circle.setAttribute('r', '7');
                circle.setAttribute('stroke-width', '2.5');
                const outerCircle = group.querySelector('.point-glow');
                outerCircle.setAttribute('r', '12');
                outerCircle.setAttribute('fill-opacity', '0.35');
            });

            group.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
                
                const circle = group.querySelector('.point-dot');
                circle.setAttribute('r', '4.5');
                circle.setAttribute('stroke-width', '1.5');
                const outerCircle = group.querySelector('.point-glow');
                outerCircle.setAttribute('r', '8');
                outerCircle.setAttribute('fill-opacity', '0.15');
            });
        });
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
