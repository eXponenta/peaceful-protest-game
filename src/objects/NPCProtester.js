import Protester from './Protester.js';
import Player from './Player.js'
import ProgressBar from './ProgressBar';
import {
    PROTESTER_MODE_WANDER,
    PROTESTER_MODE_ARRESTED,
    PROTESTER_MODE_LEAVE,
    PROTESTER_MODE_FOLLOW,
    PROTESTER_MODE_NOD,
} from '../constants.js';
import ManuallyBehavior from "./Tweets/ManuallyBehavior";

class NPCProtester extends Protester {
    constructor({
        group,
        mood,
        moodDown,
        moodUp,
        dropPoster,
        onLeft,
        ...prefabOptions
    }) {
        const spriteKey =
        super(prefabOptions);

        this.group = group;
        this.group.add(this.sprite);

        this.progressBar = new ProgressBar({
            radius: 5,
            width: 44,
            color: 0x6eed83,
            lineWidth: 0,
            game: this.game
        });
        this.sprite.addChild(this.progressBar.graphics);

        this.leavingTimer = this.game.time.create(false);

        this.mood = 1||mood;
        this.initialMood = mood;
        this.moodUpValue = moodUp;
        this.moodDownValue = moodDown;
        this.shownPoster = false;

        this.dropPoster = dropPoster;

        this.isBeingCheeredUp = false;

        this.onLeft = onLeft;

        this.isFollower = true;
        this.following = null;
        this.isNOD = !this.isFollower && Math.random() < 0.05;
        this.isAgitator = false;
        this.nodDone = false;
        this.slot = null;
        this.sprite.body.setSize(37, 37);


/*
        const fpsAnimation = 3;
        this.viewSprite.animations.add('walk', [1, 2], fpsAnimation, true);
        this.viewSprite.animations.add('walkPoster', [4, 5], fpsAnimation, true);


        if (this.isNOD)
        {
            this.changeViewSprite('humans/nod', 3);
        }
*/
        // initially dead
        this.kill();
    }

    update() {
        if (
            this.mood === 0 &&
            !this.leavingTimer.running &&
            this.mode === PROTESTER_MODE_WANDER
        ) {
            this.leavingTimer.add(this.game.rnd.between(1000, 5000), this.leave, this);
            this.leavingTimer.start();
        } else if (this.mood > 0 && this.leavingTimer.running) {
            this.leavingTimer.stop(true);
        }
        if (this.mood > 0 && this.mode  === PROTESTER_MODE_LEAVE && !this.nodDone) {
            this.setMode(PROTESTER_MODE_WANDER);
        }

        if (this.mode === PROTESTER_MODE_NOD && this.nodDone)
        {
            this.setMode(PROTESTER_MODE_LEAVE);
        }

        if (this.isBeingCheeredUp) {
            if (this.isNOD)
            {
                if (!this.nodDone && this.mode != PROTESTER_MODE_NOD)
                    this.setMode(PROTESTER_MODE_NOD);
                if (!this.GameObject.mz.advices.nodOnScreen.shown)
                {
                    this.GameObject.mz.advices.nodOnScreen.show();
                }
            }
            else
            {
                if (!this.GameObject.mz.advices.agitateOnScreen.shown)
                {
                    this.GameObject.mz.advices.agitateOnScreen.show();
                }
                if (this.mood >= 1)
                    this.progressBar.update(0);
                else
                    this.progressBar.update(this.mood);
                this.moodUp(this.moodUpValue);
            }
        } else if (this.mood < 1) {
            this.moodDown(this.moodDownValue);
            this.progressBar.update(0);
        }

        this.showPoster = this.mode !== PROTESTER_MODE_ARRESTED && this.mood >= 1 && !this.isNOD;
        // if (this.isFollower)
        //     alert('ia am follower');
        if (this.showPoster && this.isFollower)
        {
            if ( !this.following)
            {
                const slot = Player.instance.slots.take(this);
                if (slot) {
                    this.setMode(PROTESTER_MODE_FOLLOW, {slot})
                }
            }
        }

        if (this.following && this.following.target === Player.instance.sprite)
        {
            this.showPoster = Player.instance.showPoster;
        }

        if (this.showPoster && !this.shownPoster)
        {
            this.shownPoster = true;
            this.GameObject.increaseScore(5, this.sprite);
            if (this.GameObject.mz.advices.agitate)
            {
                this.GameObject.mz.advices.agitate.hide();
                this.GameObject.mz.advices.agitate = null;
                this.GameObject.mz.advices.press = this.GameObject.mz.tweet.tweet(
                    'Подойдите к журналисту и поднимите плакат в поле его видимости. Когда журналист закончит трансляцию - придут новые митингующие.',
                    'help',
                    {behavior: ManuallyBehavior}
                );
            }
        }

        //this.sprite.tint = 0xffffff;
        // if (this.mood >= 0.75) {
        //     const tintSaturation = (this.mood - 0.75) / (1 - 0.75) * 0.25;
        //     this.sprite.tint = Phaser.Color.RGBArrayToHex([
        //         1 - tintSaturation,
        //         1,
        //         1 - tintSaturation
        //     ]);
        // } else if (this.mood <= 0.25) {
        //     const tintSaturation = (1 - this.mood / 0.25) * 0.25;
        //     this.sprite.tint = Phaser.Color.RGBArrayToHex([
        //         1,
        //         1 - tintSaturation,
        //         1 - tintSaturation
        //     ]);
        // }

        super.update();
        this.updateAnimation();
    }

