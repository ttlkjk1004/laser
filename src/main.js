import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './style.css';

class LaserSimulator {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.lasers = {};
        this.fans = {};
        this.projectionLines = [];
        
        this.colors = {
            x: 0xff4444, // Red
            y: 0x00ff88, // Green
            z: 0x38bdf8  // Blue
        };

        this.setupCamera();
        this.init();
        this.createEnvironment();
        this.createPillars();
        this.createPhantom();
        this.createLasers();
        this.setupUI();
        this.animate();
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        // Shift camera left to move scene right in the visible workspace
        this.xOffset = -100;
        this.camera.position.set(this.xOffset, 200, 600);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(this.xOffset, 0, 0);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    init() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(200, 400, 200);
        this.scene.add(dirLight);
    }

    createEnvironment() {
        const roomGeo = new THREE.BoxGeometry(1000, 600, 1000);
        const roomMat = new THREE.MeshStandardMaterial({
            color: 0x020617,
            side: THREE.BackSide,
            roughness: 1,
            metalness: 0
        });
        this.scene.add(new THREE.Mesh(roomGeo, roomMat));

        const grid = new THREE.GridHelper(1000, 40, 0x1e293b, 0x0f172a);
        grid.position.y = -299;
        this.scene.add(grid);
    }

    createPillars() {
        const createDetailedPillar = (x, z, isLeft) => {
            const group = new THREE.Group();
            
            // Body - Slender white column (Reduced height to 2/3: 600 -> 400)
            const bodyGeo = new THREE.BoxGeometry(25, 400, 35);
            const bodyMat = new THREE.MeshStandardMaterial({ 
                color: 0xf8fafc, 
                roughness: 0.2, 
                metalness: 0.1 
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            group.add(body);

            // Front Glass Panel (Black tapered, height reduced to 330)
            const panelGeo = new THREE.BoxGeometry(18, 330, 2);
            const panelMat = new THREE.MeshStandardMaterial({ 
                color: 0x0f172a, 
                roughness: 0.05, 
                metalness: 0.8 
            });
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.set(0, 0, 17.6);
            body.add(panel);

            // Laser Apertures (Windows)
            const winGeo = new THREE.PlaneGeometry(12, 12);
            const winMat = new THREE.MeshStandardMaterial({ 
                color: 0x000000, 
                emissive: 0x00ff88, 
                emissiveIntensity: 0.5 
            });
            
            const win1 = new THREE.Mesh(winGeo, winMat);
            win1.position.set(0, 80, 18.7); // Fixed laser height
            body.add(win1);

            const win2 = new THREE.Mesh(winGeo, winMat);
            win2.position.set(0, 0, 18.7); // Moving laser height
            body.add(win2);

            // LAP Logo (Red)
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 50px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LAP', 64, 32);
            
            const logoTex = new THREE.CanvasTexture(canvas);
            const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true });
            const logo = new THREE.Mesh(new THREE.PlaneGeometry(15, 7.5), logoMat);
            logo.position.set(0, 120, 17.6);
            body.add(logo);

            // Base & Cap
            const capGeo = new THREE.BoxGeometry(27, 10, 37);
            const capMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3 });
            
            const base = new THREE.Mesh(capGeo, capMat);
            base.position.y = -195;
            body.add(base);

            const cap = new THREE.Mesh(capGeo, capMat);
            cap.position.y = 195;
            body.add(cap);

            group.position.set(x, 0, z);
            group.rotation.y = isLeft ? Math.PI/2 : -Math.PI/2;
            return group;
        };

        const leftP = createDetailedPillar(-350, 0, true);
        this.scene.add(leftP);

        const rightP = createDetailedPillar(350, 0, false);
        this.scene.add(rightP);

        // Ceiling Track - Modern sleek rail
        const railGeo = new THREE.BoxGeometry(500, 12, 40);
        const railMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.5, roughness: 0.2 });
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(0, 290, 0);
        this.scene.add(rail);

        // Add black stripe to rail
        const stripeGeo = new THREE.BoxGeometry(500, 2, 30);
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 283.5, 0);
        this.scene.add(stripe);
    }

    createPhantom() {
        const geo = new THREE.BoxGeometry(100, 100, 100);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0x1e293b, 
            transparent: true, 
            opacity: 0.6,
            roughness: 0.5,
            metalness: 0.5
        });
        this.phantom = new THREE.Mesh(geo, mat);
        this.scene.add(this.phantom);
        
        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geo),
            new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })
        );
        this.phantom.add(edges);

        // Container for laser lines on phantom
        this.phantomLines = new THREE.Group();
        this.scene.add(this.phantomLines);
    }

    createLasers() {
        const config = [
            { id: 'y1', pos: [-330, 80, 0], rot: [0, Math.PI/2, 0], axis: 'z', color: this.colors.y, isVertical: true },
            { id: 'z1', pos: [-330, 0, 0], rot: [0, Math.PI/2, 0], axis: 'y', color: this.colors.z },
            { id: 'y2', pos: [330, 80, 0], rot: [0, -Math.PI/2, 0], axis: 'z', color: this.colors.y, isVertical: true },
            { id: 'z2', pos: [330, 0, 0], rot: [0, -Math.PI/2, 0], axis: 'y', color: this.colors.z },
            { id: 'y', pos: [-50, 260, 0], rot: [Math.PI/2, 0, 0], axis: 'z', color: this.colors.y },
            { id: 'x', pos: [50, 260, 0], rot: [Math.PI/2, 0, 0], axis: 'x', color: this.colors.x, isVertical: true },
        ];

        const mapping = { 'y': '1', 'x': '2', 'y1': '3', 'z1': '4', 'y2': '5', 'z2': '6' };

        config.forEach(c => {
            const group = new THREE.Group();
            group.position.set(...c.pos);
            group.rotation.set(...c.rot);

            // Head
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(12, 12, 20),
                new THREE.MeshStandardMaterial({ color: 0x0f172a })
            );
            group.add(head);

            // Add Number Badge to Head (using Sprite for better visibility)
            const canvas = document.createElement('canvas');
            canvas.width = 128; // Higher resolution
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Draw Badge
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(64, 64, 60, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8;
            ctx.stroke();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 80px Inter, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mapping[c.id], 64, 64);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: true }); // depthTest true for realistic integration
            const sprite = new THREE.Sprite(spriteMat);
            
            // Scale sprite
            sprite.scale.set(18, 18, 1); // Slightly smaller to fit better close to pillar
            
            // Position sprite offset towards "inside"
            // Default offset
            let offset = new THREE.Vector3(0, 15, 0); 
            
            // Position sprite directly on the structural surfaces
            if (c.id === 'y1' || c.id === 'z1') offset.set(-20, 0, 20); // Attached to side of left pillar
            if (c.id === 'y2' || c.id === 'z2') offset.set(20, 0, 20);  // Attached to side of right pillar
            if (c.id === 'y' || c.id === 'x') offset.set(25, 30, 0);   // Attached to side/top of ceiling rail
            
            sprite.position.copy(offset);
            group.add(sprite);

            // Laser Fan (Triangle for volume)
            // A thin triangle that expands.
            const fanGeo = new THREE.BufferGeometry();
            const spread = 200; // spread width at distance
            const length = 1000;
            
            let vertices;
            if (c.isVertical) {
                vertices = new Float32Array([
                    0, 0, 0,
                    0, -spread, length,
                    0, spread, length
                ]);
            } else {
                vertices = new Float32Array([
                    0, 0, 0,
                    -spread, 0, length,
                    spread, 0, length
                ]);
            }
            fanGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            
            const fanMat = new THREE.MeshBasicMaterial({
                color: c.color,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const fan = new THREE.Mesh(fanGeo, fanMat);
            group.add(fan);

            this.lasers[c.id] = { group, config: c };
            this.scene.add(group);
        });
    }

    setupUI() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.target}-controls`).classList.add('active');
            });
        });

        const laserIds = ['y1', 'z1', 'y2', 'z2', 'y', 'x'];
        
        laserIds.forEach(id => {
            const prefix = id;
            const updateVal = (suffix, val) => {
                const el = document.getElementById(`${prefix}-${suffix}-val`);
                if (el) el.textContent = typeof val === 'number' ? val.toFixed(1) : val;
            };

            const moveIn = document.getElementById(`${prefix}-move`) || document.getElementById(`${prefix}-pos`);
            if (moveIn) {
                moveIn.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    const laser = this.lasers[id];
                    if (['y1', 'y2', 'z1', 'z2'].includes(id)) {
                        if (id.startsWith('z')) {
                            laser.group.position.y = val;
                            updateVal('pos', val);
                        } else {
                            laser.group.position.z = val;
                            updateVal('move', val);
                        }
                    } else if (['y', 'x'].includes(id)) {
                        if (id === 'x') {
                            laser.group.position.x = val;
                            updateVal('pos', val);
                        } else {
                            laser.group.position.z = val;
                            updateVal('move', val);
                        }
                    }
                });
            }

            document.getElementById(`${prefix}-tilt`)?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const rad = val * (Math.PI / 180);
                const laser = this.lasers[id];
                if (id === 'y') {
                    // For Ceiling Fixed (y): Tilt is Pitch (rotation.x)
                    const baseRot = laser.config.rot[0];
                    laser.group.rotation.x = baseRot + rad;
                } else if (id === 'x') {
                    // For Ceiling Moving (x): Tilt is Yaw (rotation.y)
                    const baseRot = laser.config.rot[1];
                    laser.group.rotation.y = baseRot + rad;
                } else if (id === 'z1' || id === 'z2' || id === 'y2') {
                    // For Side Moving (4, 6) and Right Fixed (5): Tilt is Pitch (rotation.x - Up/Down)
                    const baseRot = laser.config.rot[0];
                    laser.group.rotation.x = baseRot + rad;
                } else {
                    const baseRot = laser.config.rot[1]; // y component
                    laser.group.rotation.y = baseRot + rad;
                }
                updateVal('tilt', val);
            });

            document.getElementById(`${prefix}-rotation`)?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const rad = val * (Math.PI / 180);
                const laser = this.lasers[id];
                if (id === 'y' || id === 'x') {
                    // For Ceiling lasers: Rotation becomes Spin (rotation.z)
                    const baseRot = laser.config.rot[2]; // z component
                    laser.group.rotation.z = baseRot + rad;
                } else if (id === 'z1' || id === 'z2' || id === 'y2') {
                    // For Side Moving (4, 6) and Right Fixed (5): Rotation is Yaw (rotation.y - Left/Right)
                    const baseRot = laser.config.rot[1];
                    laser.group.rotation.y = baseRot + rad;
                } else {
                    const baseRot = laser.config.rot[0]; // x component
                    laser.group.rotation.x = baseRot + rad;
                }
                updateVal('rotation', val);
            });

            document.getElementById(`${prefix}-focus`)?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const opacity = val / 100;
                // Update opacity for fan (now at index 2 because index 1 is the number badge)
                const fan = this.lasers[id].group.children[2];
                if (fan && fan.material) fan.material.opacity = opacity * 0.15;
                updateVal('focus', val + '%');
            });

            // Toggle ON/OFF
            document.getElementById(`${prefix}-toggle`)?.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.lasers[id].group.visible = enabled;
            });
        });

        document.getElementById('master-toggle').addEventListener('change', (e) => {
            const newState = e.target.checked;
            const laserIds = ['y1', 'z1', 'y2', 'z2', 'y', 'x'];
            laserIds.forEach(id => {
                this.lasers[id].group.visible = newState;
                const toggle = document.getElementById(`${id}-toggle`);
                if (toggle) toggle.checked = newState;
            });
        });

        document.getElementById('reset-view').onclick = () => {
            this.camera.position.set(this.xOffset, 200, 600);
            this.controls.target.set(this.xOffset, 0, 0);
            this.controls.update();
            
            // Reset all lasers to aligned state (0) and default angles
            const laserIds = ['y1', 'z1', 'y2', 'z2', 'y', 'x'];
            laserIds.forEach(id => {
                const laser = this.lasers[id];
                const config = laser.config;
                
                // Reset position based on config
                laser.group.position.set(...config.pos);

                // Reset rotation/tilt
                laser.group.rotation.set(...config.rot);
                
                // Reset Intensity (80%)
                const fan = laser.group.children[2];
                if (fan && fan.material) {
                    fan.material.opacity = 0.8 * 0.15;
                }

                // Update UI Sliders and Displays
                ['move', 'pos', 'tilt', 'rotation', 'focus'].forEach(suffix => {
                    const slider = document.getElementById(`${id}-${suffix}`);
                    if (slider) {
                        if (suffix === 'focus') slider.value = 80;
                        else slider.value = config.id === 'x' && suffix === 'pos' ? 50 : 0;
                    }
                    const display = document.getElementById(`${id}-${suffix}-val`);
                    if (display) {
                        if (suffix === 'focus') display.textContent = '80%';
                        else display.textContent = (config.id === 'x' && suffix === 'pos' ? 50 : 0).toFixed(1);
                    }
                });
            });
        };

        document.getElementById('toggle-phantom').onclick = () => {
            this.phantom.visible = !this.phantom.visible;
            this.phantomLines.visible = this.phantom.visible;
        };

        // Refresh icons
        if (window.lucide) window.lucide.createIcons();
    }

    updatePhantomLines() {
        // Clear previous lines
        while(this.phantomLines.children.length > 0) {
            const child = this.phantomLines.children[0];
            child.geometry.dispose();
            child.material.dispose();
            this.phantomLines.remove(child);
        }

        if (!this.phantom.visible) return;

        const size = 50.1; // Slightly larger than box to avoid z-fighting
        
        Object.values(this.lasers).forEach(laser => {
            if (!laser.group.visible) return; // Skip if OFF
            const { group, config } = laser;
            const color = config.color;
            const opacity = group.children[1].material.opacity * 5; // scaled back up

            // Each laser projects a line on the faces of the box it intersects
            // Since the lasers are axis-aligned, we can draw the lines directly.
            
            // X-axis (sagittal line on YZ plane)
            if (config.axis === 'x') {
                const x = group.position.x;
                if (Math.abs(x) <= 50) {
                    this.createBoxLine(new THREE.Vector3(x, -50, -50), new THREE.Vector3(x, 50, -50), color, opacity);
                    this.createBoxLine(new THREE.Vector3(x, 50, -50), new THREE.Vector3(x, 50, 50), color, opacity);
                    this.createBoxLine(new THREE.Vector3(x, 50, 50), new THREE.Vector3(x, -50, 50), color, opacity);
                    this.createBoxLine(new THREE.Vector3(x, -50, 50), new THREE.Vector3(x, -50, -50), color, opacity);
                }
            }
            // Y-axis (transverse line on XZ plane)
            if (config.axis === 'y') {
                const y = group.position.y;
                if (Math.abs(y) <= 50) {
                    this.createBoxLine(new THREE.Vector3(-50, y, -50), new THREE.Vector3(50, y, -50), color, opacity);
                    this.createBoxLine(new THREE.Vector3(50, y, -50), new THREE.Vector3(50, y, 50), color, opacity);
                    this.createBoxLine(new THREE.Vector3(50, y, 50), new THREE.Vector3(-50, y, 50), color, opacity);
                    this.createBoxLine(new THREE.Vector3(-50, y, 50), new THREE.Vector3(-50, y, -50), color, opacity);
                }
            }
            // Z-axis (coronal line on XY plane)
            if (config.axis === 'z') {
                const z = group.position.z;
                if (Math.abs(z) <= 50) {
                    this.createBoxLine(new THREE.Vector3(-50, -50, z), new THREE.Vector3(50, -50, z), color, opacity);
                    this.createBoxLine(new THREE.Vector3(50, -50, z), new THREE.Vector3(50, 50, z), color, opacity);
                    this.createBoxLine(new THREE.Vector3(50, 50, z), new THREE.Vector3(-50, 50, z), color, opacity);
                    this.createBoxLine(new THREE.Vector3(-50, 50, z), new THREE.Vector3(-50, -50, z), color, opacity);
                }
            }
        });
    }

    createBoxLine(start, end, color, opacity) {
        const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: Math.min(opacity, 1), linewidth: 2 });
        const line = new THREE.Line(geo, mat);
        this.phantomLines.add(line);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();

        this.updatePhantomLines();

        // Status bar
        document.getElementById('cur-x').textContent = this.lasers['x'].group.position.x.toFixed(1);
        document.getElementById('cur-y1').textContent = this.lasers['z1'].group.position.y.toFixed(1);
        document.getElementById('cur-y2').textContent = this.lasers['z2'].group.position.y.toFixed(1);
        document.getElementById('cur-z1').textContent = this.lasers['y1'].group.position.z.toFixed(1);
        document.getElementById('cur-z2').textContent = this.lasers['y2'].group.position.z.toFixed(1);

        this.renderer.render(this.scene, this.camera);
    }
}

new LaserSimulator();
