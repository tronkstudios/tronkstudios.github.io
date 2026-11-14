"use strict";

/* TronkStudios · survivors/js/render3d.js
   Tronk Survivors en 3D con Three.js. La lógica del juego sigue en game.js
   (en 2D: x, y); aquí se dibuja cada fotograma en 3D:
   - el suelo con las mismas texturas del mapa,
   - árboles, rocas y demás obstáculos con formas sencillas,
   - los personajes y enemigos como stickmen 3D con el esqueleto de Tronk
     Fight (stick.js), con su peinado y su arma,
   - disparos, ataques y efectos.
   Casi todo se dibuja con «instancias»: una sola malla por tipo de pieza
   (huesos, esferas, cajas...) para cientos de enemigos a la vez.
   Mundo: x → X, y → Z y la altura es Y (1 unidad = 1 píxel del juego).
   Scripts clásicos (ver docs/adr/0002). */

const Render3D = (() => {
  const T = window.THREE;
  if (!T) return { ready: false, init: () => false };
  const rig = Stick.rig;
  const TAU = Math.PI * 2;
  const UP = new T.Vector3(0, 1, 0);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const S0 = 0.33; // unidades de Tronk Fight → píxeles del juego

  let renderer = null;
  let scene;
  let camera;
  let sun;
  let hemi;
  let lamp;
  let glCanvas;
  const api = {};
  const pools = {};
  const chunks = new Map();
  const siteLights=[];
  let lastMap = "";

  /* ---------- piezas con instancias ---------- */
  const tmpM = new T.Matrix4();
  const tmpM2 = new T.Matrix4();
  const tmpQ = new T.Quaternion();
  const tmpV = new T.Vector3();
  const tmpV2 = new T.Vector3();
  const tmpS = new T.Vector3();
  const tmpC = new T.Color();

  function pool(name, geo, mat, cap, shadow = true) {
    const m = new T.InstancedMesh(geo, mat, cap);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    for (let i = 0; i < cap; i++) m.setColorAt(i, tmpC.set(0xffffff));
    m.castShadow = shadow;
    m.receiveShadow = false;
    m.frustumCulled = false;
    m.count = 0;
    m.userData.cap = cap;
    scene.add(m);
    pools[name] = m;
  }

  function push(name, matrix, color) {
    const p = pools[name];
    if (p.count >= p.userData.cap) return;
    p.setMatrixAt(p.count, matrix);
    p.setColorAt(p.count, tmpC.set(color));
    p.count++;
  }

  // pieza entre dos puntos (huesos, palos...)
  function between(name, a, b, r, color) {
    tmpV.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = tmpV.length() || 0.001;
    tmpV.divideScalar(len);
    tmpQ.setFromUnitVectors(UP, tmpV);
    tmpM.compose(tmpV2.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), tmpQ, tmpS.set(r, len, r));
    push(name, tmpM, color);
  }

  function at(name, x, y, z, sx, sy, sz, color, rotY = 0) {
    tmpQ.setFromAxisAngle(UP, rotY);
    tmpM.compose(tmpV2.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz));
    push(name, tmpM, color);
  }

  // Sistema local (origen o, ejes X, Y, Z): para peinados y armas
  function local(name, B, p, s, color, rot) {
    tmpM.makeBasis(B.X, B.Y, B.Z);
    tmpM.setPosition(B.o[0], B.o[1], B.o[2]);
    if (rot) tmpQ.setFromEuler(rot);
    else tmpQ.identity();
    tmpM2.compose(tmpV2.set(p[0], p[1], p[2]), tmpQ, tmpS.set(s[0], s[1], s[2]));
    tmpM.multiply(tmpM2);
    push(name, tmpM, color);
  }

  /* ---------- inicio ---------- */
  function init(overlay, gameApi) {
    if (renderer) return true;
    Object.assign(api, gameApi);
    try {
      renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      renderer = null;
      return false;
    }
    glCanvas = renderer.domElement;
    glCanvas.id = "game3d";
    glCanvas.setAttribute("aria-hidden", "true");
    overlay.parentNode.insertBefore(glCanvas, overlay);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(30, 1, 20, 8000);
    hemi = new T.HemisphereLight(0xd9edff, 0x29453a, 1.1);
    sun = new T.DirectionalLight(0xffe4b5, 1.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -800; sc.right = 800; sc.top = 800; sc.bottom = -800; sc.near = 50; sc.far = 2500;
    sun.shadow.bias = -0.0008;
    lamp = new T.PointLight(0xffd9a0, 0, 520, 1.2);
    scene.add(hemi, sun, sun.target, lamp);
    for(let i=0;i<3;i++){const light=new T.PointLight(0xffd99b,0,250,1.4);scene.add(light);siteLights.push(light);}

    const lambert = () => new T.MeshLambertMaterial({ color: 0xffffff });
    const basic = () => new T.MeshBasicMaterial({ color: 0xffffff });
    const ghost = () => new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
    const ink = new T.MeshBasicMaterial({ color: 0x0e0a16, side: T.BackSide });
    const cyl = new T.CylinderGeometry(1, 1, 1, 10);
    const sph = new T.SphereGeometry(1, 16, 12);
    const box = new T.BoxGeometry(1, 1, 1);
    const cone = new T.ConeGeometry(1, 1, 12);
    const torus = new T.TorusGeometry(1, 0.06, 4, 48).rotateX(Math.PI / 2);
    const disc = new T.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
    const wing = new T.Shape();
    wing.moveTo(0,0);wing.lineTo(10,8);wing.lineTo(24,3);wing.lineTo(18,-4);
    wing.quadraticCurveTo(12,1,10,-5);wing.quadraticCurveTo(5,0,0,-2);wing.closePath();
    const wingGeo = new T.ShapeGeometry(wing);
    const wingMat = () => new T.MeshLambertMaterial({color:0xffffff,side:T.DoubleSide});
    pool("batWing",wingGeo,wingMat(),1000);
    pool("batWingLeft",wingGeo.clone().rotateY(Math.PI),wingMat(),1000);
    pool("cyl", cyl, lambert(), 9000);
    pool("sph", sph, lambert(), 9000);
    pool("box", box, lambert(), 5000);
    pool("cone", cone, lambert(), 4000);
    pool("octa", new T.OctahedronGeometry(1), lambert(), 1500, false);
    pool("lowSph", new T.IcosahedronGeometry(1, 1), new T.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 3000);
    pool("inkCyl", cyl, ink, 6000, false);
    pool("inkSph", sph, ink, 3000, false);
    pool("glow", sph, basic(), 2500, false);
    pool("glowCyl", cyl, basic(), 600, false);
    pool("glowBox", box, basic(), 2500, false);
    pool("ghost", sph, ghost(), 1500, false);
    pool("ghostBox", box, ghost(), 1500, false);
    pool("ghostCone", cone, ghost(), 300, false);
    pool("invertedCone", cone.clone().rotateZ(Math.PI), ghost(), 300, false);
    pool("ring", torus, basic(), 600, false);
    pool("disc", disc, ghost(), 300, false);
    resize();
    window.addEventListener("resize", resize);
    return true;
  }

  function resize() {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- suelo ---------- */
  function ground(cx, cy, radius) {
    if (api.mapId() !== lastMap) {
      for (const m of chunks.values()) { scene.remove(m); m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); }
      chunks.clear();
      lastMap = api.mapId();
    }
    const C = api.CHUNK;
    const x0 = Math.floor((cx - radius) / C);
    const x1 = Math.floor((cx + radius) / C);
    const y0 = Math.floor((cy - radius) / C);
    const y1 = Math.floor((cy + radius) / C);
    const keep = new Set();
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const key = `${x},${y}`;
        keep.add(key);
        if (chunks.has(key)) continue;
        const tex = new T.CanvasTexture(api.chunkCanvas(x, y));
        tex.magFilter = T.NearestFilter;
        tex.minFilter = T.LinearMipmapLinearFilter;
        tex.colorSpace = T.SRGBColorSpace;
        tex.anisotropy = 4;
        const m = new T.Mesh(new T.PlaneGeometry(C, C).rotateX(-Math.PI / 2), new T.MeshLambertMaterial({ map: tex }));
        m.position.set(x * C + C / 2, 0, y * C + C / 2);
        m.receiveShadow = true;
        scene.add(m);
        chunks.set(key, m);
      }
    }
    for (const [key, m] of chunks) {
      if (keep.has(key)) continue;
      scene.remove(m);
      m.geometry.dispose();
      m.material.map.dispose();
      m.material.dispose();
      chunks.delete(key);
    }
  }

  /* ---------- obstáculos ---------- */
  const hashF = (x, y, k) => { const s = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

  function obstacle(ob, dark) {
    const { x, y } = ob;
    const v = hashF(x, y, 1);
    const g = hashF(x, y, 2);
    const leaf = dark ? 0x2f5148 : [0x3e7157, 0x517e5d, 0x38654e][Math.floor(v * 3)];
    switch (ob.kind) {
      case "arbol":
        between("cyl", [x, 0, y], [x, 46, y], 5.5, 0x6b4426);
        for(let i=0;i<3;i++) {
          const a=i*TAU/3+v*3;
          between("cyl",[x,2,y],[x+Math.cos(a)*13,1,y+Math.sin(a)*13],2.2,0x5e4935);
          between("cyl",[x,25,y],[x+Math.cos(a)*18,54,y+Math.sin(a)*14],2.8,0x775639);
        }
        at("lowSph", x, 70, y, 30, 26, 30, leaf, v * 3);
        at("lowSph", x-6,83,y-8,17,13,18,dark?0x426458:0x6a9168,v*4);
        at("lowSph", x+20,69,y+3,14,16,16,dark?0x2b493f:0x47735a,v*2);
        at("lowSph", x - 14, 58, y + 6, 20, 18, 20, leaf, v * 5);
        at("lowSph", x + 15, 62, y - 4, 19, 17, 19, leaf, v * 7);
        break;
      case "pino":
        between("cyl", [x, 0, y], [x, 30, y], 4.5, 0x5a3a20);
        for (let i = 0; i < 4; i++) at("cone", x, 34 + i * 19, y, 28 - i * 6, 36 - i * 3, 28 - i * 6, dark ? 0x29493f : [0x315a49,0x3b6851,0x47755b,0x568269][i]);
        break;
      case "roca":
      case "rocaGrande": {
        const r = ob.kind === "roca" ? 16 : 26;
        at("lowSph", x, r * 0.45, y, r, r * 0.75, r * 0.85, [0x8a8f99, 0x9aa0a8, 0x7d828c][Math.floor(g * 3)], v * 6);
        at("lowSph",x-r*.55,r*.2,y+r*.3,r*.45,r*.35,r*.4,0x687b70,v*3);
        at("lowSph",x+r*.32,r*.7,y-r*.2,r*.52,r*.14,r*.42,dark?0x384f45:0x586e4f,v*2);
        break;
      }
      case "tronco":
        between("cyl", [x - 24, 7, y], [x + 24, 7, y], 7, 0x7a4a26);
        break;
      case "arbusto":
        for (const [dx, dz, r] of [[0, 0, 12], [-9, 4, 9], [9, 3, 9]]) at("lowSph", x + dx, r * 0.8, y + dz, r, r * 0.85, r, leaf, v * 4 + dx);
        if (v > 0.5) for (let i = 0; i < 3; i++) at("sph", x - 8 + i * 8, 16, y + 7, 1.8, 1.8, 1.8, v > 0.75 ? 0xff7eb6 : 0xffe066);
        break;
      case "hierba":
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + v;
          at("cone", x + Math.cos(a) * 6, 7, y + Math.sin(a) * 5, 2.2, 14 + hashF(x, y, i) * 8, 2.2, dark ? 0x2f4a30 : 0x2f6a2a);
        }
        break;
      case "tumba":
        at("box", x, 15, y, 22, 30, 7, 0x8a8f99);
        at("cyl", x, 30, y, 11, 7, 11, 0x8a8f99);
        at("box", x, 1, y + 10, 26, 2, 22, 0x5a4a3a);
        break;
      case "cruz":
        at("box", x, 22, y, 5, 44, 5, 0x6b4a30);
        at("box", x, 32, y, 22, 5, 5, 0x6b4a30);
        break;
      case "arbolMuerto":
        between("cyl", [x, 0, y], [x, 60, y], 5, 0x4a3a30);
        between("cyl", [x, 40, y], [x + 18, 66, y + 4], 2.5, 0x4a3a30);
        between("cyl", [x, 48, y], [x - 16, 70, y - 3], 2.2, 0x4a3a30);
        break;
      case "palmera": {
        const pts = [[x, 0, y], [x + 4, 26, y], [x + 10, 52, y], [x + 18, 76, y]];
        for (let i = 0; i < 3; i++) between("cyl", pts[i], pts[i + 1], 4.5 - i * 0.6, 0x9a6a3a);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          between("cone", [x + 18, 76, y], [x + 18 + Math.cos(a) * 32, 66, y + Math.sin(a) * 32], 5, 0x3f9a40);
        }
        break;
      }
      case "sombrilla":
        between("cyl", [x, 0, y], [x, 52, y], 1.5, 0xd8d8d8);
        at("cone", x, 56, y, 30, 12, 30, v > 0.5 ? 0xe63946 : 0x3b8bff);
        break;
      case "farola":
        between("cyl", [x, 0, y], [x, 80, y], 2.5, 0x3a3f4a);
        at("glow", x, 84, y, 6, 5, 6, 0xffe9a8);
        break;
      case "contenedor":
        at("box", x, 15, y, 40, 30, 22, 0x2f7a3a);
        at("box", x, 31, y, 42, 3, 24, 0x255f2e);
        break;
      case "coche": {
        const c = [0xd62828, 0x3b8bff, 0xf1c40f, 0xe8e8e8][Math.floor(v * 4)];
        at("box", x, 10, y, 48, 14, 22, c);
        at("box", x - 3, 22, y, 26, 11, 20, c);
        at("glowBox", x - 3, 22, y, 27, 7, 18, 0x9ad2ff);
        for (const [dx, dz] of [[-15, 11], [15, 11], [-15, -11], [15, -11]]) at("cyl", x + dx, 5, y + dz, 5, 4, 5, 0x1a1a1a);
        break;
      }
      case "banco":
        at("box", x, 8, y, 36, 3, 10, 0x8a5a2b);
        at("box", x, 14, y - 5, 36, 10, 2, 0x8a5a2b);
        for (const dx of [-14, 14]) at("box", x + dx, 4, y, 3, 8, 9, 0x3a3f4a);
        break;
    }
  }

  /* ---------- stickmen 3D ---------- */
  const OPT = {};
  function optionsFor(kind, id) {
    const key = `${kind}:${id}`;
    if (!OPT[key]) {
      if (kind === "char") {
        const ch = TS.CHARACTERS.find((c) => c.id === id);
        OPT[key] = ch ? Stick.characterOptions(ch) : Stick.ENEMIES.zombi;
      } else OPT[key] = { ...(Stick.ENEMIES[id] || Stick.ENEMIES.zombi), role: id };
    }
    return OPT[key];
  }

  const DIR_ANGLE = { side: 0, downSide: Math.PI / 4, down: Math.PI / 2, upSide: -Math.PI / 4, up: -Math.PI / 2 };
  function angleOf(dir, face) {
    const a = DIR_ANGLE[dir] ?? 0;
    return face < 0 ? Math.PI - a : a;
  }

  const shade = (hex, k) => { tmpC.set(hex); tmpC.multiplyScalar(1 + k); return tmpC.getHex(); };

  // Peinados y cascos en coordenadas de la cabeza (radio 1): X delante, Y arriba, Z derecha
  function headParts(o) {
    const h = o.hairColor || 0x2a1d1a;
    const acc = o.acc || 0xffd23f;
    const P = [];
    const sp = (p, s, c, shape = "sph") => P.push([shape, p, s, c]);
    const cap = (k = 1) => sp([-0.06, 0.32, 0], [1.06 * k, 0.78, 1.06 * k], h);
    switch (o.hair) {
      case "antenna":
        sp([0,0,0],[1.08,1.08,1.08],h);
        P.push(["glowBox",[1.02,.05,0],[.18,.4,1.3],acc]);
        P.push(["cyl",[-.3,1.5,-.4],[.06,1.2,.06],acc]);
        sp([-.3,2.1,-.4],[.19,.19,.19],0xff6570,"glow");break;
      case "mushroom":
        sp([0,.75,0],[1.6,.65,1.6],h);
        for(const [x,z] of [[0,0],[-.8,.5],[.8,-.5]])sp([x,1.2,z],[.2,.12,.2],acc);break;
      case "forge":
        sp([0,0,0],[1.12,1.12,1.12],h);
        P.push(["glowBox",[1.1,.04,0],[.22,.4,1.3],acc]);
        for(const z of [-.5,0,.5])P.push(["cone",[0,1.35,z],[.18,.9,.18],acc]);break;
      case "taper": cap(); break;
      case "taperLong": cap(); sp([0.15, 0.82, 0], [0.82, 0.5, 0.78], h); break;
      case "curly": case "longCurly":
        for (const [x, y, z, r] of [[0, 0.7, 0, 0.6], [-0.5, 0.5, 0.5, 0.55], [-0.5, 0.5, -0.5, 0.55], [-0.75, 0, 0.45, 0.55], [-0.75, 0, -0.45, 0.55], [-0.7, -0.6, 0.4, 0.5], [-0.7, -0.6, -0.4, 0.5], [0.4, 0.65, 0.4, 0.45], [0.4, 0.65, -0.4, 0.45], [-0.9, -1.1, 0, 0.55]]) sp([x, y, z], [r, r, r], h);
        if (o.beard) for (const [x, y, z] of [[0.75, -0.55, 0], [0.6, -0.5, 0.45], [0.6, -0.5, -0.45], [0.55, -0.85, 0]]) sp([x, y, z], [0.38, 0.38, 0.38], h);
        break;
      case "mullet":
        cap();
        sp([-0.7, -0.55, 0], [0.5, 1.05, 0.8], h);
        if (o.fringe) for (const z of [-0.4, 0, 0.4]) P.push(["cone", [0.88, 0.32, z], [0.16, 0.45, 0.16], h, Math.PI]);
        break;
      case "spiky":
        cap(0.95);
        for (const [x, z, a] of [[0, 0, 0], [0.3, 0.45, 0.4], [0.3, -0.45, -0.4], [-0.4, 0.35, 0.5], [-0.4, -0.35, -0.5], [0.5, 0, 0]]) P.push(["cone", [x, 1.05, z], [0.22, 0.75, 0.22], h, a]);
        break;
      case "mane": cap(); sp([-0.55, -0.15, 0], [0.95, 1.4, 1.35], h); break;
      case "combover": cap(); sp([0.2, 0.82, -0.25], [0.85, 0.42, 0.85], h); break;
      case "capBack":
        sp([0, 0.38, 0], [1.08, 0.72, 1.08], acc);
        P.push(["box", [-1.15, 0.3, 0], [0.8, 0.12, 0.85], acc]);
        sp([0.9, 0.55, 0], [0.18, 0.18, 0.18], 0xffffff);
        break;
      case "ponytail":
        cap();
        P.push(["cyl", [-1.2, -0.3, 0], [0.3, 1.1, 0.3], h, 0.5]);
        sp([-0.95, 0.25, 0], [0.24, 0.24, 0.24], acc);
        break;
      case "afro": sp([-0.15, 0.45, 0], [1.5, 1.4, 1.5], h); break;
      case "beanie":
        sp([0, 0.42, 0], [1.1, 0.8, 1.1], acc);
        P.push(["cyl", [0, 0.18, 0], [1.13, 0.3, 1.13], shade(acc, -0.25)]);
        sp([-0.1, 1.25, 0], [0.32, 0.32, 0.32], 0xf4f8ff);
        break;
      case "ninja":
        cap();
        P.push(["cyl", [0, 0.32, 0], [1.1, 0.22, 1.1], acc]);
        P.push(["box", [-1.3, 0.15, 0.2], [0.9, 0.12, 0.12], acc, -0.5]);
        sp([0.35, -0.42, 0], [0.8, 0.6, 1.02], 0x1b1b2f);
        break;
      case "bob": cap(); sp([-0.6, -0.25, 0], [0.65, 1.05, 1.14], h); sp([0.55, 0.75, 0.55], [0.22, 0.22, 0.22], acc, "glow"); break;
      case "fluffy": for (const [x, y, z] of [[0, 0.85, 0], [0.45, 0.7, 0.4], [0.45, 0.7, -0.4], [-0.45, 0.65, 0.45], [-0.45, 0.65, -0.45], [0.75, 0.45, 0]]) sp([x, y, z], [0.5, 0.45, 0.5], h); break;
      case "helmet":
        sp([0, 0, 0], [1.16, 1.16, 1.16], o.hairColor || 0x3d4451);
        P.push(["glowBox", [1.16, 0.0, 0], [0.22, 0.4, 0.95], acc]);
        break;
      case "hood":
        sp([-0.5, 0.08, 0], [0.85, 1.2, 1.22], o.hairColor || 0xe9c46a);
        sp([0, 0.85, 0], [1.05, 0.45, 1.18], o.hairColor || 0xe9c46a);
        break;
      case "zombie": for (const [x, z] of [[0, 0], [0.3, 0.3], [-0.3, -0.25]]) P.push(["cyl", [x, 1.15, z], [0.06, 0.5, 0.06], h]); break;
      case "hardhat": sp([0, 0.4, 0], [1.08, 0.7, 1.08], acc); P.push(["cyl", [0.15, 0.3, 0], [1.35, 0.1, 1.25], acc]); break;
      case "balaclava":
        sp([0, 0, 0], [1.03, 1.03, 1.03], 0x151319);
        P.push(["box", [0.78, 0.1, 0], [0.5, 0.3, 0.95], 0xe8b896]);
        if (o.beret) { P.push(["cyl", [-0.15, 0.85, 0], [1.0, 0.25, 1.0], o.beret]); sp([0.75, 0.85, 0], [0.16, 0.16, 0.16], 0xffd23f); }
        break;
      case "wrapNinja": P.push(["box", [0.82, 0.12, 0], [0.4, 0.28, 0.95], 0xf2c3a0]); P.push(["box", [-1.25, 0.2, 0.15], [0.85, 0.12, 0.12], acc, -0.5]); break;
      case "skull": for (const z of [-0.35, 0.35]) sp([0.85, 0.1, z], [0.22, 0.24, 0.2], 0x1a1020); sp([0.86, 0.1, 0.35], [0.08, 0.08, 0.08], 0xff6b3b, "glow"); sp([0.86, 0.1, -0.35], [0.08, 0.08, 0.08], 0xff6b3b, "glow"); break;
      case "hoodShadow": sp([-0.2, 0.1, 0], [1.25, 1.22, 1.25], o.hairColor || 0x4a148c); sp([0.62, -0.02, 0], [0.55, 0.7, 0.8], 0x14101c); for (const z of [-0.25, 0.25]) sp([1.05, 0.08, z], [0.1, 0.1, 0.1], 0xff2bd6, "glow"); break;
    }
    if (o.crown) {
      P.push(["cyl", [0, 0.95, 0], [0.7, 0.3, 0.7], 0xffd23f]);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; P.push(["cone", [Math.cos(a) * 0.55, 1.3, Math.sin(a) * 0.55], [0.16, 0.45, 0.16], 0xffd23f]); }
    }
    if (o.glasses) {
      for (const z of [-0.33, 0.33]) P.push(["box", [0.95, 0.12, z], [0.12, 0.36, 0.42], 0x14112b]);
      P.push(["box", [0.97, 0.15, 0], [0.08, 0.08, 0.3], 0x14112b]);
    }
    if (["balaclava", "wrapNinja"].includes(o.hair)) for (const z of [-0.3, 0.3]) sp([1.06, 0.12, z], [0.09, 0.1, 0.09], o.eye || 0x14112b, "glow");
    if (!o.noEye && !["balaclava", "wrapNinja", "skull", "hoodShadow", "helmet"].includes(o.hair)) for (const z of [-0.32, 0.32]) sp([0.9, 0.1, z], [0.13, 0.17, 0.13], o.eye || 0x14112b, "glow");
    return P;
  }
  const HEAD = {};

  // Armas en coordenadas del arma: Y a lo largo, desde la mano; en unidades de Tronk Fight
  function weaponParts(type, len) {
    const P = [];
    const b = (p, s, c, shape = "box") => P.push([shape, p, s, c]);
    const steel = 0xdfe6f0;
    const wood = 0x7a4a26;
    switch (type) {
      case "faro":b([0,32,0],[5,100,5],0x426b68,"cyl");b([0,80,0],[18,25,16],0x80e3d0,"glowBox");b([0,94,0],[22,5,20],0xf0cf8e);break;
      case "arco": b([0,18,0],[3,62,3],0xeee2be);for(let i=0;i<7;i++){const a=-1.3+i*2.6/6;b([Math.cos(a)*30-8,Math.sin(a)*30+18,0],[5,12,5],0x9d7249,"cyl");}break;
      case "bobina":b([0,0,0],[12,24,12],0x35434b);for(let i=0;i<4;i++)b([0,15+i*7,0],[12,3,12],0xdcb56b,"ring");b([0,42,0],[7,7,7],0x91ecff,"glow");break;
      case "abanico":for(let i=0;i<6;i++){const a=.15+i*(Math.PI-.3)/5;b([Math.cos(a)*15,Math.sin(a)*15,0],[5,22,2],0xed8baf);}break;
      case "tambor":b([0,10,0],[20,22,20],0xaa7042,"cyl");b([0,22,0],[21,3,21],0xe9d2a0,"cyl");break;
      case "magnet": b([0,12,0],[14,2,14],0x64f5ff,"ring");b([0,0,0],[7,12,7],0x264653);break;
      case "vial": b([0,12,0],[9,13,9],0xb8f06a,"sph");b([0,-1,0],[5,7,5],0x7744a6);break;
      case "flamer": b([0,10,0],[12,32,12],0x34313d);b([0,28,0],[16,8,16],0xff812f,"cyl");b([0,32,0],[6,3,6],0xffe5a0,"glow");break;
      case "espada": case "katana":
        b([0, -2, 0], [5, 14, 5], 0x3a2516);
        b([0, 7, 0], [20, 4, 6], type === "katana" ? 0x2a2a35 : 0xe0b84a);
        b([0, 10 + (len - 10) / 2, 0], [7, len - 10, 2.2], steel);
        break;
      case "ballesta":
        b([0, len * 0.35, 0], [6, len, 6], wood);
        b([0, len * 0.75, 0], [44, 4, 4], 0x2a2a35);
        break;
      case "mazo":
        b([0, len * 0.4, 0], [3.5, len, 3.5], wood, "cyl");
        b([0, len * 0.9, 0], [16, 16, 16], 0x565a68, "sph");
        for (let i = 0; i < 6; i++) {
          const a = i * TAU / 6;
          b([Math.cos(a) * 19, len * 0.9 + Math.sin(a) * 19, 0], [5, 5, 5], 0x3d3f4a, "octa");
        }
        break;
      case "lanza":
        b([0, len * 0.18, 0], [2.4, len, 2.4], wood, "cyl");
        b([0, len * 0.68 + 15, 0], [7, 30, 7], steel, "cone");
        break;
      case "hacha":
        b([0, len * 0.38, 0], [3, len, 3], wood, "cyl");
        b([10, len * 0.88 - 9, 0], [22, 30, 4], steel); // la hoja hacia delante
        break;
      case "tridente":
        b([0, len * 0.2, 0], [2.4, len, 2.4], 0x2f8c8c, "cyl");
        b([0, len * 0.7, 0], [28, 4, 4], 0xe0b84a);
        for (const x of [-13, 0, 13]) b([x, len * 0.7 + 12, 0], [3, x ? 20 : 26, 3], 0xe0b84a);
        break;
      case "rifle": b([0, len * 0.2, 0], [7, len, 7], 0x2a2a30); b([0, -len * 0.25, 0], [9, 18, 9], 0x5a4630); break;
      case "baston": b([0, len * 0.25, 0], [3, len, 3], wood, "cyl"); b([0, len * 0.76, 0], [7, 7, 7], 0xe9c46a, "glow"); break;
      case "petardo": b([0, 12, 0], [5, 24, 5], 0xd62828, "cyl"); b([0, 30, 0], [5, 5, 5], 0xffd23f, "glow"); break;
      case "perfume": b([0, 12, 0], [9, 11, 9], 0xff7eb6, "sph"); b([0, 0, 0], [4, 6, 4], 0xffd23f); break;
      case "balon":
        b([0, 12, 0], [12, 12, 12], 0xffffff, "sph");
        for (const z of [-11.5, 11.5]) b([0, 12, z], [4, 4, 1], 0x14112b);
        break;
      case "hielo": b([0, 10, 0], [12, 12, 12], 0x9fdcff, "glow"); break;
      case "kunai": b([0, 2, 0], [2, 12, 2], 0x2a2a35); b([0, 18, 0], [5, 22, 5], steel, "cone"); break;
      case "estrella": b([0, 10, 0], [2, 30, 2], 0xe0b84a, "cyl"); b([0, 34, 0], [10, 10, 10], 0xffe066, "glow"); break;
      case "tnt": for (const x of [-9, 0, 9]) b([x, 13, 0], [4, 26, 4], 0xc1121f, "cyl"); b([0, -4, 0], [5, 5, 5], 0xffd23f, "glow"); break;
    }
    return P;
  }
  const WPN = {};

  /* Un stickman: posición (x, y) del suelo, ángulo hacia donde mira, postura P,
     escala k (jefes) y si parpadea al recibir un golpe */
  function stickman(o, x, y, ang, P, k, flash, outline) {
    const S = S0 * (o.size || 1) * k;
    const J = rig.joints(P);
    const L = rig.LAT;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const latK = o.thick ? 0.7 + 0.3 * o.thick : 1;
    const W = (pt, l = 0) => [x + (pt[0] * ca - l * latK * sa) * S, -pt[1] * S, y + (pt[0] * sa + l * latK * ca) * S];
    const col = flash ? 0xffffff : o.color;
    const dark = flash ? 0xe8e8ff : shade(o.color, -0.3);
    const legs = flash ? 0xffffff : o.legs || o.color;
    const legsDark = flash ? 0xe8e8ff : shade(o.legs || o.color, -0.3);
    const th = o.thick || 1;
    const r = (w) => w * 0.5 * S * 1.55 * th;
    const limb = (pts, color, w) => {
      const rr = r(w);
      for (let i = 0; i < pts.length - 1; i++) {
        between("cyl", pts[i], pts[i + 1], rr, color);
        if (outline) between("inkCyl", pts[i], pts[i + 1], rr + 0.55 * k, 0);
      }
      for (const p of pts.slice(1)) at("sph", p[0], p[1], p[2], rr, rr, rr, color);
    };
    const hipB = W(J.hip, L.hipB), hipF = W(J.hip, L.hipF);
    const shB = W(J.sh, L.shB), shF = W(J.sh, L.shF);
    const bHand = W(J.bHand, L.bHand), fHand = W(J.fHand, L.fHand);
    limb([hipB, W(J.bKnee, L.bKnee), W(J.bFoot, L.bFoot)], legsDark, 7);
    if (!o.robe) limb([hipF, W(J.fKnee, L.fKnee), W(J.fFoot, L.fFoot)], legs, 7);
    limb([shB, W(J.bEl, L.bEl), bHand], dark, 6.5);
    limb([shF, W(J.fEl, L.fEl), fHand], col, 7);
    const hip = W(J.hip);
    const neck = W(J.neck);
    // tronco: hombros y caderas unidos y la columna
    between("cyl", hip, neck, r(8) * (o.torso || 1), col);
    if (outline) between("inkCyl", hip, neck, r(8) * (o.torso || 1) + 0.55 * k, 0);
    between("cyl", shB, shF, r(6), col);
    between("cyl", hipB, hipF, r(6), legs);
    bodyDetails(o, J, W, S, ang, flash);
    if (o.robe) {
      const sh = W(J.sh);
      at("cone", (sh[0] + hip[0]) / 2, sh[1] / 2 + 1, (sh[2] + hip[2]) / 2, 26 * S, sh[1], 26 * S, flash ? 0xffffff : o.robe, -ang);
    }
    if (o.cape) {
      const a = W([J.neck[0] - 4, J.neck[1]]);
      const b = W([J.hip[0] - 16, J.hip[1] + 40]);
      const B = { o: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] };
      B.Y = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const lenC = B.Y.length();
      B.Y.normalize();
      B.Z = new T.Vector3(-sa, 0, ca);
      B.X = new T.Vector3().crossVectors(B.Y, B.Z).normalize();
      local("box", B, [0, 0, 0], [1.2, lenC, 24 * S], flash ? 0xffffff : o.cape);
    }
    const [type, len, , hands] = rig.WEAPON[o.weapon] || rig.WEAPON.none;
    if (hands === "gloves" || hands === "fists") {
      const gr = (hands === "gloves" ? 10 : 7) * S;
      for (const [hnd, c] of [[fHand, 0xe53935], [bHand, 0xb71c1c]]) {
        if (hands === "fists" && hnd === bHand) continue;
        at("sph", hnd[0], hnd[1], hnd[2], gr, gr, gr, flash ? 0xffffff : hands === "gloves" ? c : o.color);
      }
    }
    // cabeza con su peinado
    const hd = W(J.head);
    const hr = 17 * S * (o.headK || 1);
    at("sph", hd[0], hd[1], hd[2], hr, hr, hr, flash ? 0xffffff : o.head || o.color);
    if (outline) at("inkSph", hd[0], hd[1], hd[2], hr + 0.6 * k, hr + 0.6 * k, hr + 0.6 * k, 0);
    const hkey = JSON.stringify([o.hair, o.hairColor, o.acc, o.crown, o.glasses, o.beard, o.fringe, o.beret, o.eye, o.noEye]);
    const parts = HEAD[hkey] || (HEAD[hkey] = headParts(o));
    const HB = { o: hd, X: new T.Vector3(ca * hr, 0, sa * hr), Y: new T.Vector3(0, hr, 0), Z: new T.Vector3(-sa * hr, 0, ca * hr) };
    for (const [shape, p, s, c, rz] of parts) local(shape, HB, p, s, flash ? 0xffffff : c, rz ? new T.Euler(0, 0, rz) : null);
    // arma en la mano de delante
    if (type) {
      const dirF = Math.sin((P.w * Math.PI) / 180);
      const dirU = -Math.cos((P.w * Math.PI) / 180);
      const Y = new T.Vector3(dirF * ca, dirU, dirF * sa).normalize();
      const Z0 = new T.Vector3(-sa, 0, ca);
      const X = new T.Vector3().crossVectors(Y, Z0).normalize();
      const Z = new T.Vector3().crossVectors(X, Y).normalize();
      const WB = { o: fHand, X: X.multiplyScalar(S), Y: Y.multiplyScalar(S), Z: Z.multiplyScalar(S) };
      const wkey = `${type}:${len}`;
      const wp = WPN[wkey] || (WPN[wkey] = weaponParts(type, len));
      for (const [shape, p, s, c] of wp) local(shape, WB, p, s, flash ? 0xffffff : c);
      if(o.evolution)local("glow",WB,[0,Math.max(10,len*.65),0],[4,4,4],o.evolution==="dominion"?0x80e3d0:0xf0cb82);
    }
    if (o.drone && !flash) {
      const d = W([J.sh[0] - 26, J.sh[1] - 34], -14);
      at("box", d[0], d[1], d[2], 9, 3.5, 6, 0x3d4451, -ang);
      at("glow", d[0] + ca * 3, d[1], d[2] + sa * 3, 1.5, 1.5, 1.5, 0x00e5ff);
    }
  }

  // Equipamiento y anatomía distinguen las siluetas sin crear una malla
  // independiente por enemigo: siguen usando los mismos lotes de instancias.
  function bodyDetails(o, J, W, S, ang, flash) {
    const role=o.role || "";
    const skeleton=["esqueleto","reyEsqueleto"].includes(role);
    const soldier=["antitronk","supremo","general","tirador"].includes(role);
    const ninja=["ninja","maestro"].includes(role);
    const ca=Math.cos(ang),sa=Math.sin(ang);
    const B={o:W(J.hip),X:new T.Vector3(ca*S,0,sa*S),Y:new T.Vector3(0,S,0),Z:new T.Vector3(-sa*S,0,ca*S)};
    const piece=(shape,p,s,c)=>local(shape,B,p,s,flash?0xffffff:c);
    if(role==="guardian"){
      piece("box",[2,27,0],[17,31,27],0x374e60);
      for(const side of [-1,1])piece("lowSph",[2,40,side*16],[12,8,11],0x7794a4);
      piece("box",[21,22,0],[6,50,36],0x273d4c);
      piece("box",[25,22,0],[2,44,31],0x527b95);
      piece("box",[27,22,0],[2,44,4],0xc6dfdd);
      piece("box",[27,23,0],[2,4,31],0xc6dfdd);
      piece("lowSph",[29,23,0],[3,5,5],0xe1c487);
      for(const h of [4,40])for(const z of [-13,13])piece("sph",[27,h,z],[1.6,1.6,1.6],0xd5e1dc);
    }
    if(role==="sanador"){
      piece("box",[-12,25,0],[9,26,24],0x344f48);
      piece("box",[-18,25,0],[3,18,16],0xd4d9bc);
      piece("box",[-20,25,0],[1,12,3],0x54b78e);piece("box",[-20,25,0],[1,3,11],0x54b78e);
      for(const side of [-1,1]){piece("cyl",[-8,12,side*16],[3.5,13,3.5],0x98c6ab);piece("cyl",[-8,19,side*16],[4,3,4],0x67536f);}
      piece("glowBox",[0,103,0],[12,3,3],0x8be7ac);piece("glowBox",[0,103,0],[3,12,3],0x8be7ac);
    }
    if(role==="tirador"){
      piece("box",[-12,28,0],[9,29,20],0x2d363a);piece("box",[3,44,0],[12,6,25],0x59695b);
      piece("box",[10,58,-7],[8,7,8],0x333f49);piece("glow",[15,58,-7],[2.4,2.4,2.4],0xffb4a0);
      piece("cyl",[-14,37,0],[4,15,4],0x606e63);
    }
    if(skeleton) {
      for(const h of [15,25,35]) for(const side of [-1,1]) piece("box",[2,h,side*7],[5,3,13],0xd7cdb5);
      piece("box",[0,3,0],[8,7,18],0xece4cf);
    } else if(!o.robe) {
      piece("box",[J.neck[0]*.45,25,0],[12,34,20*(o.thick||1)],o.color);
      piece("box",[0,4,0],[13,6,23*(o.thick||1)],0x282635);
      piece("box",[7,4,0],[2,4,5],o.acc||0xc7af79);
    }
    if(["gordo","rey"].includes(role)) piece("lowSph",[4,17,0],[15,23,18],o.color);
    if(soldier||role==="casco"||role==="brasa") {
      const armor=soldier?0x303c34:role==="brasa"?0x4a4245:0xe68a26;
      piece("box",[4,28,0],[14,30,25],armor);
      for(const side of [-1,1]) {
        piece("box",[2,40,side*16],[16,10,12],armor);
        piece("box",[13,17,side*7],[6,10,9],0x555a43);
      }
      if(role==="casco") for(const h of [17,32])piece("glowBox",[12,h,0],[1,3,24],0xffd966);
      if(role==="brasa") for(const side of [-1,1])piece("cyl",[-13,27,side*9],[7,34,7],0xff812f);
    }
    if(ninja) {
      piece("box",[2,8,0],[15,7,24],o.acc||0xb52c45);
      const a=W([J.neck[0]-8,J.neck[1]],-10),b=W([J.hip[0]-13,J.hip[1]+18],10);
      between("cyl",a,b,2*S,flash?0xffffff:0x33313f);
    }
    if(["zombi","corredor","gordo","rey"].includes(role)) {
      piece("box",[9,30,-3],[2,14,10],o.head||0x8db56a);
      for(const h of [24,30,36])piece("box",[10,h,-3],[1,1,9],0x425237);
    }
    if(["supremo","general","reyEsqueleto","rey"].includes(role)){
      piece("box",[-13,24,0],[3,30,27],role==="reyEsqueleto"?0x6c426a:0x703949);
      for(const side of [-1,1]){piece("lowSph",[2,42,side*17],[12,8,10],0xa48a51);piece("box",[8,40,side*17],[3,3,9],0xe4c889);}
    }
    if(o.crown) {
      for(const side of [-1,1])piece("lowSph",[1,41,side*17],[12,10,10],0xc7a04e);
      piece("glow",[11,31,0],[3,4,3],0xd82c59);
    }
    if(role==="savia") for(const side of [-1,1])piece("sph",[7,9,side*13],[5,7,5],0xb8f06a);
    if(role==="nix")piece("glowBox",[10,29,0],[2,10,12],0x64f5ff);
    if(!o.robe) for(const [pt,lat] of [[J.fFoot,rig.LAT.fFoot],[J.bFoot,rig.LAT.bFoot]]) {
      const foot=W(pt,lat);
      at("box",foot[0]+ca*2*S,foot[1]+2*S,foot[2]+sa*2*S,13*S,6*S,10*S,flash?0xffffff:0x252431,-ang);
    }
  }

  function poseFor(o, moving, walkT, atk) {
    const style = rig.styleOf(o);
    if (atk && atk.t > 0) {
      const k = clamp(1 - atk.t / atk.total, 0, 1);
      return rig.pose(style, "attack", k * 5, 6);
    }
    if (moving) return rig.pose(style, "walk", (walkT / 7) % 8, 8);
    return rig.pose(style, "idle");
  }

  /* ---------- bichos que no son stickmen ---------- */
  function creature(e, k, flash) {
    const t = e.t || 0;
    const w = flash ? 0xffffff : null;
    const ca=Math.cos(e.ang ?? Math.PI/2),sa=Math.sin(e.ang ?? Math.PI/2);
    const face=(f,lat,h,size,color)=>at("glow",e.x+(ca*f-sa*lat)*k,h*k,e.y+(sa*f+ca*lat)*k,size*k,size*k,size*k,flash?0xffffff:color);
    switch (e.type) {
      case "slime":
      case "slimito": {
        const s = (e.type === "slime" ? 1 : 0.62) * k;
        const hop = Math.abs(Math.sin(t * 0.12));
        at("sph", e.x, (7 + hop * 6) * s, e.y, 10 * s, (7 + hop * 2) * s, 9 * s, w || (e.type === "slime" ? 0x5fd16b : 0xa6e36b));
        const size=e.type==="slime"?1:.62;
        for(const lat of [-3.5,3.5])face(8*size,lat*size,(10+hop*6)*size,1.5*size,0x14112b);
        face(9*size,0,(7+hop*6)*size,.9*size,0x254735);
        at("ghost",e.x-3*s,(12+hop*6)*s,e.y-2*s,3*s,2*s,3*s,0xcaffc7);
        if(k>=3) {
          at("cyl",e.x,(15+hop*8)*k,e.y,7*k,2*k,7*k,0xffd23f);
          for(let i=0;i<5;i++){const a=i*TAU/5;at("cone",e.x+Math.cos(a)*5*k,(18+hop*8)*k,e.y+Math.sin(a)*5*k,1.8*k,6*k,1.8*k,0xffd23f);}
        }
        break;
      }
      case "fantasma": {
        const fl = Math.sin(t * 0.1) * 3;
        at(e.phased ? "ghost" : "sph", e.x, (24 + fl) * k, e.y, 9 * k, 10 * k, 8 * k, w || 0xeef4ff);
        at("invertedCone", e.x, (12 + fl) * k, e.y, 8 * k, 14 * k, 8 * k, w || 0xeef4ff);
        for(const lat of [-3,3])face(7,lat,26+fl,1.4,0x1a1630);
        face(8,0,22+fl,1.1,0x1a1630);
        for(let i=0;i<5;i++){const a=i*TAU/5;at("ghost",e.x+Math.cos(a)*5*k,(8+fl+Math.sin(t*.12+i)*2)*k,e.y+Math.sin(a)*5*k,3*k,5*k,3*k,0xeef4ff);}
        break;
      }
      case "murcielago": {
        const fl = Math.sin(t * 0.1) * 3;
        const flap = Math.sin(t * 0.6) * 0.8;
        const y0 = (24 + fl) * k;
        at("sph", e.x, y0, e.y, 4.5 * k, 4.5 * k, 4.5 * k, w || 0x4a3360);
        for(const side of [-1,1]) {
          tmpQ.setFromEuler(new T.Euler(0,Math.PI/2-(e.ang||0),side*flap));
          tmpM.compose(tmpV2.set(e.x,y0,e.y),tmpQ,tmpS.set(k,k,k));
          push(side>0?"batWing":"batWingLeft",tmpM,w||0x6b4a8a);
          at("cone",e.x-sa*side*2.8*k,y0+5*k,e.y+ca*side*2.8*k,1.8*k,6*k,1.8*k,w||0x4a3360);
        }
        for(const lat of [-1.8,1.8])face(4,lat,25+fl,.9,0xff3b3b);
        break;
      }
    }
  }

  function prop(e, flash) {
    const w = flash ? 0xffffff : null;
    switch (e.type) {
      case "barril":
        at("cyl", e.x, 9, e.y, 8, 18, 8, w || 0x8a5a2b);
        at("cyl", e.x, 4, e.y, 8.3, 1.4, 8.3, 0x3a3f4a);
        at("cyl", e.x, 14, e.y, 8.3, 1.4, 8.3, w || 0x3a3f4a);
        at("cyl",e.x,18.2,e.y,7.7,1,7.7,w || 0xb68a59);
        for(const dx of [-4,0,4])at("box",e.x+dx,18.8,e.y,0.6,.4,12,w || 0x735033);
        at("cyl",e.x+3,19,e.y+2,1.3,.6,1.3,w || 0x59432e);
        break;
      case "caja":
        at("box",e.x,9,e.y,19,18,19,w || 0xa57b51);
        for(const dx of [-7,0,7])at("box",e.x+dx,9,e.y+10,5,15,1,w || 0xc9a27c);
        for(const h of [3,15])at("box",e.x,h,e.y+11,21,3,2,w || 0x775638);
        between("cyl",[e.x-8,4,e.y+12],[e.x+8,14,e.y+12],1.3,w || 0x8a643f);
        for(const dx of [-8,8])for(const h of [3,15])at("sph",e.x+dx,h,e.y+12,1,1,1,w || 0x39444b);break;
      case "jarron":
        at("sph",e.x,9,e.y,8,9,8,w || 0xc97a4a);at("cyl",e.x,19,e.y,4,6,4,w || 0xb5623c);
        at("cyl",e.x,22,e.y,5,2,5,w || 0xe2b17c);at("cyl",e.x,23.1,e.y,3.6,.3,3.6,0x49372f);
        for(const h of [7,12])at("ring",e.x,h,e.y,7.8,1,7.8,w || 0xf0ca8e);break;
      case "brasero":
        at("cyl", e.x, 7, e.y, 7, 14, 7, w || 0x3a3f4a);
        at("glow", e.x, 17 + Math.sin((e.t || 0) * 0.3) * 1.5, e.y, 5, 7, 5, 0xffb03b);
        break;
    }
  }

  function drawPickup(it,d){
    const phase=d.reducedMotion?0:d.t*.07+it.x;
    const bob=10+Math.sin(phase)*1.6;
    if(it.kind==="moneda"){
      at("cyl",it.x,bob,it.y,7,2,7,0xa7752e);
      at("cyl",it.x,bob+1.2,it.y,6.3,.7,6.3,0xf0cb70);
      at("box",it.x,bob+1.9,it.y,7,.7,1.5,0xffedb2,phase);
      at("box",it.x,bob+2,it.y,1.5,.7,7,0xffedb2,phase);
    }else if(it.kind==="bocadillo"){
      between("cyl",[it.x-10,bob,it.y],[it.x+8,bob+3,it.y],2.7,0xf0ead6);
      between("cyl",[it.x-12,bob-.3,it.y],[it.x-7,bob+.5,it.y],2.8,0xb1875e);
      between("cyl",[it.x+7,bob+2.8,it.y],[it.x+9,bob+3.2,it.y],2.6,0x655c48);
      at("glow",it.x+9,bob+3.3,it.y,1.6,1.6,1.6,0xdd8952);
      if(!d.low)at("ring",it.x,.7,it.y,13,1,9,0x91c9a1);
    }else if(it.kind==="iman"){
      for(const side of [-1,1]){
        at("box",it.x+side*7,bob,it.y,5,15,6,0x8f3948);
        at("box",it.x+side*7,bob+2,it.y+3.2,4,10,.6,0xef6374);
        at("box",it.x+side*7,bob+8,it.y,5,4,6,0xc8dce0);
      }
      at("box",it.x,bob-6,it.y,18,5,6,0xab4453);
      if(!d.low)at("ring",it.x,.8,it.y,16,1,12,0x82d3dd);
    }else if(it.kind==="cofre"){
      at("box",it.x,9,it.y,30,18,22,0x795136);
      at("box",it.x,18,it.y,31,5,23,0xa57949);
      at("box",it.x,22,it.y,25,4,21,0xb88b56);
      for(const x of [-11,11]){
        at("box",it.x+x,13,it.y,3,25,24,0xc6a566);
        at("box",it.x+x,7,it.y+12,4,7,2,0xe8c985);
        for(const h of [5,19])at("sph",it.x+x,h,it.y+13,1,1,1,0xffe1a4);
      }
      at("box",it.x,14,it.y+13,7,9,3,0xf0cb82);at("box",it.x,14,it.y+14.7,2,4,.5,0x463d36);
      at("ring",it.x,.8,it.y,26,1.5,20,0xdcb677);
      if(!d.low)for(let i=0;i<3;i++){
        const a=i*TAU/3+phase*.25,h=d.reducedMotion?24:12+((d.t+i*27)%90)*.45;
        at("glow",it.x+Math.cos(a)*19,h,it.y+Math.sin(a)*14,1.2,1.7,1.2,0xffdf96);
      }
    }
  }

  /* ---------- dibujar un fotograma ----------
     d: { cx, cy, wH (alto visible), shake, dark, actors, gems, pickups,
          shots, eshots, zones, fx, auras, drones, t } */
  function draw(d) {
    if (!renderer) return;
    const pixelRatio=d.low?1:Math.min(2,window.devicePixelRatio || 1);
    if(renderer.getPixelRatio()!==pixelRatio)renderer.setPixelRatio(pixelRatio);
    if(renderer.shadowMap.enabled===!!d.low)renderer.shadowMap.enabled=!d.low;
    for (const p of Object.values(pools)) p.count = 0;
    const H = d.wH;
    const dist = (H * 0.5) / Math.tan(((camera.fov / 2) * Math.PI) / 180) * 1.02;
    const el = (56 * Math.PI) / 180;
    const tx = d.cx + (d.shake ? (Math.random() - 0.5) * d.shake : 0);
    const tz = d.cy + 8 + (d.shake ? (Math.random() - 0.5) * d.shake : 0);
    camera.position.set(tx, Math.sin(el) * dist, tz + Math.cos(el) * dist);
    camera.lookAt(tx, 0, tz);
    sun.position.set(tx - 380, 900, tz + 320);
    sun.target.position.set(tx, 0, tz);
    const dark = d.dark || 0;
    hemi.intensity = 1.1 * (1 - dark * 1.2);
    sun.intensity = 1.8 * (1 - dark * 1.3);
    lamp.intensity = dark ? 2.2 + dark * 2 : 0;
    lamp.position.set(d.cx, 70, d.cy);
    scene.background = new T.Color(dark ? 0x080618 : 0x4a8a3a);
    const radius = Math.max(H * 1.4, 700);
    ground(d.cx, d.cy, radius);
    api.obstaclesNear(d.cx, d.cy, radius * 0.9, (ob) => obstacle(ob, dark > 0));

    for (const a of d.actors) {
      const k = a.scale || 1;
      if(a.elite)at("ring",a.x,1.6,a.y,22*k,3,22*k,a.breach?0x80e3d0:0xf5cb79);
      if(a.relentless)at("ring",a.x,1.4,a.y,24*k,4,24*k,0xff512f);
      if(a.wet)at("glow",a.x+9,57*k,a.y,2,3,2,0x91e9ff);
      if(a.inWater){const r=10+Math.sin(d.t*.15)*3;at("ring",a.x,.8,a.y,r,2,r,0x9fdcff);
        if(api.mapId()==="playa"){const angle=Math.sin(a.y/240+d.t/1800)*.8;between("glowCyl",[a.x-15,1,a.y+12],[a.x-15+Math.cos(angle)*24,1,a.y+12+Math.sin(angle)*24],1,0xbfefff);}
      }
      if (a.prop) { prop(a, a.flash); continue; }
      if (a.creature) { creature(a, k, a.flash); continue; }
      const base=optionsFor(a.kind,a.id);
      const o={...base,role:a.role || base.role,evolution:a.evolution};
      const P = poseFor(o, a.moving, a.walkT || a.t || 0, a.atk);
      stickman(o, a.x, a.y, a.ang, P, k, a.flash, a.outline !== false);
    }
    for(let i=0;i<siteLights.length;i++){
      const s=d.sites?.[i],active=s && s.activeUntil>d.t;
      siteLights[i].intensity=active&&!d.low?1.4:0;
      if(s)siteLights[i].position.set(s.x,40,s.y);
    }
    for(const s of d.sites || []){
      if((s.x-d.cx)**2+(s.y-d.cy)**2>radius*radius)continue;
      const active=s.activeUntil>d.t;
      at("ring",s.x,1,s.y,75,2,75,s.kind==="altar"?0xc9a3ef:0xf0cb82);
      if(active)at("disc",s.x,.8,s.y,145,1,145,0xf0cb82);
      if(s.kind==="lamp"){
        at("cyl",s.x,32,s.y,3,64,3,0x7f969c);at("box",s.x,70,s.y,19,14,16,active?0xffe7a2:0x526674);
      } else if(s.kind==="altar"){
        at("box",s.x,8,s.y,48,16,34,0x655275);at("octa",s.x,33,s.y,12,20,12,s.used?0x80e3d0:0xd7a1f4);
      } else {
        at("cone",s.x,19,s.y,30,38,26,0xd7af71);at("box",s.x,9,s.y+20,12,18,2,0x31494f);
        if(active)at("glow",s.x+30,5,s.y,6,8,6,0xffcc80);
      }
    }
    // gemas, monedas y premios
    for (const g of d.gems) {
      const c = g.v >= 10 ? 0xff5a8a : g.v >= 3 ? 0x5fe36b : 0x6bd8ff;
      const s = g.v >= 10 ? 6 : g.v >= 3 ? 5 : 4;
      at("octa", g.x, 10 + Math.sin((d.t + g.x) * 0.08) * 2, g.y, s * 0.8, s * 1.2, s * 0.8, c, d.t * 0.05 + g.x);
    }
    for(const it of d.pickups)drawPickup(it,d);
    // aura de la colonia y drones
    for (const a of d.auras) at("disc", a.x, 0.8, a.y, a.r, 1, a.r, 0xb7f27b);
    for (const dr of d.drones) { at("box", dr.x, dr.h, dr.y, 9, 3, 6, 0x3d4451); at("glow", dr.x, dr.h, dr.y + 3, 1.5, 1.5, 1.5, 0x00e5ff); }
    // disparos
    for (const s of d.shots) shot(s, d.t);
    for (const s of d.eshots) {
      if(d.contrast){at("glow",s.x,16,s.y,7,7,7,0x10212b);at("ring",s.x,16,s.y,8,2,8,0xfff1ca);}
      const c = { bullet: 0xffb03b, star: 0xffe066, goo: 0x7cff6b }[s.kind] || 0xc77dff;
      at("glow", s.x, d.contrast?22:16, s.y+(d.contrast?4:0), 3.5, 3.5, 3.5, c);
    }
    for (const z of d.zones) zone(z, d.t);
    for (const f of d.fx) effect(f);

    for (const p of Object.values(pools)) {
      p.instanceMatrix.needsUpdate = true;
      if (p.instanceColor) p.instanceColor.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }

  function shot(s, t) {
    const ang = s.ang ?? Math.atan2(s.vy || 0, s.vx || 1);
    const h = 16;
    switch (s.type) {
      case "bolt": at("box", s.x, h, s.y, 14, 1.6, 1.6, 0xe9d8b0, -ang); break;
      case "kunai": at("box", s.x, h, s.y, 10, 1.4, 3, 0x2a2a35, -ang); break;
      case "onda": at("ghost", s.x, h, s.y, s.r * 0.6, 6, s.r, 0xffb03b, -ang); break;
      case "axe": at("box", s.x, h, s.y, 12, 3, 12, 0xcfd8e3, t * 0.4); break;
      case "ball": at("sph", s.x, 6 + Math.abs(Math.sin(t * 0.2 + s.x)) * 10, s.y, 5, 5, 5, 0xffffff); break;
      case "ice": at("octa", s.x, h, s.y, 3.5, 3.5, 6, 0x9fdcff, -ang); break;
      default: at("glow", s.x, h, s.y, 3, 3, 3, 0xffffff);
    }
  }

  // Arco de un barrido como una cinta de cajitas
  function arc(x, y, h, R, a0, a1, color) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / n;
      at("ghostBox", x + Math.cos(a) * R, h, y + Math.sin(a) * R, (Math.abs(a1 - a0) * R) / n + 1, 3, 7, color, -a + Math.PI / 2);
    }
  }

  function zone(z, t) {
    if (z.t < 0) return;
    const k = z.t / (z.life || 1);
    switch (z.type) {
      case "dangerLine":
        between("glowCyl",[z.x,2,z.y],[z.tx,2,z.ty],1.3,0xffab97);at("ring",z.tx,2,z.ty,12,2,12,0xffab97);break;
      case "dangerRing":
        for(let i=0;i<36;i++){const a=i*TAU/36,b=(i+1)*TAU/36;
          const gap=Math.abs(Math.atan2(Math.sin((a+b)/2-z.gap),Math.cos((a+b)/2-z.gap)))<z.width/2;
          between("glowCyl",[z.x+Math.cos(a)*z.r,2,z.y+Math.sin(a)*z.r],[z.x+Math.cos(b)*z.r,2,z.y+Math.sin(b)*z.r],1.8,gap?0x90e9c2:0xffab97);
        }break;
      case "hazard":case "summon":
        at("ring",z.x,2,z.y,z.r || 18,3,z.r || 18,0xff9c85);
        at("disc",z.x,1,z.y,z.r || 18,1,z.r || 18,z.theme==="pools"?0x74ae65:0xb88bdf);break;
      case "disc":
        at("ring",z.x,14,z.y,z.r,20,z.r,z.gold?0xffd23f:0x64f5ff);break;
      case "perfume":
      case "acid":
        at("disc",z.x,.9,z.y,z.r,1,z.r,z.type==="perfume"?0xff8ed1:z.t<z.warn?0xcaff82:0x8ce238);
        at("ring",z.x,1.2,z.y,z.r,3,z.r,z.type==="perfume"?0xffe1f5:0xd2ff8b);
        if(z.t>=z.warn)for(let i=0;i<3;i++){const a=i*TAU/3+z.t*.02;at("ghost",z.x+Math.cos(a)*z.r*.5,4+Math.sin(z.t*.15+i)*2,z.y+Math.sin(a)*z.r*.5,3,3,3,z.type==="perfume"?0xffb8e1:0xb9ef63);}break;
      case "flame":
        for(let i=0;i<6;i++) {
          const t=(i+1)/6,a=z.ang+Math.sin(z.t*.8+i)*z.spread*.5,r=5+t*z.len*z.spread*.45;
          at("ghost",z.x+Math.cos(a)*z.len*t,15+t*6,z.y+Math.sin(a)*z.len*t,r,r*.8,r,0xff7428);
          if(i<3)at("glow",z.x+Math.cos(a)*z.len*t,15,z.y+Math.sin(a)*z.len*t,r*.45,r*.45,r*.45,0xffe5a0);
        }break;
      case "slash": {
        const sweep = 2.7;
        const a0 = z.ang - (sweep / 2) * z.dirSign;
        const a1 = a0 + sweep * Math.min(1, k * 2.2) * z.dirSign;
        arc(z.x, z.y + 16, 18, z.R, Math.min(a0, a1), Math.max(a0, a1), z.gold ? 0xffd23f : 0xffffff);
        break;
      }
      case "wave": at("ring", z.x, 3, z.y, z.r || 1, 30, z.r || 1, 0xd8c8a8); break;
      case "punch": at("ghost", z.x, 18, z.y + 18, z.r, z.r, z.r, z.glove ? 0xff6b6b : 0xffe9a8); break;
      case "thrust":
      case "laser": {
        const L = z.len || 40;
        const c = z.type === "laser" ? 0xff3b6b : 0xffffff;
        at("glowBox", z.x + Math.cos(z.ang) * L / 2, 18, z.y + 16 + Math.sin(z.ang) * L / 2, L, z.type === "laser" ? 2 : 1.5, z.type === "laser" ? 2 : 4, c, -z.ang);
        break;
      }
      case "bolt": {
        // rayo: los puntos «por encima» del último (en la pantalla 2D) son altura
        if (!z.pts) break;
        const base = z.pts[z.pts.length - 1][1];
        const P3 = ([px, py]) => (base - py > 30 ? [px, 16 + (base - py), base + 14] : [px, 18, py + 16]);
        for (let i = 0; i < z.pts.length - 1; i++) {
          const a = P3(z.pts[i]);
          const b = P3(z.pts[i + 1]);
          a[0] += (Math.random() - 0.5) * 6;
          between("glowCyl", a, b, 1.6, 0xbfe6ff);
        }
        break;
      }
      case "bomb": {
        const kk = Math.min(1, z.t / z.dur);
        if (kk >= 1) break;
        const x = z.x0 + (z.tx - z.x0) * kk;
        const y = z.y0 + (z.ty - z.y0) * kk;
        at("sph", x, 10 + Math.sin(kk * Math.PI) * 40, y, 4, 4, 4, 0x2a2a35);
        break;
      }
      case "meteor":
        if (z.t < z.warn) {
          at("ring", z.x, 2, z.y, z.r, 30, z.r, 0xff6b3b);
          const kk = z.t / z.warn;
          at("glow", z.x - 60 * (1 - kk), 10 + 300 * (1 - kk), z.y, 7, 7, 7, 0xffb03b);
        }
        break;
      case "tornado":
        at("invertedCone", z.x, 22, z.y, z.r * 1.2, 40, z.r * 1.2, z.ignited?0xffa66a:0xe8e0c8);
        at("invertedCone", z.x, 30, z.y, z.r * 0.8, 30, z.r * 0.8, z.ignited?0xffdc91:0xffffff);
        break;
    }
  }

  function effect(f) {
    const k = f.t / f.life;
    switch (f.k) {
      case "pickup":
        at("ring",f.x,2+k*10,f.y,9+k*15,1.5,5+k*8,f.color || 0xf0cb82);break;
      case "impact":{
        const r=(f.big?13:8)*(1+k),angle=f.ang || 0;
        for(const offset of [-.7,.7]){const a=angle+offset;between("glowCyl",[f.x-Math.cos(a)*r,18,f.y-Math.sin(a)*r],[f.x+Math.cos(a)*r,18,f.y+Math.sin(a)*r],f.big?1.7:1,f.color || 0xf8e8c8);}break;
      }
      case "ring": at("ring", f.x, 3, f.y, (f.r || 30) * (0.3 + k * 0.8), 30, (f.r || 30) * (0.3 + k * 0.8), f.color || 0xffffff); break;
      case "warn": at("ring", f.x, 2, f.y, f.r, 30, f.r, 0xff3b3b); at("disc", f.x, 1, f.y, f.r * k, 1, f.r * k, 0xff3b3b); break;
      case "boom": { const r = (f.r || 20) * (0.4 + k * 0.7); at("ghost", f.x, 10, f.y, r, r * 0.8, r, f.fire ? 0xff8a1f : 0xffb03b); break; }
      case "puff": { const r = (f.big ? 16 : 8) * (0.5 + k); at("ghost", f.x, 18, f.y + 14, r, r, r, f.color || 0xc9d1dc); break; }
      case "dust": at("ring", f.x, 2, f.y, (f.r || 30) * (0.5 + k * 0.6), 30, (f.r || 30) * (0.5 + k * 0.6), 0xc8b89a); break;
      case "flash": case "spark": case "shards": at("glow", f.x, 16, f.y + 10, 2, 2, 2, f.color || 0xffffff); break;
    }
  }

  // Pantalla (en píxeles del lienzo 2D) de un punto del mundo a cierta altura
  function project(x, y, h, w, hh) {
    tmpV.set(x, h, y).project(camera);
    return [(tmpV.x * 0.5 + 0.5) * w, (-tmpV.y * 0.5 + 0.5) * hh, tmpV.z];
  }

  function setVisible(on) {
    if (glCanvas) glCanvas.style.display = on ? "block" : "none";
  }

  return {
    init,
    draw,
    project,
    angleOf,
    setVisible,
    get ready() { return !!renderer; }
  };
})();