    handleLeft() {
        this.onLeft();
        this.kill();
    }

    setMode(mode, props = {}) {
        switch (mode) {
            case PROTESTER_MODE_WANDER: {
                this.setSpeed(this.speed.value);
                // this.GameObject.mz.groups.d.add(this.sprite);

                // clean up previous state
                if (this.mode === PROTESTER_MODE_LEAVE) {
                    this.moveTo(null);
                }

                const { coords, phasing = false } = props;
                if (coords) {
                    this.moveTo(coords, { callback: () => this.wander(), phasing });
                } else {
                    this.wander();
                }
                break;
            }
            case PROTESTER_MODE_FOLLOW: {

                if (this.mode === PROTESTER_MODE_WANDER) {
                    this.stopWandering();
                }
                const { slot } = props;
                this.dismissSlotsTaken();
                this.following = slot
                if (slot.target === Player.instance.sprite)
                {
                    this.setSpeed(this.speed.value * 1.5);
                    // this.GameObject.mz.groups.npcProtesters.add(this.sprite);
                    // alert('change group');
                    // console.log('sprite', this.sprite);
                }
                this.moveTo(slot, { follow: true });
                break;
            }
            case PROTESTER_MODE_ARRESTED: {
                this.setSpeed(this.speed.value);
                // clean up previous state
                this.dismissSlotsTaken()
                if (this.mode === PROTESTER_MODE_WANDER) {
                    this.stopWandering();
                }
                break;
            }
            case PROTESTER_MODE_NOD: {
                if (!this.GameObject.mz.showedAdvice.nod)
                {
                    this.GameObject.mz.showedAdvice.nod = true;
                    this.GameObject.mz.advices.nod = this.GameObject.mz.tweet.tweet(
                        'Смотрите, чтобы вам не плеснули зеленкой в лицо',
                        'help',
                        {visible: 5000, fadeIn: 500, fadeOut: 500}
                    );
                }
                this.setSpeed(this.speed.value);
                if (this.mode === PROTESTER_MODE_WANDER) {
                    this.stopWandering();
                }
             //   console.log(this.GameObject);
                this.target = this.GameObject.mz.objects.player.sprite;
                this.moveTo(
                    this.GameObject.mz.objects.player.sprite,
                    {
                        callback: () => {
                            this.nodDone = true;
                            this.GameObject.screenAttack();
                            this.target = null;
                            this.moveTo(null);
                        },
                        phasing: true
                    }
                );
                break;
            }
            case PROTESTER_MODE_LEAVE: {
                this.setSpeed(this.speed.value);
                // clean up previous state
                if (this.mode === PROTESTER_MODE_WANDER) {
                    this.stopWandering();
                }

                const x = this.sprite.x < this.game.world.width / 2 ? -100 : this.game.world.width + 100
                const y = this.sprite.y

                this.moveTo({ x, y }, { callback: () => this.handleLeft(), phasing: true});
                break;
            }
        }

        super.setMode(mode, props);
    }

    wander() {
        const nextAction = this.game.rnd.between(0, 10);
        if (nextAction === 0) {
            this.moveTo(this.getNextCoords(), { callback: () => this.wander() });
        } else {
            this.stayingTimer.stop(true);
            this.stayingTimer.add(this.game.rnd.between(3000, 6000), this.wander, this);
            this.stayingTimer.start();
        }
    }

    leave() {
        this.setMode(PROTESTER_MODE_LEAVE);
        this.leavingTimer.stop(true);
    }

    toggleCheering(on = !this.isBeingCheeredUp) {
        if (on === this.isBeingCheeredUp) {
            return;
        }

        this.isBeingCheeredUp = on;
    }

    moodUp(value) {
        this.mood = Math.min(this.mood + value, 1);
    }

    moodDown(value) {
        this.mood = Math.max(this.mood - value, 0);
    }


    revive({ x, y, nextCoords, mood = this.initialMood, isFirst }) {
        this.sprite.x = x;
        this.sprite.y = y;
        this.sprite.body.reset(x, y);

        if (isFirst)
        {
            this.isNOD = false;
            this.isFollower = true;
        }

        this.posterSprite.revive();

        this.mood = mood;

        super.revive();
        this.setMode(PROTESTER_MODE_WANDER, { coords: nextCoords, phasing: true });
    }

    reset(){
        this.dismissSlotsTaken();
        this.isFollower = Math.random() < 0.05;
        this.isNOD = !this.isFollower && Math.random() < 0.03;
        this.isAgitator = !this.isFollower && !this.isNOD && Math.random() < 0.01;

        if (this.isNOD)
        {
            this.changeViewSprite('ALL_IMAGES','nod', 3);
        }
        else
        {
            this.changeViewSprite('ALL_IMAGES','npc_0'+(Math.floor(Math.random()*8)+1), 3);
        }

        this.nodDone = false;
        this.slot = null;
        this.shownPoster = false;
    }

    changeViewSprite(atlasKey, key, canWalk) {    
        super.changeViewSprite(atlasKey,  key, canWalk);

        //this.changeAnimations(key, canWalk);
    }

    kill() {
        this.group.add(this.sprite);
        this.stopWandering();
        this.reset();
        super.kill();
    }

    dismissSlotsTaken() {
      if (!this.following) return
      this.following.dismiss()
      this.following = null
    }

    onSlotDismissing() {
      this.following = null
      this.setMode(PROTESTER_MODE_WANDER)
    }
}

export default NPCProtester;
