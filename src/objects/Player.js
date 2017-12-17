import Protester from './Protester.js';
import SlotManager from './SlotManager';

import {
    PROTESTER_MODE_ARRESTED,
    PLAYER_MODE_FIGHT
} from '../constants.js';

const TAP_RUNNING_DELTA = 200;

class Player extends Protester {
    constructor({
        fovGroup,
        radius,
        cheering,
        stamina,
        staminaCooldown,
        powerUp,
        powerDown,
        slots,
        ...protesterOptions,
    }) {
        super({
            spriteKey: 'player_sprite',
            spriteName: 'player',
            ...protesterOptions,
        });

        this.sprite.inputEnabled = true;
        this.sprite.input.priorityID = 1;

        this.sprite.body.collideWorldBounds = true;
        this.sprite.body.mass = 30;
        this.direction = 0;

        this.power = 1;
        this.powerUpValue = powerUp;
        this.powerDownValue = powerDown;
        this.powerTimer = this.game.time.create(false);
        this.powerTimer.loop(2000, this.powerDown, this);
        this.powerTimer.start();

        this.cheering = cheering;

        this.stamina = stamina;
        this.maxStamina = stamina;
        this.cooldownTimer = this.game.time.create(false);
        this.staminaCooldown = staminaCooldown * 1000;

        this.tapStartTimestamp = Date.now();
        this.tapDelta = Infinity;

        this.progressBar = this.game.add.graphics();
        this.sprite.addChild(this.progressBar);

        this.audioScream = this.game.add.audio('scream03');

        this.showPoster = false;
        this.isFrozen = false;
        this.isGoing = false;


        this.slots = new SlotManager(this.sprite, this, slots || [
            { x: -30, y: 0 } ,
            { x: -30, y: 30},
            { x: -30, y: -30},
            { x: -30, y: -60},
        ]);

        this.radius = {
            initial: radius,
            graphic: 0,
            actual: 0,
            actualSq: 0,
            tween: {}
        };
        this.resetRadius();

        this.circleGraphics = this.game.add.graphics(0, 0);
        fovGroup.add(this.circleGraphics);

        // events
        this.game.onResume.add(this.handleGameResume, this);

        this.keys = {
            up: this.game.input.keyboard.addKey(Phaser.Keyboard.UP),
            down: this.game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
            left: this.game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
            right: this.game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
            space: this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR),
            shift: this.game.input.keyboard.addKey(Phaser.Keyboard.SHIFT)
        };

        this.sprite.smoothed = true;
        // this.sprite.body.setCircle(20);
        this.viewSprite.animations.add('walk', [1, 2], 4, true);

