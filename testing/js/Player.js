class Player {
    constructor(game, initialPos, keyboardMapping, name) {
        this.action;
        this.cameras;
        this.activeCamera;
        this.initialPos = initialPos;
        this.bullets = [];
        this.name = name;
        this.container;
        this.controls;
        this.renderer;
        this.game = game;
        this.cameraFade = 1;
        this.scene;
        this.renderer;
        this.hp = 100;
        this.keyboardMapping = keyboardMapping;
        this.move = {
          forward: 0,
          turn: 0
        }
    }

    // Add player model to scene and prepare animations
    initModel(model, anims) {
        var initialPos = this.initialPos;

        this.model = model; // fbx
        this.mixer = model.mixer = new THREE.AnimationMixer(model);
        this.walk = anims.walk;
        this.idle = anims.idle;
        this.run = anims.run;
        this.jump = anims.jump;
        this.defeated = anims.defeated;
        this.root = this.mixer.getRoot();

        this.mixer.addEventListener('finished', (e) => {
            this.setAction('idle');
        });

        this.model.position.set(initialPos.x, initialPos.y, initialPos.z);
        this.game.scene.add(model);

        this.createCameras();

        // blinking
        setInterval(() => {
          this.blink();
        }, 7000);
        
    }

    // Launch the animation
    setAction(name) {

      if ((this.action == 'defeated' && this.hp <= 0) ||  this.action == name || !this.mixer) {
        return;
      }

      const anim = this[name];
      const action = this.mixer.clipAction(anim, this.root);
      this.mixer.stopAllAction();
      this.action = name;
  
      switch(name) {
        case 'walk':
          action.timeScale = (this.move != undefined && this.move.forward < 0) ? -0.3 : 1;
          break;
        case 'idle':
          action.timeScale = 0.5;
          break;
        case 'defeated':
          action.timeScale = 0.5;
          action.clampWhenFinished = true;
          document.getElementById('game-over-message').style.display = 'block';
          break;
      }
  
      action.time = 0;
      action.fadeIn(0.5);
      if (name == 'jump' || name == 'defeated') {
        action.loop = THREE.LoopOnce;
      }
      action.play();
      this.actionTime = Date.now();
    }

    createCameras() {
        const front = new THREE.Object3D(),
          back = new THREE.Object3D();
        
        front.position.set(300, 100, 1000);
        front.parent = this.model;
            
        back.position.set(0, 500, -800);
        back.parent = this.model;
    
        this.cameras = { front, back };
        // Active camera can be changed here for debugging purposes
        this.activeCamera = this.cameras.back;
        this.cameras.active = back; 
        this.cameraFade = 1;
    
      }

    // Players position in the scene
    initPosition() {
        // cast down
        const dir = new THREE.Vector3(0, -1, 0);
        const pos = this.model.position.clone();
        pos.y += 200;
        const raycaster = new THREE.Raycaster(pos, dir);
        const box = this.game.environmentProxy;
    
        const intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
          this.model.position.y = pos.y - intersect[0].distance;
        }
    }

    // Create renderer, dynamic HTML elements etc...
    renderView() {
      var playerContainer,
        playersNumber = this.game.playersConfig.length,
        hpBarBorder,
        hpBarPoints,
        cheatsheet,
        html = 'Keyboard controls:</br></br>',
        renderer = this.renderer = new THREE.WebGLRenderer({antialias: true});

        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth / playersNumber, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
        renderer.shadowMapDebug = true;

        playerContainer = document.createElement('div');
        
        this.game.container.appendChild(playerContainer);
        playerContainer.style.float = 'left';
        playerContainer.style.position = 'relative';
        
        hpBarBorder = document.createElement('div');
        hpBarPoints = this.hpBar = document.createElement('div');
        hpBarBorder.setAttribute('class', 'hp-bar-border');
        hpBarPoints.setAttribute('class', 'hp-bar-points');
        hpBarBorder.appendChild(hpBarPoints);
        
        playerContainer.appendChild(hpBarBorder);
        playerContainer.appendChild(renderer.domElement);

        // Conrols cheatsheet
        cheatsheet = document.createElement('div');
        cheatsheet.setAttribute('class', 'cheatsheet');
        
        playerContainer.appendChild(cheatsheet);
        for(var key in this.keyboardMapping) {
          var action =  this.keyboardMapping[key];
          html += '<div class="cheetsheet-row"><span class="key" ' + (key === 'Space' ? 'id="space-key"' : "" ) + '>' + game.keySymbolsMapping[key] + '</span> : ' + action + '</div>';
        }
        cheatsheet.innerHTML = html;

        
    }

    // Find out which action should be performed
    initAction() {
        var forward = this.move.forward;

        if(this.hp <= 0) {
          this.setAction('defeated');
          return;
        }
    
        if (forward > 0) {
          if (
            this.action != 'jump' && 
            this.action != 'walk' &&
            this.action != 'run'
          ) {
            this.setAction('walk');
          }  
        } else if (forward < -0.2) {
          if (this.action != 'walk') {
            this.setAction('walk');
          } 
        } else if (this.action == 'walk' || this.action == 'run') { 
          this.setAction('idle');
        }
      }

    // Launch razor leaf attack
    razorLeaf() {
      const player = this,
        game = this.game,
        speed = 20;

      if((player.lastFired || 0) + 500 > Date.now()) {
        return;
      }

      for(var i = 0; i < 10; i++) {
        var bullet = game.models.razorLeaf.clone(),
          scene = game.scene, 
          position = player.model.position,
          rY;

        bullet.position.set(position.x, position.y + 20, position.z);
        rY = player.model.rotationY;

        bullet.velocity = new THREE.Vector3(
          Math.sin(rY) * speed + (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 7 ,
          Math.cos(rY) * speed + (Math.random() - 0.5) * 5
        );

        bullet.alive = true; 
        
        // Remove bullet from the scene
        setTimeout(function(bullet_) {
          scene.remove(bullet_);
        }, 1500, bullet);

        player.bullets.push(bullet); 

        scene.add(bullet); 
      }
      player.lastFired = Date.now();
    }

    blink() {
      let offset = this.model.children[2].material[2].map.offset;
      offset.y = 0.5;
      setTimeout(() => {
        offset.y = 0;
      }, 200);
    }
    
    // Move the player if the player performed keyboard action
    moveModel(dt) { 
      const gravity = 30,
        threshold = 30; // the lower  the number, the better ability to climb
      var pos = this.model.position.clone(),
        dir = new THREE.Vector3(),
        raycaster,
        blocked,
        proxy,
        intersect,
        model = this.model,
        move = this.move;

      this.initAction();

      pos.y += 30;
      model.getWorldDirection(dir);
      
      if (move.forward < 0) {
        dir.negate();
      }
      
      raycaster = new THREE.Raycaster(pos, dir);

      // for debugging purposes
      // const geometry = new THREE.SphereGeometry( 0.5, 6, 6 );
      // const material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
      // const sphere = new THREE.Mesh( geometry, material );
      // this.game.scene.add( sphere );
      // sphere.position.x = pos.x;
      // sphere.position.y = pos.y;
      // sphere.position.z = pos.z;


      blocked = false;
      proxy = this.game.environmentProxy;

      proxy.children.forEach((box) => {
        if (box != undefined) {
          intersect = raycaster.intersectObject(box);
          if (intersect.length > 0) {
              if (intersect[0].distance < threshold) {
                blocked = true;
              }
          }
        }
      });

      if (!blocked) {
        if (move.forward > 0) {
          var speed;
          switch (this.action) {
          case 'run':
              speed = 200;
              break;
          case 'jump':
              speed = 250;
              break;
          default:
              speed = 100;
          }
          model.translateZ(dt * speed);
        } else {
          model.translateZ(-dt * 30);
        }
      }

      if (proxy != undefined) {
        let intersect;

        proxy.children.filter((child) => {
          return !(
            is(child, 'water') ||
            is(child, 'grass')||
            is(child, 'mushroom')
          )
        }).forEach((box) => {

          // cast left
          dir.set(-1, 0, 0);
          dir.applyMatrix4(model.matrix);
          dir.normalize();
          raycaster = new THREE.Raycaster(pos, dir);

          intersect = raycaster.intersectObject(box);
          if (intersect.length > 0) {
              if (intersect[0].distance < threshold) {
                model.translateX(threshold - intersect[0].distance);
              }
          }

          // cast right
          dir.set(1, 0, 0);
          dir.applyMatrix4(model.matrix);
          dir.normalize();
          raycaster = new THREE.Raycaster(pos, dir);

          intersect = raycaster.intersectObject(box);
          if (intersect.length > 0) {
              if (intersect[0].distance < threshold) {
                model.translateX(intersect[0].distance - threshold);
              }
          }

          // cast down
          dir.set(0, -1, 0);
          pos.y += 200;
          raycaster = new THREE.Raycaster(pos, dir);

          intersect = raycaster.intersectObject(box);
          
          // prevent climbing on trees
          if (!is(box, 'tree') && intersect.length > 0) {
            const targetY = pos.y - intersect[0].distance + 5;
            if (targetY > model.position.y) {
              // Going up
              model.position.y = 0.8 * model.position.y + 0.2 * targetY;
              this.velocityY = 0;
            } else if (targetY < model.position.y) {
              // Falling
              if (this.velocityY == undefined) {
                this.velocityY = 0;
              }
              this.velocityY += dt * gravity;
              model.position.y -= this.velocityY;
              if (model.position.y < targetY) {
                this.velocityY = 0;
                model.position.y = targetY;
              }
            }
          }

        });
    }
  }
}