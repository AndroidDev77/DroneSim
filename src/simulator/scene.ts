import * as THREE from "three";

export function buildHouseScene(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x0b1220);
  scene.fog = new THREE.Fog(0x0b1220, 12, 48);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x334455, 1.1);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.25);
  dir.position.set(8, 12, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  scene.add(dir);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x7c5c4a, roughness: 0.8, metalness: 0.05 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.95 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
  const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.75 });
  const gateMat = new THREE.MeshStandardMaterial({ color: 0xe84f4f, roughness: 0.55, metalness: 0.1, emissive: 0x2a0000 });

  const colliders: THREE.Box3[] = [];
  const gates: { center: THREE.Vector3; radius: number; passed: boolean }[] = [];

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 14), floorMat);
  floor.position.set(0, -0.1, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  function addBox(w: number, h: number, d: number, x: number, y: number, z: number, material = wallMat, collidable = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    if (collidable) colliders.push(new THREE.Box3().setFromObject(m));
    return m;
  }

  addBox(18, 3, 0.3, 0, 1.5, -7);
  addBox(18, 3, 0.3, 0, 1.5, 7);
  addBox(0.3, 3, 14, -9, 1.5, 0);
  addBox(0.3, 3, 14, 9, 1.5, 0);

  addBox(6, 3, 0.25, -2.5, 1.5, -1.5);
  addBox(0.25, 3, 4.6, 0.3, 1.5, 0.9);
  addBox(4.8, 3, 0.25, 3.2, 1.5, 2.4);
  addBox(0.25, 3, 4.8, -4.7, 1.5, 2.2);

  addBox(0.6, 0.9, 2.2, -5.6, 0.45, -4.8, trimMat);
  addBox(2.4, 0.75, 1.2, -6.2, 0.38, -2.2, obstacleMat);
  addBox(1.6, 0.45, 0.9, 6.3, 0.23, -3.6, obstacleMat);
  addBox(2.1, 0.8, 1.2, 4.8, 0.4, 4.8, obstacleMat);
  addBox(1.0, 1.6, 0.35, 0.9, 0.8, -4.6, trimMat);
  addBox(0.9, 0.6, 0.9, -2.2, 0.3, 4.7, obstacleMat);
  addBox(1.1, 1.1, 1.1, 2.2, 0.55, 5.5, obstacleMat);
  addBox(0.2, 2.2, 6, -1.2, 1.1, 5.5, trimMat);

  const rug = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.02, 2.4), new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 1 }));
  rug.position.set(4.9, 0.02, -0.8);
  scene.add(rug);

  function addGate(x: number, y: number, z: number, rotY = 0, w = 1.2, h = 0.9) {
    const group = new THREE.Group();
    const tubeGeoA = new THREE.BoxGeometry(w, 0.08, 0.08);
    const tubeGeoB = new THREE.BoxGeometry(0.08, h, 0.08);
    const top = new THREE.Mesh(tubeGeoA, gateMat);
    const bottom = new THREE.Mesh(tubeGeoA, gateMat);
    const left = new THREE.Mesh(tubeGeoB, gateMat);
    const right = new THREE.Mesh(tubeGeoB, gateMat);
    top.position.set(0, h / 2, 0);
    bottom.position.set(0, -h / 2, 0);
    left.position.set(-w / 2, 0, 0);
    right.position.set(w / 2, 0, 0);
    group.add(top, bottom, left, right);
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    scene.add(group);
    gates.push({ center: new THREE.Vector3(x, y, z), radius: Math.max(w, h) * 0.8, passed: false });
    return group;
  }

  addGate(-7.2, 1.1, -5.4, Math.PI / 2);
  addGate(-3.2, 1.0, -0.2, 0);
  addGate(1.9, 1.0, -3.9, Math.PI / 2);
  addGate(5.8, 1.05, 0.8, 0);
  addGate(4.8, 1.0, 5.6, Math.PI / 2);
  addGate(-1.8, 1.0, 5.2, 0);
  addGate(-6.2, 1.0, 3.8, Math.PI / 2);

  const path = [
    [-7.2, 1.1, -5.4],
    [-5.6, 1.0, -3.8],
    [-3.2, 1.0, -0.2],
    [0.8, 1.0, -2.4],
    [1.9, 1.0, -3.9],
    [4.8, 1.0, -1.6],
    [5.8, 1.05, 0.8],
    [5.4, 1.0, 3.6],
    [4.8, 1.0, 5.6],
    [1.3, 1.0, 5.6],
    [-1.8, 1.0, 5.2],
    [-4.3, 1.0, 4.8],
    [-6.2, 1.0, 3.8],
    [-7.1, 1.0, 1.0],
    [-7.4, 1.0, -2.8],
    [-7.2, 1.1, -5.4],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));

  const curve = new THREE.CatmullRomCurve3(path, true, "catmullrom", 0.15);
  const points = curve.getPoints(220);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xffffff }));
  scene.add(line);

  return { colliders, gates, curve };
}

export function createDroneMesh() {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7, metalness: 0.2 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1, emissive: 0x0b2622 });
  const propMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0.2 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), frameMat);
  g.add(body);

  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.05), accentMat);
  cam.position.set(0, 0.01, -0.12);
  g.add(cam);

  const armGeo = new THREE.BoxGeometry(0.32, 0.018, 0.025);
  const arm1 = new THREE.Mesh(armGeo, frameMat);
  const arm2 = new THREE.Mesh(armGeo, frameMat);
  arm2.rotation.y = Math.PI / 2;
  g.add(arm1, arm2);

  const props: THREE.Mesh[] = [];
  [[0.16, 0, 0.16], [-0.16, 0, 0.16], [0.16, 0, -0.16], [-0.16, 0, -0.16]].forEach(([x, y, z]) => {
    const duct = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 12, 26), accentMat);
    duct.rotation.x = Math.PI / 2;
    duct.position.set(x, y, z);
    g.add(duct);

    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.006, 20), propMat);
    prop.position.set(x, 0.01, z);
    g.add(prop);
    props.push(prop);
  });

  return { group: g, props };
}
