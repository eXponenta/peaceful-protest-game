import {
    FIELD_OFFSET
} from '../constants.js';

class   Prefab {
    constructor({ game, x, y, speed, spriteKey, spriteName, props, GameObject, moveTo }) {
        this.props = props;
        this.game = game;
        this.GameObject = GameObject;

        this.speed = {
            current: speed.value,
            ...speed
        };

        this.viewSprite = this.game.add.sprite(x, y, spriteKey, 0);
        this.sprite = this.game.add.sprite(x, y);
        this.sprite.mz = this;
        this.viewSprite.mz = this;
        this.sprite.name = spriteName;
        this.sprite.anchor.set(0.5);
        this.sprite.addChild(this.viewSprite);
        // this.sprite.width = this.viewSprite.width;
        // this.sprite.height = this.viewSprite.height;

        this.game.physics.arcade.enable(this.sprite);
        // this.game.physics.arcade.enable(this.viewSprite);
        this.game.physics.arcade.enable(this.viewSprite);
        this.sprite.body.reset(this.sprite.x, this.sprite.y);
        this.viewSprite.anchor.set(0.5);
        this.viewSprite.reset(0, 0)

        console.log(this.viewSprite);

        this.stayingTimer = this.game.time.create(false);
        this.curAnimationState = 'stop';

        this.mode = null;
        this.moveTo = moveTo
    }

    update() {
        // const moveTarget = this.moveTarget[0]
        // if (!moveTarget) return void this.sprite.body.stop();
        // if (moveTarget.update(this)) return
        //
        // if (this.mode === 'leave')
        // {
        //     console.log('leave', moveTarget, this);
        // }
        //
        // this.moveTarget.shift()
        // this.update()
    }

    setMode(mode) {
        this.mode = mode;
    }

    setSpeed(value) {
        if (this.speed.current === value) {
            return;
        }
        this.speed.current = value;
    }

    setVelocity(target) {
        const rotationToTarget = this.game.math.angleBetweenPoints(this.sprite.body.center, target);
        this.game.physics.arcade.velocityFromRotation(rotationToTarget, this.speed.current, this.sprite.body.velocity);
        this.viewSprite.rotation = rotationToTarget-(Math.PI/2);
        // console.log('rotation to target', rotationToTarget);
    }


    // moveTo(target, { callback, shouldStop, reset = true } = {}) {
    //   if (reset) {
    //     const targets = this.moveTarget;
    //     this.moveTarget = [];
    //     targets.forEach(target => target.forceStop(this))
    //   }
    //
    //   if (target) {
    //     const newTarget = new MoveTarget({ target, callback, shouldStop })
    //     this.moveTarget.push(newTarget)
    //     newTarget.update(this)
    //   }
    //   else
    //   {
    //       this.sprite.body.stop();
    //   }
    // }

    getNextCoords(bounds) {
        let coords = this.generateCoords(bounds);
        while (this.GameObject.checkContainWagon(coords))
            coords = this.generateCoords(bounds);
        return coords;
    }

    generateCoords(bounds){
        const directions = [];
        if (!bounds) {
            bounds = {
                top: this.sprite.y - this.sprite.top + FIELD_OFFSET.top,
                right: this.game.world.width - (this.sprite.right - this.sprite.x),
                bottom: this.game.world.height - (this.sprite.bottom - this.sprite.y),
                left: this.sprite.x - this.sprite.left
            };
        }

        if (this.sprite.x > bounds.left) {
            directions.push('left');
        }
        if (this.sprite.x < bounds.right) {
            directions.push('right');
        }
        if (this.sprite.y > bounds.top) {
            directions.push('top');
        }
        if (this.sprite.y < bounds.bottom) {
            directions.push('bottom');
        }

        const direction = this.game.rnd.between(0, directions.length - 1);
        let x = this.sprite.x;
        let y = this.sprite.y;
        switch (directions[direction]) {
            case 'left':
                x = this.game.rnd.between(bounds.left, this.sprite.x - 1);
                break;
            case 'right':
                x = this.game.rnd.between(this.sprite.x + 1, bounds.right);
                break;
            case 'top':
                y = this.game.rnd.between(bounds.top, this.sprite.y - 1);
                break;
            case 'bottom':
                y = this.game.rnd.between(this.sprite.y + 1, bounds.bottom);
                break;
        }
        return { x: Math.round(x), y: Math.round(y) };
    }

    updateProgressBar(percent, color = 0x00ff00) {
        const y = -30;
        const width = 25;
        const height = 5;
        this.progressBar.clear();
        percent = this.game.math.clamp(percent, 0, 1);
        if (percent !== 0) {
            this.progressBar.lineStyle(1, color, 1);
            this.progressBar.drawRect(-width / 2, y - height / 2, width, height);
            this.progressBar.lineStyle(height, color, 1);
            this.progressBar.moveTo(-width / 2, y);
            this.progressBar.lineTo(Math.round(width * (-0.5 + percent)), y);
        }
    }

    stop() {
        // this.sprite.animations.stop(null, true);
        this.sprite.body.stop();
    }

    stopWandering() {
        this.moveTo(null);
        this.stayingTimer.stop(true);
    }

    revive() {
        this.sprite.body.enable = true;
        this.sprite.revive(1);
    }

    kill() {
        this.mode = null;
        this.moveTo(null);

        this.sprite.kill();
    }

    updateAnimation(){
        const velocity = this.sprite.body.velocity;
        const withPoster = !!this.showPoster;
        let newState = 'stop'
        if (velocity.x != 0 || velocity.y != 0)
        {
            if (this.canRun)
            {
                if (Math.sqrt(velocity.x*velocity.x + velocity.y*velocity.y) < this.speed.value * (this.speed.running-0.1))
                {
                    newState = 'walk';
                }
                else
                {
                    newState = 'run';
                }
            }
            else
            {
                newState = 'walk';
            }
        }
        newState = newState + (withPoster?'Poster':'');
        if (newState != this.curAnimationState)
        {
            this.curAnimationState = newState;
            console.log('new state', newState);
            if (newState.substr(0, 4) === 'stop')
            {
                this.viewSprite.animations.stop(null, true);
                this.viewSprite.frame = withPoster ? 3 : 0;
            }
            else
                this.viewSprite.animations.play(newState);
        }
    }

    changeViewSprite(spriteKey, canWalk = 0){
        this.sprite.removeChild(this.viewSprite);
        this.viewSprite.kill();
        this.viewSprite.destroy();

        this.viewSprite = this.game.add.sprite(0, 0, spriteKey, 0);
        this.viewSprite.mz = this;
        this.sprite.addChild(this.viewSprite);

        this.game.physics.arcade.enable(this.viewSprite);
        this.viewSprite.anchor.set(0.5);
        this.viewSprite.reset(0, 0)

        this.curAnimationState = 'stop';

        if (canWalk && canWalk > 0)
        {
            this.viewSprite.animations.add('walk', [1, 2], canWalk, true);
        }
    }
}

export default Prefab;
