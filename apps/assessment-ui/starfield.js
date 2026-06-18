(function() {
    const STAR_COUNT = 600;
    const MIN_ADAPTIVE_STAR_COUNT = 180;
    const STAR_DENSITY_DIVISOR = 2500;
    const MAX_CANVAS_DPR = 1.5;
    const CURSOR_RADIUS = 120;
    const GATHER_STRENGTH = 0.015;
    const DISPERSE_STRENGTH = 0.008;
    const MAX_STAR_SIZE = 1.2;
    const MIN_STAR_SIZE = 0.2;
    const MAX_BODIES = 3;
    const BODY_SPAWN_CHANCE = 0.003;
    const METEOR_CHANCE = 0.35;

    const lerp = (a, b, t) => a + (b - a) * t;
    const starColor = (w, a) => `rgba(${Math.round(lerp(180, 240, w))},${Math.round(lerp(200, 232, w))},${Math.round(lerp(255, 220, w))},${a})`;
    const glowColor = (w, a) => `rgba(${Math.round(lerp(140, 240, w))},${Math.round(lerp(170, 200, w))},${Math.round(lerp(255, 160, w))},${a})`;

    function initStarField(canvasIdOrElement) {
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (motionQuery.matches) {
            return { destroy: () => {} };
        }

        let canvas;
        if (canvasIdOrElement) {
            canvas = typeof canvasIdOrElement === 'string' 
                ? document.getElementById(canvasIdOrElement) 
                : canvasIdOrElement;
        } else {
            canvas = document.querySelector('.starfield-canvas');
        }

        if (!canvas) {
            return { destroy: () => {} };
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return { destroy: () => {} };
        }

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR);
        let width = 0;
        let height = 0;
        let stars = [];
        let bodies = [];
        let mouse = { x: -9999, y: -9999, active: false };
        let rafId = 0;
        let time = 0;

        function setCanvasSize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function initStars() {
            stars = [];
            const adaptiveStarCount = Math.min(
                STAR_COUNT,
                Math.max(MIN_ADAPTIVE_STAR_COUNT, Math.round((width * height) / STAR_DENSITY_DIVISOR))
            );
            for (let i = 0; i < adaptiveStarCount; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const bright = Math.random();
                const baseOpacity = bright < 0.85
                    ? 0.08 + Math.random() * 0.2
                    : bright < 0.97
                        ? 0.25 + Math.random() * 0.3
                        : 0.55 + Math.random() * 0.35;
                const size = bright < 0.85
                    ? MIN_STAR_SIZE + Math.random() * 0.3
                    : bright < 0.97
                        ? 0.4 + Math.random() * 0.4
                        : 0.7 + Math.random() * (MAX_STAR_SIZE - 0.7);
                stars.push({
                    x, y, baseX: x, baseY: y, size,
                    opacity: baseOpacity, baseOpacity,
                    twinkleSpeed: 0.3 + Math.random() * 1.5,
                    twinkleOffset: Math.random() * Math.PI * 2,
                    warmth: Math.random()
                });
            }
        }

        function spawnBody() {
            const isMeteor = Math.random() < METEOR_CHANCE;
            if (isMeteor) {
                const edge = Math.random();
                let x, y, vx, vy;
                if (edge < 0.5) {
                    x = edge < 0.25 ? -10 : width + 10;
                    y = Math.random() * height;
                    vx = (edge < 0.25 ? 1 : -1) * (3 + Math.random() * 5);
                    vy = (Math.random() - 0.5) * 2;
                } else {
                    x = Math.random() * width;
                    y = edge < 0.75 ? -10 : height + 10;
                    vx = (Math.random() - 0.5) * 2;
                    vy = (edge < 0.75 ? 1 : -1) * (3 + Math.random() * 5);
                }
                return {
                    x, y, vx, vy,
                    size: 0.8 + Math.random() * 0.8,
                    opacity: 0.3 + Math.random() * 0.35,
                    tailLength: 30 + Math.random() * 60,
                    life: 0, maxLife: 120 + Math.random() * 180,
                    kind: 'meteor', warmth: 0.3 + Math.random() * 0.7
                };
            } else {
                const x = Math.random() < 0.5 ? -10 : width + 10;
                const y = Math.random() * height;
                const direction = x < 0 ? 1 : -1;
                return {
                    x, y,
                    vx: direction * (0.15 + Math.random() * 0.4),
                    vy: (Math.random() - 0.5) * 0.15,
                    size: 0.6 + Math.random() * 0.6,
                    opacity: 0.12 + Math.random() * 0.2,
                    tailLength: 0, life: 0, maxLife: 600 + Math.random() * 900,
                    kind: 'drift', warmth: Math.random()
                };
            }
        }

        function animate() {
            time += 0.016;
            ctx.clearRect(0, 0, width, height);

            stars.forEach(s => {
                const twinkle = 0.7 + 0.3 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
                s.opacity = s.baseOpacity * twinkle;
                if (mouse.active) {
                    const dx = mouse.x - s.x;
                    const dy = mouse.y - s.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CURSOR_RADIUS) {
                        const force = (1 - dist / CURSOR_RADIUS) * GATHER_STRENGTH;
                        s.x += dx * force; s.y += dy * force;
                        s.opacity = Math.min(s.baseOpacity + 0.15, s.opacity + (1 - dist / CURSOR_RADIUS) * 0.12);
                    } else {
                        s.x += (s.baseX - s.x) * DISPERSE_STRENGTH;
                        s.y += (s.baseY - s.y) * DISPERSE_STRENGTH;
                    }
                } else {
                    s.x += (s.baseX - s.x) * DISPERSE_STRENGTH;
                    s.y += (s.baseY - s.y) * DISPERSE_STRENGTH;
                }

                if (s.baseOpacity > 0.3) {
                    ctx.globalAlpha = s.opacity * 0.15;
                    ctx.fillStyle = glowColor(s.warmth, 1);
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = s.opacity;
                ctx.fillStyle = starColor(s.warmth, 1);
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            });

            if (bodies.length < MAX_BODIES && Math.random() < BODY_SPAWN_CHANCE) {
                bodies.push(spawnBody());
            }

            for (let i = bodies.length - 1; i >= 0; i--) {
                const b = bodies[i];
                b.x += b.vx; b.y += b.vy; b.life++;
                const fadeIn = Math.min(1, b.life / 30);
                const fadeOut = Math.max(0, 1 - (b.life - b.maxLife + 40) / 40);
                const alpha = b.opacity * fadeIn * (b.life > b.maxLife - 40 ? fadeOut : 1);

                if (b.kind === 'meteor' && b.tailLength > 0) {
                    const grad = ctx.createLinearGradient(b.x, b.y, b.x - b.vx * b.tailLength * 0.3, b.y - b.vy * b.tailLength * 0.3);
                    grad.addColorStop(0, starColor(b.warmth, alpha));
                    grad.addColorStop(1, starColor(b.warmth, 0));
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = b.size * 0.6;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(b.x, b.y);
                    ctx.lineTo(b.x - b.vx * b.tailLength * 0.3, b.y - b.vy * b.tailLength * 0.3);
                    ctx.stroke();
                }
                ctx.globalAlpha = alpha;
                ctx.fillStyle = starColor(b.warmth, 1);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = alpha * 0.2;
                ctx.fillStyle = glowColor(b.warmth, 1);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size * 2, 0, Math.PI * 2);
                ctx.fill();

                if (b.life > b.maxLife || b.x < -50 || b.x > width + 50 || b.y < -50 || b.y > height + 50) {
                    bodies.splice(i, 1);
                }
            }
            rafId = requestAnimationFrame(animate);
        }

        const handleMouseMove = (e) => {
            mouse = { x: e.clientX, y: e.clientY, active: true };
        };
        const handleMouseLeave = () => {
            mouse.active = false;
        };
        const handleResize = () => {
            setCanvasSize();
            stars.forEach((s) => {
                s.baseX = Math.random() * width;
                s.baseY = Math.random() * height;
                s.x = s.baseX;
                s.y = s.baseY;
            });
        };

        setCanvasSize();
        initStars();

        window.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', handleResize);
        rafId = requestAnimationFrame(animate);

        return {
            destroy: () => {
                cancelAnimationFrame(rafId);
                window.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseleave', handleMouseLeave);
                window.removeEventListener('resize', handleResize);
            }
        };
    }

    window.initStarField = initStarField;
})();
