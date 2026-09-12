import * as THREE from "three";

export type VRMenu = {
  key: string;
  title: string;
  detail: string;
  rows: { title: string; detail: string; action: () => void }[];
  actions: { title: string; action: () => void }[];
};
type Host = {
  root: () => THREE.Group;
  menu: () => VRMenu;
  pick: (ray: THREE.Raycaster, activate: boolean) => string;
  start: () => void;
  end: () => void;
  status: (message: string) => void;
};

/** Stationary, metre-scale atlas. Manipulate the model, never the user's head. */
export class AtlasVR {
  readonly ui = new THREE.Group();
  readonly button = document.createElement("button");
  private canvas = document.createElement("canvas");
  private texture: THREE.CanvasTexture;
  private panel: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private controllers: THREE.Group[] = [];
  private source = new Map<THREE.Group, XRInputSource>();
  private dragging = new Map<THREE.Group, THREE.Vector3>();
  private hitboxes: {
    x: number;
    y: number;
    w: number;
    h: number;
    action: () => void;
  }[] = [];
  private ray = new THREE.Raycaster();
  private temp = new THREE.Vector3();
  private rotation = new THREE.Matrix4();
  private lastRoot: THREE.Group | null = null;
  private page = 0;
  private menuKey = "";
  private paintKey = "";
  private hover = "";
  private lastPaint = 0;
  private session: XRSession | null = null;
  private saved = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    view: null as THREE.PerspectiveCamera["view"],
    fov: 48,
    zoom: 1,
  };
  frames = 0;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private host: Host,
  ) {
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    renderer.xr.setFramebufferScaleFactor(0.85);
    renderer.xr.setFoveation(1);
    this.canvas.width = 768;
    this.canvas.height = 1024;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 1.4),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    this.panel.position.set(0.78, 1.45, -2.05);
    this.panel.lookAt(0, 1.45, 0);
    this.ui.add(this.panel);
    this.ui.visible = false;
    scene.add(this.ui);
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      const beam = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(0, 0, -1),
        ]),
        new THREE.LineBasicMaterial({
          color: "#85e1db",
          transparent: true,
          opacity: 0.65,
        }),
      );
      beam.scale.z = 5;
      controller.add(beam);
      controller.addEventListener("connected", (e) => {
        this.source.set(controller, e.data);
      });
      controller.addEventListener("disconnected", () => {
        this.source.delete(controller);
        this.dragging.delete(controller);
      });
      controller.addEventListener("selectstart", () =>
        this.point(controller, true),
      );
      controller.addEventListener("squeezestart", () => {
        this.dragging.set(
          controller,
          controller.getWorldPosition(new THREE.Vector3()),
        );
      });
      controller.addEventListener("squeezeend", () =>
        this.dragging.delete(controller),
      );
      scene.add(controller);
      this.controllers.push(controller);
    }
    renderer.xr.addEventListener("sessionstart", () => {
      this.saved = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        view: camera.view ? { ...camera.view } : null,
        fov: camera.fov,
        zoom: camera.zoom,
      };
      camera.clearViewOffset();
      camera.position.set(0, 0, 0);
      camera.quaternion.identity();
      this.lastRoot = null;
      this.ui.visible = true;
      document.body.classList.add("in-vr");
      host.start();
      this.button.textContent = "Exit VR";
    });
    renderer.xr.addEventListener("sessionend", () => {
      this.resetDesktopRoot();
      this.session = null;
      this.ui.visible = false;
      this.dragging.clear();
      camera.position.copy(this.saved.position);
      camera.quaternion.copy(this.saved.quaternion);
      camera.view = this.saved.view;
      camera.fov = this.saved.fov;
      camera.zoom = this.saved.zoom;
      camera.updateProjectionMatrix();
      document.body.classList.remove("in-vr");
      host.end();
      this.button.textContent = "Enter VR";
    });
    this.button.id = "enter-vr";
    this.button.textContent = "Checking VR…";
    this.button.disabled = true;
    document.body.append(this.button);
    this.button.onclick = () => void this.toggle();
    void this.checkSupport();
  }
  get active() {
    return this.renderer.xr.isPresenting;
  }
  private async checkSupport() {
    try {
      const supported =
        !!navigator.xr &&
        (await navigator.xr.isSessionSupported("immersive-vr"));
      this.button.disabled = !supported;
      this.button.textContent = supported
        ? "Enter VR"
        : "VR requires a headset";
      this.button.title =
        "Open this HTTPS page in your headset browser. Controllers required.";
    } catch {
      this.button.textContent = "VR unavailable";
    }
  }
  private async toggle() {
    if (this.session) {
      await this.session.end();
      return;
    }
    try {
      this.session = await navigator.xr!.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
      });
      await this.renderer.xr.setSession(this.session);
    } catch (e) {
      await this.session?.end().catch(() => {});
      this.session = null;
      this.host.status("Could not enter VR: " + String(e));
    }
  }
  private resetDesktopRoot() {
    const root = this.host.root();
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.setScalar(1);
  }
  reset() {
    const root = this.host.root(),
      body = this.host.menu().key.startsWith("body:");
    root.position.set(
      body ? -0.7 : -0.25,
      body ? 1.3 : 1.25,
      body ? -2.8 : -2.65,
    );
    root.rotation.set(body ? 0 : 0.35, 0, 0);
    root.scale.setScalar(
      body
        ? root.userData.focusRadius
          ? 0.7 / root.userData.focusRadius
          : 0.23
        : root.userData.space
          ? 1.25 / (root.userData.viewRadius || 16)
          : Math.min(0.07, 1.25 / (root.userData.viewRadius || 16)),
    );
  }
  private point(controller: THREE.Group, activate: boolean) {
    if (!this.active) return;
    controller.updateWorldMatrix(true, false);
    this.rotation.extractRotation(controller.matrixWorld);
    this.ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.ray.ray.direction
      .set(0, 0, -1)
      .applyMatrix4(this.rotation)
      .normalize();
    const uiHit = this.ray.intersectObject(this.panel)[0];
    if (uiHit?.uv) {
      const x = uiHit.uv.x * 768,
        y = (1 - uiHit.uv.y) * 1024;
      const box = this.hitboxes.find(
        (b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h,
      );
      if (activate && box) box.action();
      return;
    }
    this.ray.params.Points = { threshold: this.host.root().scale.x * 0.2 };
    this.hover = this.host.pick(this.ray, activate);
  }
  update(dt: number) {
    if (!this.active) return;
    this.frames++;
    const root = this.host.root();
    if (root !== this.lastRoot) {
      this.lastRoot = root;
      this.reset();
      this.dragging.clear();
    }
    for (const controller of this.controllers) {
      const source = this.source.get(controller),
        axes = source?.gamepad?.axes;
      if (axes && axes.length >= 4) {
        const x = Math.abs(axes[2]) > 0.18 ? axes[2] : 0,
          y = Math.abs(axes[3]) > 0.18 ? axes[3] : 0;
        if (source!.handedness === "left") {
          const base = root.userData.space
            ? 1.25 / (root.userData.viewRadius || 16)
            : 0.07;
          root.scale.setScalar(
            THREE.MathUtils.clamp(
              root.scale.x * Math.exp(-y * dt),
              base * 0.35,
              base * 8.5,
            ),
          );
          root.position.x += x * dt * 0.5;
        } else {
          root.rotation.y += x * dt;
          root.rotation.x += y * dt;
        }
      }
      const old = this.dragging.get(controller);
      if (old) {
        controller.getWorldPosition(this.temp);
        root.position.add(this.temp.clone().sub(old));
        old.copy(this.temp);
      }
      this.point(controller, false);
    }
    if (performance.now() - this.lastPaint > 100) {
      this.paint();
      this.lastPaint = performance.now();
    }
  }
  private paint() {
    const menu = this.host.menu();
    if (menu.key !== this.menuKey) {
      this.menuKey = menu.key;
      this.page = 0;
    }
    const pages = Math.max(1, Math.ceil(menu.rows.length / 6));
    this.page = Math.min(this.page, pages - 1);
    const key = JSON.stringify([
      menu.key,
      menu.title,
      menu.detail,
      menu.rows.map((r) => [r.title, r.detail]),
      menu.actions.map((a) => a.title),
      this.page,
      this.hover,
    ]);
    if (key === this.paintKey) return;
    this.paintKey = key;
    const ctx = this.canvas.getContext("2d")!;
    ctx.fillStyle = "#09141f";
    ctx.fillRect(0, 0, 768, 1024);
    ctx.strokeStyle = "#446f7e";
    ctx.strokeRect(2, 2, 764, 1020);
    const text = (
      s: string,
      x: number,
      y: number,
      size = 26,
      color = "#cce6ef",
    ) => {
      ctx.font = `${size}px system-ui`;
      ctx.fillStyle = color;
      ctx.fillText(s, x, y, 708);
    };
    text("UNIVERSE ATLAS · VR", 30, 48, 24, "#8bdfd9");
    text(menu.title, 30, 98, 36);
    text(menu.detail, 30, 138, 22);
    text(
      this.hover || "Point + trigger selects. Explore opens the selection.",
      30,
      177,
      21,
      "#8bdfd9",
    );
    this.hitboxes = [];
    const button = (
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      action: () => void,
      detail = "",
    ) => {
      ctx.fillStyle = "#172e40";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#365d6c";
      ctx.strokeRect(x, y, w, h);
      ctx.font = "27px system-ui";
      ctx.fillStyle = "#e2f6f8";
      ctx.fillText(title, x + 16, y + 35, w - 28);
      if (detail) {
        ctx.font = "20px system-ui";
        ctx.fillStyle = "#9bb7c8";
        ctx.fillText(detail, x + 16, y + 63, w - 28);
      }
      this.hitboxes.push({ x, y, w, h, action });
    };
    menu.rows
      .slice(this.page * 6, this.page * 6 + 6)
      .forEach((r, i) =>
        button(26, 200 + i * 86, 716, 76, r.title, r.action, r.detail),
      );
    button(26, 725, 190, 54, "‹ Previous", () => {
      this.page = Math.max(0, this.page - 1);
    });
    text(`${this.page + 1} / ${pages}`, 315, 761, 25);
    button(552, 725, 190, 54, "Next ›", () => {
      this.page = Math.min(pages - 1, this.page + 1);
    });
    menu.actions
      .slice(0, 4)
      .forEach((a, i) =>
        button(
          26 + (i % 2) * 366,
          795 + Math.floor(i / 2) * 60,
          350,
          52,
          a.title,
          a.action,
        ),
      );
    text("Left stick: zoom / pan · Right stick: rotate", 30, 951, 22);
    text("Grip: move model · Use Back to return", 30, 987, 22);
    this.texture.needsUpdate = true;
  }
  diagnostics() {
    return {
      active: this.active,
      frames: this.frames,
      controllers: this.source.size,
      menuKey: this.menuKey,
      page: this.page,
      modelScale: this.host.root().scale.x,
      modelRotation: this.host.root().rotation.toArray(),
      modelPosition: this.host.root().position.toArray(),
      buttons: this.hitboxes.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
      panelMatrix: this.panel.matrixWorld.toArray(),
    };
  }
}