        Player.instance = this
    }

    update() {
        this.resetRadius();
        this.slots.update()

        super.update()

        this.circleGraphics.clear();

        if (this.mode === PROTESTER_MODE_ARRESTED || this.isFrozen) {
            this.updateProgressBar(0);
            return;
        }

        if (this.mode === PLAYER_MODE_FIGHT)
        {
            if (this.keys.space.justDown)
            {

            }
            this.updateFightBar();
            return;
        }



        this.circleGraphics.lineStyle(1, 0x33ff33, 1);
        this.circleGraphics.drawCircle(this.sprite.x, this.sprite.y, this.radius.graphic * 2);

        let newSpeed = this.speed.value;

        const areMovingKeysDown = this.keys.up.isDown ||
            this.keys.down.isDown ||
            this.keys.left.isDown ||
            this.keys.right.isDown;

        if (!this.cooldownTimer.running) {
            if (
                areMovingKeysDown && this.keys.shift.isDown ||
                this.tapDelta < TAP_RUNNING_DELTA
            ) {
                if (this.stamina > 0) {
                    this.stamina -= 1;
                    newSpeed *= this.speed.running;
                } else {
                    this.cooldownTimer.add(this.staminaCooldown, () => {
                        this.cooldownTimer.stop(true);
                    });
                    this.cooldownTimer.start();
                }
            } else if (this.stamina < this.maxStamina) {
                this.stamina += 1;
            }
        } else {
            this.stamina = this.maxStamina * this.cooldownTimer.ms / this.staminaCooldown;
        }

        if (this.stamina < this.maxStamina) {
            this.updateProgressBar(this.stamina / this.maxStamina, this.cooldownTimer.running ? 0xff0000 : 0x00ff00);
        } else {
            this.updateProgressBar(0);
        }

        if (this.showPoster) {
            newSpeed *= this.speed.withPoster;
        }

        this.setSpeed(newSpeed);
        this.viewSprite.angle = this.direction - 90;

        if (areMovingKeysDown) {
            this.moveTo(null);
            const angles = [];

            if (this.keys.up.isDown) {
                angles.push(-90);
            }
            if (this.keys.down.isDown) {
                angles.push(90);
            }
            if (this.keys.left.isDown) {
                if (this.keys.up.isDown) {
                    angles.push(-180);
                } else {
                    angles.push(180);
                }
            }
            if (this.keys.right.isDown) {
                angles.push(0);
            }
            const angle = angles.reduce((value, sum) => sum + value, 0) / angles.length;
            this.direction = angle;
            this.game.physics.arcade.velocityFromAngle(
                angle,
                this.speed.current,
                this.sprite.body.velocity
            );
            console.log('direction', this.direction);
            // this.sprite.frame = 2;
            this.resetClickSpeed(true);
            if (!this.isGoing)
            {
                this.isGoing = true;
                this.viewSprite.animations.play('walk');
            }
        } else if (
            this.keys.up.justUp ||
            this.keys.down.justUp ||
            this.keys.left.justUp ||
            this.keys.right.justUp
        ) {
            this.isGoing = false;
            this.stop();
        }

        if (this.keys.space.justDown && this.mode !== PLAYER_MODE_FIGHT) {
            this.togglePoster();
        }

    }

    handleGameResume() {
        this.moveTo(null);
    }

    setMode(mode, props = {}) {
        switch (mode) {
            case PROTESTER_MODE_ARRESTED: {
                this.togglePoster(false);

                this.sprite.body.collideWorldBounds = false;

                this.cooldownTimer.stop(true);
                break;
            }
            case PLAYER_MODE_FIGHT: {
                this.showPoster = false;
                this.fightBar = 50;
                break;
            }
        }

        super.setMode(mode, props);
    }

    togglePoster(on = !this.showPoster) {
        if (on === this.showPoster) {
            return;
        }

        // play sound
        if (on) {
            this.audioScream.play('', 0, 0.1);
        }

        this.showPoster = on;
    }

    powerUp(value = this.powerUpValue) {
        if (value !== 0) {
            this.powerChange(value);
        }
    }

    powerDown(value = this.powerDownValue) {
        const power = Math.max(1, this.power - value);
        if (power !== this.power) {
            this.powerChange(-value);
        }
    }

    powerChange(value) {
        this.power += value;

        this.posterSprite.scale.set(this.power);
    }

    resetClickSpeed(discard) {
        if (discard) {
            this.tapDelta = Infinity;
        } else {
            const now = Date.now();
            this.tapDelta = now - this.tapStartTimestamp;
            this.tapStartTimestamp = now;
        }
    }

    resetRadius() {
        let newRadius = this.showPoster ? this.radius.initial : 0;
        newRadius *= this.power;

        if (newRadius === this.radius.actual) {
            return;
        }

        if (this.radius.tween.isRunning) {
            this.radius.tween.stop();
        }

        if (this.game.math.fuzzyEqual(newRadius, this.radius.graphic, 1)) {
            this.radius.graphic = newRadius;
        } else {
            this.radius.tween = this.game.add.tween(this.radius);
            this.radius.tween.to({ graphic: newRadius }, 500, Phaser.Easing.Exponential.Out);
            this.radius.tween.start();
        }

        this.radius.actual = newRadius;
        this.radius.actualSq = this.radius.actual ** 2;
    }

    freeze() {
        if (this.sprite.alive) {
            this.moveTo(null);
        }

        this.isFrozen = true;
    }

    kill() {
        this.game.onResume.removeAll();
        this.powerTimer.stop(true);

        super.kill();
    }

    screenAttack(){

    }

    updateFightBar(){
        const y = -30;
        const width = 25;
        const height = 5;
        this.progressBar.clear();
        if (percent !== 0) {
            this.progressBar.lineStyle(1, 0xffff000, 1);
            this.progressBar.drawRect(-width / 2, y - height / 2, width, height);
            this.progressBar.lineStyle(height, color, 1);
            this.progressBar.moveTo(-width / 2, y);
            this.progressBar.lineTo(Math.round(width * (-0.5 + percent)), y);
        }
    }
}

export default Player;
