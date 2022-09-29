Component({
  scene: null,
  properties: {
  },
  data: {
    loaded: false,
    arReady: false,
  },
  lifetimes: {
    async attached() {
      console.log('data', this.data);
    }
  },
  methods: {
    handleReady({detail}) {
      const xrScene = this.scene = detail.value;
      this.inRealWorld = true;
      this.texts = {};
    },
    handleAssetsProgress: function ({detail}) {
      console.log('assets progress', detail.value);
    },
    handleARReady() {
      this.setData({arReady: true});
    },
    handleAssetsLoaded: function ({detail}) {
      console.log('assets loaded', detail.value);
      this.records = JSON.parse(this.scene.assets.getAsset('raw', 'records'));
      this.note = this.scene.assets.getAsset('raw', 'note');
      this.setData({loaded: true});
    },
    handleTick() {
      this.syncTexts();

      if (!this.placed || !this.inRealWorld) {
        return;
      }

      const xrSystem = wx.getXrFrameSystem();
      const mainCamEl = this.scene.getElementById('main-camera');
      const mainTrs = mainCamEl.getComponent(xrSystem.Transform);
      const door = this.scene.getElementById('door').getComponent(xrSystem.Transform);

      const diff = mainTrs.worldPosition.sub(door.worldPosition);
      const preDiff = this.diff || diff;
      this.diff = diff;

      const dis = Math.abs(diff.z);
      const preDis = Math.abs(preDiff.z);

      //@todo: 等待物理加上碰撞检测，替换
      if (preDis <= 0.2 || dis > 0.2) {
        return;
      }

      const sceneMesh = this.scene.getElementById('scene-mesh').getComponent(xrSystem.GLTF);

      // 虚拟世界
      // mainCam: scene -> stencil
      // magicCam: ar
      door.setData({visible: false});
      sceneMesh._meshes.forEach(mesh => mesh.material.setRenderState('stencilComp', 0));
      this.scene.getElementById('hikari').getComponent(xrSystem.GLTF)._meshes.forEach(mesh => mesh.material.setRenderState('stencilComp', 0));
      this.scene.getElementById('roam').getComponent(xrSystem.GLTF)._meshes.forEach(mesh => mesh.material.setRenderState('stencilComp', 0));
      this.scene.getElementById('xinyi').getComponent(xrSystem.GLTF)._meshes.forEach(mesh => mesh.material.setRenderState('stencilComp', 0));
      this.inRealWorld = false;
    },
    handleShowDoor() {
      this.scene.ar.placeHere('setitem', true);
      this.scene.getNodeById('anchor').setData({visible: false});
      this.placed = true;
    },
    handleTouchNote() {
      this.triggerEvent('showNote', this.note);
    },
    handleTouchObj({detail}) {
      const {el, value} = detail;
      const {camera, target} = value;
      const xrSystem = wx.getXrFrameSystem();
      const camTrs = camera.el.getComponent(xrSystem.Transform);
      const targetTrs = target.getComponent(xrSystem.Transform);
      const diff = camTrs.worldPosition.sub(targetTrs.worldPosition);
      const distance = Math.sqrt(diff.x * diff.x + diff.z * diff.z);
      if (distance > 2) {
        return;
      }

      const id = target.id;
      let text = this.texts[id];
      if (text) {
        clearTimeout(text.timerId);
      }

      if (!this.records[id]) {
        return;
      }

      const {y, texts: records} = this.records[id];
      this.texts[id] = {
        content: records[Math.floor(Math.random() * (records.length - 0.1))],
        camera, target, y,
        timerId: setTimeout(() => {
          delete this.texts[id];
        }, 4000)
      };
    },
    syncTexts: function() {
      const texts = Object.keys(this.texts).map(id => {
        const {camera, target, content, y} = this.texts[id];
        const xrSystem = wx.getXrFrameSystem();
        const trs = target.getComponent(xrSystem.Transform);
        const tmp = trs.worldPosition.clone();
        tmp.y += y;
        const clipPos = camera.convertWorldPositionToClip(tmp);
        const {frameWidth, frameHeight} = this.scene;
  
        return {
          content,
          x: ((clipPos.x + 1) / 2) * frameWidth,
          y: (1 - (clipPos.y + 1) / 2) * frameHeight
        };
      });

      this.triggerEvent('changeTexts', texts);
    }
  }
})
