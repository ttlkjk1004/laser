import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './style.css';

class LaserSimulator {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        this.lasers = {};
        this.fans = {};
        this.projectionLines = [];
        
        this.colors = {
            x: 0xff4444, // Red
            y: 0x00ff88, // Green
            z: 0x38bdf8  // Blue
        };

        this.init();
        this.createEnvironment();
        this.createPillars();
        this.createPhantom();
        this.createLasers();
        this.setupUI();
        this.animate();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.set(450, 350, 450);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(200, 400, 200);
        this.scene.add(dirLight);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
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
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1 });
        const sideGeo = new THREE.BoxGeometry(30, 600, 30);
        
        const leftP = new THREE.Mesh(sideGeo, mat);
        leftP.position.set(-350, 0, 0);
        this.scene.add(leftP);

        const rightP = new THREE.Mesh(sideGeo, mat);
        rightP.position.set(350, 0, 0);
        this.scene.add(rightP);

        const ceilGeo = new THREE.CapsuleGeometry(20, 500, 4, 16);
        ceilGeo.rotateZ(Math.PI/2);
        const topP = new THREE.Mesh(ceilGeo, mat);
        topP.position.set(0, 280, 0);
        this.scene.add(topP);
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
            { id: 'left-fixed', pos: [-330, 80, 0], rot: [0, Math.PI/2, 0], axis: 'z', color: this.colors.y, isVertical: true },
            { id: 'left-moving', pos: [-330, 0, 0], rot: [0, Math.PI/2, 0], axis: 'y', color: this.colors.z },
            { id: 'right-fixed', pos: [330, 80, 0], rot: [0, -Math.PI/2, 0], axis: 'z', color: this.colors.y, isVertical: true },
            { id: 'right-moving', pos: [330, 0, 0], rot: [0, -Math.PI/2, 0], axis: 'y', color: this.colors.z },
            { id: 'top-fixed', pos: [-50, 260, 0], rot: [Math.PI/2, 0, 0], axis: 'z', color: this.colors.y },
            { id: 'top-moving', pos: [50, 260, 0], rot: [Math.PI/2, 0, 0], axis: 'x', color: this.colors.x, isVertical: true },
        ];

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

        const laserIds = ['left-fixed', 'left-moving', 'right-fixed', 'right-moving', 'top-fixed', 'top-moving'];
        
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
                    if (id.includes('left') || id.includes('right')) {
                        if (id.includes('moving')) {
                            laser.group.position.y = val;
                            updateVal('pos', val);
                        } else {
                            laser.group.position.z = val;
                            updateVal('move', val);
                        }
                    } else if (id.includes('top')) {
                        if (id.includes('moving')) {
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
                this.lasers[id].group.rotation.x = (id.includes('top') ? Math.PI/2 : 0) + rad;
                updateVal('tilt', val);
            });

            document.getElementById(`${prefix}-rotation`)?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const rad = val * (Math.PI / 180);
                this.lasers[id].group.rotation.y = (id.includes('top') ? 0 : Math.PI/2) + rad;
                updateVal('rotation', val);
            });

            document.getElementById(`${prefix}-focus`)?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const opacity = val / 100;
                // Update opacity for fan (child at index 1)
                const fan = this.lasers[id].group.children[1];
                if (fan && fan.material) fan.material.opacity = opacity * 0.15;
                updateVal('focus', val + '%');
            });

            // Toggle ON/OFF
            document.getElementById(`${prefix}-toggle`)?.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.lasers[id].group.visible = enabled;
            });
        });

        document.getElementById('reset-view').onclick = () => {
            this.controls.reset();
            this.camera.position.set(450, 350, 450);
            
            // Reset all lasers to aligned state (0) and default angles
            const laserIds = ['left-fixed', 'left-moving', 'right-fixed', 'right-moving', 'top-fixed', 'top-moving'];
            laserIds.forEach(id => {
                const laser = this.lasers[id];
                const config = laser.config;
                
                // Reset position based on axis
                if (id.includes('fixed')) {
                    laser.group.position.z = 0;
                } else {
                    if (id.includes('top')) laser.group.position.x = 50; // default x
                    else laser.group.position.y = 0; // default y
                }

                // Reset rotation/tilt
                laser.group.rotation.set(...config.rot);
                
                // Reset Intensity (80%)
                const fan = laser.group.children[1];
                if (fan && fan.material) {
                    fan.material.opacity = 0.8 * 0.15;
                }

                // Update UI Sliders and Displays
                const prefix = id;
                ['move', 'pos', 'tilt', 'rotation', 'focus'].forEach(suffix => {
                    const slider = document.getElementById(`${prefix}-${suffix}`);
                    if (slider) {
                        if (suffix === 'focus') slider.value = 80;
                        else if (suffix === 'pos' && id === 'top-moving') slider.value = 50;
                        else slider.value = 0;
                    }
                    const display = document.getElementById(`${prefix}-${suffix}-val`);
                    if (display) {
                        if (suffix === 'focus') display.textContent = '80%';
                        else if (suffix === 'pos' && id === 'top-moving') display.textContent = '50.0';
                        else display.textContent = '0.0';
                    }
                });
            });
        };

        document.getElementById('toggle-phantom').onclick = () => {
            this.phantom.visible = !this.phantom.visible;
            this.phantomLines.visible = this.phantom.visible;
        };
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
        document.getElementById('cur-x').textContent = this.lasers['top-moving'].group.position.x.toFixed(1);
        document.getElementById('cur-y-l').textContent = this.lasers['left-moving'].group.position.y.toFixed(1);
        document.getElementById('cur-y-r').textContent = this.lasers['right-moving'].group.position.y.toFixed(1);
        document.getElementById('cur-z-l').textContent = this.lasers['left-fixed'].group.position.z.toFixed(1);
        document.getElementById('cur-z-r').textContent = this.lasers['right-fixed'].group.position.z.toFixed(1);

        this.renderer.render(this.scene, this.camera);
    }
}

new LaserSimulator();
