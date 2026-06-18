(function() {
    function initGlowCards() {
        const cards = document.querySelectorAll('.dashboard-card');
        
        function getCardGlowProps(card) {
            const heading = card.querySelector('h3');
            if (heading) {
                const title = heading.textContent.toLowerCase();
                if (title.includes('overall score')) {
                    return { r: 240, g: 180, b: 41, colorVar: 'var(--color-secondary)' };
                } else if (title.includes('weakest stage')) {
                    return { r: 239, g: 68, b: 68, colorVar: 'var(--color-error)' };
                } else if (title.includes('classification')) {
                    return { r: 32, g: 201, b: 151, colorVar: 'var(--color-accent)' };
                } else if (title.includes('journey')) {
                    return { r: 240, g: 180, b: 41, colorVar: 'var(--color-secondary)' };
                } else if (title.includes('channel')) {
                    return { r: 32, g: 201, b: 151, colorVar: 'var(--color-accent)' };
                }
            }
            return { r: 32, g: 201, b: 151, colorVar: 'var(--color-accent)' };
        }

        cards.forEach((card) => {
            let edgeGlow = card.querySelector('.edge-glow');
            if (!edgeGlow) {
                edgeGlow = document.createElement('div');
                edgeGlow.className = 'edge-glow';
                card.appendChild(edgeGlow);
            }
            let innerGlow = card.querySelector('.inner-glow');
            if (!innerGlow) {
                innerGlow = document.createElement('div');
                innerGlow.className = 'inner-glow';
                card.appendChild(innerGlow);
            }
            let borderPulse = card.querySelector('.border-pulse');
            if (!borderPulse) {
                borderPulse = document.createElement('div');
                borderPulse.className = 'border-pulse';
                card.appendChild(borderPulse);
            }

            const glow = getCardGlowProps(card);

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((centerY - y) / centerY) * 2.5;
                const rotateY = ((x - centerX) / centerX) * 2.5;

                card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

                const pctX = (x / rect.width) * 100;
                const pctY = (y / rect.height) * 100;

                edgeGlow.style.opacity = '1';
                edgeGlow.style.boxShadow = `inset 0 0 30px 8px rgba(${glow.r},${glow.g},${glow.b},0.08)`;
                edgeGlow.style.maskImage = `radial-gradient(ellipse at ${pctX}% ${pctY}%, transparent 20%, black 70%)`;
                edgeGlow.style.webkitMaskImage = `radial-gradient(ellipse at ${pctX}% ${pctY}%, transparent 20%, black 70%)`;

                innerGlow.style.opacity = '1';
                innerGlow.style.background = `radial-gradient(circle at ${pctX}% ${pctY}%, rgba(${glow.r},${glow.g},${glow.b},0.06) 0%, transparent 50%)`;

                borderPulse.classList.add('border-pulse-active');
                borderPulse.style.setProperty('--glow-color', glow.colorVar);
            });

            card.addEventListener('mouseenter', () => {
                let mist = card.querySelector('.nitrous-mist-wrapper');
                if (!mist) {
                    mist = document.createElement('div');
                    mist.className = 'nitrous-mist-wrapper';
                    
                    const leftPuff = document.createElement('div');
                    leftPuff.className = 'puff-left';
                    const rightPuff = document.createElement('div');
                    rightPuff.className = 'puff-right';
                    const bottomSpill = document.createElement('div');
                    bottomSpill.className = 'spill-bottom';
                    
                    mist.appendChild(leftPuff);
                    mist.appendChild(rightPuff);
                    mist.appendChild(bottomSpill);
                    card.appendChild(mist);
                } else {
                    mist.style.opacity = '1';
                }
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
                edgeGlow.style.opacity = '0';
                innerGlow.style.opacity = '0';
                borderPulse.classList.remove('border-pulse-active');

                const mist = card.querySelector('.nitrous-mist-wrapper');
                if (mist) {
                    mist.style.opacity = '0';
                    mist.style.transition = 'opacity 0.5s ease';
                    setTimeout(() => {
                        if (mist.parentNode === card) {
                            mist.remove();
                        }
                    }, 500);
                }
            });
        });
    }

    window.GlowCards = {
        init: initGlowCards
    };
})();
